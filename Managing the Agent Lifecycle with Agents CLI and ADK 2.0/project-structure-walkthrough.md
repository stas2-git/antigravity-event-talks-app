# Project Structure Walkthrough: customer-support-agent

## The file tree

```
customer-support-agent/
│
├── agents-cli-manifest.yaml   ← CLI registry: project metadata & scaffold config
├── pyproject.toml             ← Python project: dependencies, linting, build
├── GEMINI.md                  ← Coding-agent guide (dev workflow, commands)
├── README.md                  ← Human-readable quickstart
├── .agents-cli-spec.md        ← Agent design spec (purpose, graph, success criteria)
├── .gitignore
├── Dockerfile                 ← Container image (ready for future deployment)
│
├── app/                       ← ★ The agent package — this is where the logic lives
│   ├── __init__.py            ← Exports `app` (the App instance) for the CLI runner
│   ├── agent.py               ← ★ The entire graph workflow definition
│   ├── fast_api_app.py        ← HTTP server wrapper (FastAPI + ADK)
│   └── app_utils/
│       ├── telemetry.py       ← OpenTelemetry → Cloud Trace / Cloud Logging setup
│       └── typing.py          ← Shared Pydantic types (e.g. Feedback)
│
└── tests/
    ├── unit/                  ← Pure Python unit tests (no LLM calls)
    ├── integration/           ← End-to-end tests (with LLM)
    └── eval/                  ← agents-cli eval datasets & grade results
```

---

## File-by-file roles

### agents-cli-manifest.yaml

This is the CLI's source of truth for the project. Every `agents-cli` command reads it to
know where code lives, what version scaffolded it, and what the deployment configuration is.
You should never edit it manually.

| Field             | Value      | Meaning                                           |
|-------------------|------------|---------------------------------------------------|
| agent_directory   | app        | Where the Python agent package lives              |
| deployment_target | none       | Prototype mode — no Cloud Run / Agent Runtime     |
| session_type      | in_memory  | Sessions are not persisted between restarts       |
| cicd_runner       | skip       | No CI/CD pipeline scaffolded                      |
| base_template     | adk        | Standard ADK agent template                       |

### pyproject.toml

Managed by uv. Key runtime dependencies:

- google-adk[gcp] >=2.0.0 — the ADK framework, including Workflow, LlmAgent, GCP integrations
- opentelemetry-instrumentation-google-genai — auto-traces every Gemini API call
- google-cloud-logging — structured log shipping to Cloud Logging

Dev-only: pytest, pytest-asyncio. Optional extras: eval (for grading), lint (ruff + ty).

### GEMINI.md

A coding-agent guidance file that any AI assistant (Gemini CLI, Claude, Codex) reads as
project context. It contains the development phases, command reference, and operational rules
(e.g. "never change the model unless asked"). It's the project's persistent memory for
AI-assisted development.

### app/fast_api_app.py

This wraps the agent in a FastAPI HTTP server using ADK's built-in get_fast_api_app(). It
configures CORS, GCS artifact storage, OpenTelemetry, and adds a /feedback POST endpoint.
`agents-cli playground` and `agents-cli run` both boot this server under the hood. You don't
need to touch it unless adding new HTTP routes.

### app/__init__.py

A single line: `from .agent import app`. This makes the App object discoverable by the CLI
when it scans the app/ package. The name `app` must match the `name="app"` argument in
`App(name="app")` — they identify the entry point.

---

## Deep dive: app/agent.py

This is the heart of the project. It defines a four-component ADK 2.0 Workflow — a directed
graph where nodes do work and edges control the flow.

### 1. Environment bootstrap (lines 44–47)

```python
_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
```

Reads GCP credentials from ADC (Application Default Credentials) and sets three env vars the
ADK SDK requires to route API calls to Vertex AI. "global" is the correct location for
gemini-flash-latest — region-specific values (like us-east1) return a 404 for this model alias.

---

### 2. Shared model (_MODEL)

```python
_MODEL = Gemini(model="gemini-flash-latest", retry_options=...)
```

A single Gemini model instance reused by both LLM nodes. Centralizing it means you change the
model name in one place. The retry_options add 3 automatic retries on transient API errors.

Note: This project has no traditional "tools" (functions the LLM calls via function-calling).
Instead it uses an LLM-in-graph pattern — an LlmAgent acts as a structured classifier, and
the routing logic itself handles the branching. The FAQ knowledge is baked directly into the
agent's instruction system prompt.

---

### 3. Schema: ClassificationOutput (Pydantic BaseModel)

