# Level 3: Learning by Example (json-to-pydantic)

The "Few-Shot" pattern.

Converting loose data (like a JSON API response) to strict code (like Pydantic models) involves dozens of decisions. How should we name the classes? Should we use `Optional`? `snake_case` or `camelCase`? Writing out these 50 rules in English is tedious and error-prone. 

Authoring your skill with a golden example (Input -> Output) is often more effective than verbose instructions.

---

## 🛠️ Step-by-Step Tutorial

### Step 1: Create the JSON File with Sample Data
Create a new file `product.json` with the following JSON payload:
```json
{
 "product": "Widget",
 "cost": 10.99,
 "stock": null
}
```

### Step 2: Convert the JSON to a Pydantic Model
Convert the JSON in `product.json` to a Pydantic model using the `json-to-pydantic` skill, and save it to `product_model.py`.

### Step 3: Verify the Output
Inspect `product_model.py` to confirm the generated Pydantic class matches style and structure patterns.
