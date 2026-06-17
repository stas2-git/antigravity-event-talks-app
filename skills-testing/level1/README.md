# Level 1 : The Basic Router (git-commit-formatter)

This is the "Hello World" of custom agent skills.

Developers often write lazy commit messages (e.g. "wip", "fix bug", "updates"). Enforcing "Conventional Commits" manually is tedious and often forgotten. This folder contains a test environment for a Skill that enforces the Conventional Commits specification.

---

## 🛠️ Step-by-Step Tutorial

### Step 1: Set Up a Test Git Repository
Create a folder named `git_test` in the workspace, initialize a git repository inside it, and create an initial file `auth.py` with `def login(): pass`. Stage this file and make an initial commit.

### Step 2: Make a Code Change
In the `git_test` folder, modify `auth.py` to add Google Login functionality.

### Step 3: Stage and Commit the Changes
Trigger the `git-commit-formatter` skill by asking the agent to stage the changes and create a commit.

### Step 4: Verify the Git Log
Retrieve the git history to confirm that the formatted commit was successfully recorded.
