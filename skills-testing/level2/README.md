# Level 2: Asset Utilization (license-header-adder)

This is the "Reference" pattern.

Every source file in a corporate project might need a specific 20-line Apache 2.0 license header. Putting this static text directly into the prompt (or `SKILL.md`) is wasteful. It consumes tokens every time the skill is indexed, and the model might "hallucinate" typos in legal text. It is a good practice to offload the static text to a plain text file in a `resources/` folder. The skill instructs the agent to read this file only when needed.

---

## 🛠️ Step-by-Step Tutorial

### Step 1: Create the Python File with Sample Code
Create a new file `my_script.py` with the following python code:
```python
def hello():
   print("Hello, World!")
```

### Step 2: Add the License Header
Add the license header to `my_script.py` by executing the `license-header-adder` skill instructions.

### Step 3: Verify the File Contents
Inspect `my_script.py` to confirm the license header is prepended with `#` comment formatting.
