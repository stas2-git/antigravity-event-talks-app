# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Customer Support Agent for a shipping company.

Graph topology (ADK 2.0 Workflow):

    START
      │
      ▼
  classify_query          ← FunctionNode: LlmAgent classifies the query
      │
      ├─ "shipping" ──► shipping_faq_agent   ← LlmAgent: answers shipping Qs
      │
      └─ "unrelated" ──► decline_node        ← FunctionNode: politely declines
"""

import os

from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.apps import App
from google.adk.events.event import Event
from google.adk.models import Gemini
from google.adk.workflow import Edge, FunctionNode, Workflow
from google.genai import types
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# Auth: API key loaded from .env (GOOGLE_API_KEY + GOOGLE_GENAI_USE_VERTEXAI=False)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Shared Gemini model (preserves the scaffolded model choice)
# ---------------------------------------------------------------------------
_MODEL = Gemini(
    model="gemini-2.5-flash-lite",
    retry_options=types.HttpRetryOptions(attempts=3),
)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ClassificationOutput(BaseModel):
    """Output schema for the query classifier LLM agent."""

    category: str  # "shipping" or "unrelated"
    reason: str  # brief explanation of the classification decision


# ---------------------------------------------------------------------------
# Node 1: Classifier LlmAgent
#   • Receives the raw user message (types.Content from START)
#   • Outputs a structured ClassificationOutput so downstream nodes get typed data
# ---------------------------------------------------------------------------
classify_query = LlmAgent(
    name="classify_query",
    model=_MODEL,
    instruction=(
        "You are a query classifier for a shipping company's customer support system.\n\n"
        "Your ONLY job is to decide whether the user's message is related to shipping or not.\n\n"
        "Shipping-related topics include:\n"
        "  - Shipping rates and pricing\n"
        "  - Package tracking and delivery status\n"
        "  - Delivery timelines and estimates\n"
        "  - Returns, refunds for shipping\n"
        "  - Lost, damaged, or delayed packages\n"
        "  - Shipping labels and documentation\n\n"
        "Classify the user's message as:\n"
        '  - "shipping"   — if it relates to any of the above topics\n'
        '  - "unrelated"  — if it is about anything else\n\n'
        "Respond ONLY with the JSON output matching the required schema. "
        "Do not add any extra text or explanation outside the JSON."
    ),
    output_schema=ClassificationOutput,
    output_key="classification",  # also stored in state["classification"]
)

# ---------------------------------------------------------------------------
# Node 2: Shipping FAQ LlmAgent
#   • Receives the ClassificationOutput from the classifier
#   • Answers the user's shipping-related question with accurate FAQ knowledge
# ---------------------------------------------------------------------------
shipping_faq_agent = LlmAgent(
    name="shipping_faq_agent",
    model=_MODEL,
    instruction=(
        "You are a knowledgeable and friendly customer support representative for QuickShip, "
        "a shipping company. You have deep expertise in all shipping-related topics.\n\n"
        "Answer the user's shipping question using the following knowledge base:\n\n"
        "**Shipping Rates:**\n"
        "  - Standard (5-7 business days): $4.99 for packages under 1 lb, $8.99 for 1-5 lbs, "
        "$14.99 for 5-20 lbs\n"
        "  - Express (2-3 business days): $12.99 under 1 lb, $19.99 for 1-5 lbs, $29.99 for 5-20 lbs\n"
        "  - Overnight (next business day): $24.99 under 1 lb, $34.99 for 1-5 lbs, $49.99 for 5-20 lbs\n"
        "  - International rates vary by destination — customers should visit our website for a quote\n\n"
        "**Tracking:**\n"
        "  - Tracking numbers are emailed within 1 hour of label creation\n"
        "  - Track at quickship.com/track or via the QuickShip mobile app\n"
        "  - Real-time updates are available once the package is scanned at a facility\n\n"
        "**Delivery:**\n"
        "  - Delivery windows: Mon–Sat for Standard and Express; Mon–Fri for Overnight\n"
        "  - Deliveries typically occur between 8 AM and 8 PM local time\n"
        "  - A signature is required for packages over $200 in value\n\n"
        "**Returns:**\n"
        "  - Free return labels are available for orders placed within 30 days\n"
        "  - Refunds for shipping charges are processed within 5-7 business days\n"
        "  - Damaged packages: file a claim at quickship.com/claims within 48 hours of delivery\n\n"
        "**Lost or Delayed Packages:**\n"
        "  - If a package hasn't moved in 3+ business days, open a support ticket\n"
        "  - Claims for lost packages can be filed after 10 business days for domestic, "
        "20 business days for international\n\n"
        "Be concise, warm, and professional. If the specific information isn't in your knowledge base, "
        "direct the customer to quickship.com or our support line at 1-800-QUICKSHIP."
    ),
)

# ---------------------------------------------------------------------------
# Node 3: Router — reads the classifier's output and sets the route
#   Wrapped as an explicit FunctionNode so it is a BaseNode instance,
#   which is required by Edge(from_node=...) in google-adk 2.x.
# ---------------------------------------------------------------------------


def _route_fn(node_input: ClassificationOutput) -> Event:
    """Read the classifier's category and emit the corresponding route signal."""
    category = node_input.category.strip().lower()
    route = "shipping" if category == "shipping" else "unrelated"
    return Event(output=node_input, route=route)


route_query = FunctionNode(func=_route_fn)


# ---------------------------------------------------------------------------
# Node 4: Decline — politely refuses off-topic queries
#   Also wrapped as an explicit FunctionNode for consistency with Edge API.
# ---------------------------------------------------------------------------


def _decline_fn(node_input: ClassificationOutput) -> Event:
    """Emit a polite decline message for off-topic queries."""
    message = (
        "I'm sorry, but I'm only able to assist with shipping-related questions — "
        "such as rates, tracking, delivery, or returns. "
        "For anything else, I'd recommend reaching out to the appropriate support channel. "
        "Is there anything shipping-related I can help you with today?"
    )
    return Event(
        output=message,
        content=types.Content(
            role="model",
            parts=[types.Part.from_text(text=message)],
        ),
    )


decline_node = FunctionNode(func=_decline_fn)


# ---------------------------------------------------------------------------
# Workflow graph definition
#
#   START → classify_query → route_query
#                                ├─ "shipping"  → shipping_faq_agent
#                                └─ "unrelated" → decline_node
# ---------------------------------------------------------------------------
root_agent = Workflow(
    name="customer_support_workflow",
    description=(
        "A customer support workflow for QuickShip. "
        "Classifies user queries as shipping-related or unrelated, "
        "then routes to the appropriate handler."
    ),
    edges=[
        # Entry: user message → classifier LLM
        ("START", classify_query),
        # Classifier output → router FunctionNode
        (classify_query, route_query),
        # Conditional routing — uses explicit Edge objects (required in google-adk 2.x;
        # the 3-tuple shorthand is not supported in this version).
        Edge(from_node=route_query, to_node=shipping_faq_agent, route="shipping"),
        Edge(from_node=route_query, to_node=decline_node, route="unrelated"),
    ],
)

# ---------------------------------------------------------------------------
# App — required entry point for agents-cli and the ADK runner
# ---------------------------------------------------------------------------
app = App(
    root_agent=root_agent,
    name="app",
)