```python
class ClassificationOutput(BaseModel):
    category: str   # "shipping" | "unrelated"
    reason: str     # why it was classified that way
```

This is the typed contract between the classifier and everything downstream. By setting
output_schema=ClassificationOutput on the classifier LlmAgent, ADK forces the model to emit
valid JSON matching this shape. Without a schema, the output is a raw types.Content object —
harder to route on.

---

### 4. Node 1 — classify_query (LlmAgent)

```python
classify_query = LlmAgent(
    name="classify_query",
    model=_MODEL,
    instruction="...",          # strict classifier prompt
    output_schema=ClassificationOutput,
    output_key="classification",
)
```

- Role: Receives the raw user message from START and decides which category it falls into.
- output_schema: Forces structured JSON output and auto-converts the LLM's response into a
  ClassificationOutput Pydantic instance for downstream nodes.
- output_key="classification": Additionally writes the result into state["classification"] so
  it's accessible anywhere in the workflow via ctx.state.
- No tools: The classifier LLM is intentionally constrained — its only job is to emit JSON.
  The instruction says "Respond ONLY with the JSON output."

---

### 5. Node 2 — route_query (FunctionNode)

```python
def route_query(node_input: ClassificationOutput) -> Event:
    category = node_input.category.strip().lower()
    route = "shipping" if category == "shipping" else "unrelated"
    return Event(output=node_input, route=route)
```

- Role: A thin bridge between the classifier LLM and the conditional edges.
- Why it exists: An LlmAgent can't emit Event(route=...) directly. This function reads the
  structured ClassificationOutput and translates it into a routing signal the graph engine
  understands.
- Event(output=..., route=...): The route field is what the graph engine reads when deciding
  which edge to follow. The output field passes the classification data along to the next node.
- ADK auto-wrapping: Because it's a plain Python function placed in an edge, ADK automatically
  wraps it in a FunctionNode. No explicit import of FunctionNode needed.

---

### 6. Node 3 — shipping_faq_agent (LlmAgent)

```python
shipping_faq_agent = LlmAgent(
    name="shipping_faq_agent",
    model=_MODEL,
    instruction="...",  # full QuickShip FAQ knowledge base
)
```

- Role: The "yes" branch. Answers any shipping question using a detailed system prompt
  containing QuickShip's rates, tracking instructions, return policy, and claims process.
- No output_schema: The response is free-form natural language — appropriate here since it's
  the terminal output the user reads.
- Knowledge is in the prompt: There's no database or external API call. The FAQ content
  (pricing tiers, tracking URL, delivery windows, etc.) lives entirely in the instruction
  string. This is a deliberate design choice for a prototype — easy to iterate on, and can be
  swapped for RAG later.

---

### 7. Node 4 — decline_node (FunctionNode)

```python
def decline_node(node_input: ClassificationOutput) -> Event:
    message = "I'm sorry, but I'm only able to assist with shipping-related questions..."
    return Event(
        output=message,
        content=types.Content(role="model", parts=[types.Part.from_text(text=message)]),
    )
```

- Role: The "no" branch. Returns a deterministic, polite refusal for off-topic queries.
- content=: This is important — Event.output is internal graph data; Event.content is what
  actually renders in the ADK web playground UI. LLM agents emit content automatically, but
  function nodes must do it explicitly if they produce user-visible text.
- Deterministic: Unlike an LLM, this node always returns the exact same message. No model
  call, no latency, no hallucination risk on the refusal path.

---

### 8. The Workflow — edges that wire it all together

```python
root_agent = Workflow(
    name="customer_support_workflow",
    edges=[
        ("START", classify_query),                         # entry
        (classify_query, route_query),                     # classifier → router
        (route_query, shipping_faq_agent, "shipping"),     # conditional: yes
        (route_query, decline_node, "unrelated"),          # conditional: no
    ],
)
```

Edges are read as (source, target) or (source, target, "route_label"). The graph engine:

1. Delivers the user's message to classify_query via START
2. Feeds classify_query's structured output into route_query
3. Checks the route value on the emitted Event — if "shipping", activates shipping_faq_agent;
   if "unrelated", activates decline_node

Visualized:

```
START ──► classify_query ──► route_query ──["shipping"]──► shipping_faq_agent
                                        └──["unrelated"]─► decline_node
```

---

### 9. The App

```python
app = App(root_agent=root_agent, name="app")
```

App is the ADK container that wires the Workflow to a session service and runner. The
name="app" must match the Python package name (app/) — the CLI uses this convention to
discover the entry point. This is the object exported by __init__.py and loaded by
fast_api_app.py.
