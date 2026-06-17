# Google News CLI Reader

A premium, lightweight command-line interface (CLI) application to read the latest top stories, search query news, or official blogs from Google. 

Developed with **zero external dependencies** using Node.js native APIs for instant loading.

---

## Features

- **Google-themed Aesthetics**: Colorful logo header and color-coded CLI output.
- **Relative Dates**: Displays publication times as relative values (e.g. `4m ago`, `12h ago`, `3d ago`).
- **Interactive Mode**: Run without flags to open an interactive terminal menu.
- **Flexible CLI Flags**: Run with arguments to quickly query specific terms or switch sources.
- **Clickable Links**: Clean output formatting containing clickable terminal links to read the original article.

---

## Prerequisites

- **Node.js** v18.0.0 or higher. (Verified on Node.js v24.14.0).

---

## Getting Started

### 1. Navigate to the Directory
Open your terminal and navigate to the project directory:
```bash
cd google-news-cli
```

### 2. Run the Application

#### A. Interactive Menu (Default)
Simply run the script with no arguments:
```bash
node index.js
```

#### B. Command Line Flags
You can also bypass the menu and run direct queries using CLI options:
```bash
# Get top global news (limit output to 5 stories)
node index.js --source news --limit 5

# Read the official Google Blog announcements
node index.js --source official

# Search Google News for a custom term
node index.js --query "Google DeepMind"
```

---

## Command Line Options

| Flag | Full Option | Description |
|---|---|---|
| `-s` | `--source` | Specify feed: `news` (Top Stories), `google` (News about Google), `official` (Keyword Blog), or `search`. |
| `-q` | `--query` | The search query string (automatically implies `--source search`). |
| `-l` | `--limit` | Maximum number of stories to display (default: `10`, max: `40`). |
| `-h` | `--help` | Show the help/usage menu. |

---

## Global Command Setup

If you want to be able to run this tool from **any** directory on your machine:

1. Open your terminal as an Administrator.
2. Navigate to this folder.
3. Run the linking command:
   ```bash
   npm link
   ```
4. Now you can get the news from anywhere by running:
   ```bash
   google-news
   ```
