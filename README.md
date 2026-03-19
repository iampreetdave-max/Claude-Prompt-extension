# Claude Prompt Optimizer

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat&logo=googlechrome&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Anthropic-orange?style=flat)
![Gemini](https://img.shields.io/badge/Gemini-Google-4285F4?style=flat&logo=google&logoColor=white)

> A Chrome extension that optimizes your prompts for Claude using the Gemini API — paste, optimize, and inject directly into claude.ai.

## About

Claude Prompt Optimizer is a Chrome/Edge extension that takes your prompts, sends them to the Gemini API for optimization, and lets you inject the improved prompt directly into the Claude.ai chat interface. Features a popup UI for prompt editing, a content script for Claude.ai integration, and persistent settings via an options page.

## Tech Stack

- **Language:** JavaScript (ES Modules)
- **Platform:** Chrome Extension (Manifest V3)
- **APIs:** Google Gemini API, Claude.ai DOM integration
- **Storage:** Chrome Storage API

## Features

- **Prompt optimization** — rewrites prompts via Gemini API for better Claude responses
- **Direct injection** — inserts optimized prompts into the claude.ai chat input
- **Popup interface** — clean UI for writing, editing, and optimizing prompts
- **Content script** — integrates with claude.ai pages for seamless workflow
- **Clipboard support** — read from and write to clipboard
- **Options page** — configure API key and preferences
- **V2 variant** included for alternate approaches

## Getting Started

### Prerequisites

- Chrome or Edge browser
- Google Gemini API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/iampreetdave-max/Claude-Prompt-extension.git
```

2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder
5. Set your Gemini API key in the extension options

### Usage

1. Navigate to [claude.ai](https://claude.ai)
2. Click the extension icon
3. Write or paste your prompt
4. Click optimize — Gemini rewrites it
5. Inject the optimized prompt into the Claude chat

## Project Structure

```
Claude-Prompt-extension/
├── manifest.json              # Extension manifest (V3)
├── src/
│   ├── popup.html             # Popup UI
│   ├── background.js          # Service worker
│   ├── content-script.js      # Claude.ai integration
│   └── options.html           # Settings page
├── icons/                     # Extension icons
├── v2/                        # Alternate version
├── LICENSE.txt
├── README-SECURITY-NOTE.md
└── README.md
```

## License

This project is licensed under the [Apache License 2.0](LICENSE.txt).
