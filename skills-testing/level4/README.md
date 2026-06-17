# Level 4: Procedural Logic (database-schema-validator)

This is the "Tool Use" Pattern.

If you ask an LLM "Is this schema safe?", it might say all is well, even if a critical primary key is missing, simply because the SQL looks correct.

Let's delegate this check to a deterministic Script. Our `database-schema-validator` skill routes the agent to run a Python script that we wrote. The script provides binary (True/False) truth.

---

## 🛠️ Step-by-Step Tutorial

### Step 1: Create the SQL File with Policy Violations
Create a new file `bad_schema.sql` containing multiple database policy violations:
```sql
DROP TABLE IF EXISTS legacy_users;

CREATE TABLE userProfile (
    id INT PRIMARY KEY,
    bio TEXT
);

CREATE TABLE posts (
    title TEXT,
    content TEXT,
    created_at TIMESTAMP
);

CREATE TABLE comments (
    id INT PRIMARY KEY,
    post_id INT,
    body TEXT
);
```

### Step 2: Validate the SQL Schema
Trigger the `database-schema-validator` skill to run the Python validator script against `bad_schema.sql`.

### Step 3: Verify the Output
Confirm the script fails with exit code 1, reporting specific warnings and suggested corrections in the console.
