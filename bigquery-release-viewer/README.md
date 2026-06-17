# BigQuery Release Notes Explorer

A responsive web application that fetches, parses, searches, filters, and shares Google Cloud's BigQuery release notes. Built using a Python Flask backend and a plain vanilla HTML5/CSS3/JavaScript frontend.

---

## 🌟 Features

* **Live Feed Fetching**: Retrieves release notes in real time from the official Google Cloud Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
* **Sub-Release Parser**: Splits daily entry payloads on HTML `<h3>` tags to extract individual features, announcements, changes, issues, and breaking updates.
* **Resilient Caching**: Overwrites a local cache (`feed_cache.json`) upon successful fetches. Automatically serves from the cache if offline or if external requests fail.
* **Responsive Dark Dashboard**: Modern styling featuring glassmorphism card components, CSS keyframe animations, badge categorizations, and mobile adaptations.
* **Filter & Search Controls**: Search by keyword or filter updates dynamically by category (Feature, Change, Announcement, Breaking, Issue).
* **Twitter / X Share Intent**: Pre-compiles formatted tweet drafts inside a dialog modal to review and edit before posting.
* **One-Click Markdown Copy**: Copies a clean summary (title, category, date, content excerpt, and URL link) directly to your clipboard.

---

## 📁 Project Structure

* **[app.py](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer/app.py)**: Flask entrypoint containing routes, Atom parsing functions, caching utilities, and network requests.
* **[requirements.txt](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer/requirements.txt)**: List of dependencies (`Flask`, `requests`, `beautifulsoup4`).
* **[templates/index.html](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer/templates/index.html)**: Frontend semantic structure, modals, and templates.
* **[static/css/style.css](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer/static/css/style.css)**: Layout styling, colors, animation keyframes, skeleton load indicators, and responsive media rules.
* **[static/js/app.js](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer/static/js/app.js)**: Controller logic for AJAX calls, searching, category buttons, modal display, clipboard copy, and Twitter Web Intent compilation.

---

## 🚀 Setup & Execution

### 1. Prerequisite
Ensure you have **Python 3.10+** installed on your system.

### 2. Installation & Run Instructions

Navigate into this folder and follow these commands:

```powershell
# 1. Create a Python Virtual Environment
python -m venv venv

# 2. Activate the Virtual Environment
# On Windows (PowerShell):
.\venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# 3. Install packages
pip install -r requirements.txt

# 4. Start the server
python app.py
```

After launching, access the application in your web browser at:
👉 **`http://127.0.0.1:5000/`**
