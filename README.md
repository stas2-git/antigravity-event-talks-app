# Antigravity Event Talks App Workspace

Welcome to the workspace containing the utility apps for exploring and sharing technical updates. This repository holds two main applications: the **BigQuery Release Notes Explorer** (Python Flask) and the **Google News CLI** (Node.js).

---

## 📂 Repository Structure

* **[bigquery-release-viewer/](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/bigquery-release-viewer)**: Web dashboard built with Python Flask and vanilla HTML5, CSS3, and JavaScript. Fetches, parses, filters, and shares BigQuery release notes.
* **[google-news-cli/](file:///c:/Users/stan/Documents/shared_C_drive/google_project1/google-news-cli)**: Node.js Command Line Interface (CLI) app that retrieves and formats Google News feeds.

---

## 📊 BigQuery Release Notes Explorer (Web App)

A premium, responsive dashboard that fetches Google Cloud's official BigQuery release notes Atom feed and categorizes them by type (Features, Breaking Changes, Changes, Issues, Announcements) for interactive filtering, searching, and social sharing.

### 🌟 Key Features
* **Granular Release Splitting**: Automatically extracts individual sub-updates from daily compound XML entries.
* **Smart Caching & Offline Fallback**: Caches feed notes to `feed_cache.json` for lightning-fast loads and handles network issues gracefully.
* **Glassmorphic UI**: Beautiful dark-mode dashboard with hover micro-interactions, responsive sizing, and skeleton loading screens.
* **Twitter / X Share Intent**: Pre-populates formatted, length-safe tweet drafts with hashtags and links for direct sharing.
* **One-Click Copy**: Copies formatted Markdown summaries of specific updates to the clipboard.

### 🚀 Getting Started

#### Prerequisites
* Python 3.10 or higher installed.

#### Setup & Execution

1. Navigate to the project directory:
   ```powershell
   cd bigquery-release-viewer
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   # Create venv
   python -m venv venv
   
   # Activate on Windows (PowerShell)
   .\venv\Scripts\activate
   
   # Activate on macOS/Linux
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the server:
   ```bash
   python app.py
   ```

5. Open your browser to `http://127.0.0.1:5000/`.

---

## 📰 Google News CLI

A simple terminal CLI utility to get headlines from Google News.

### 🚀 Setup & Execution
1. Navigate to the folder:
   ```bash
   cd google-news-cli
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the CLI tool:
   ```bash
   npm start
   ```

---

## 📝 License
This workspace is designed for internal use and development.
