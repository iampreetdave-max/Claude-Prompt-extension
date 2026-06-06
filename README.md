# Claude Prompt Optimizer

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Chrome Extension](https://img.shields.io/badge/Manifest-V3-4285F4?style=flat&logo=googlechrome&logoColor=white)

A Chrome/Edge extension that rewrites your prompts using the Google Gemini API and injects the optimized prompt directly into the claude.ai chat input.

## Overview

Writing effective prompts is iterative. Claude Prompt Optimizer streamlines that
loop: you draft a prompt in the extension popup, send it to the Gemini API to be
rewritten, and inject the improved version straight into the claude.ai composer
without leaving the page.

The extension is built on Manifest V3 with a background service worker, a content
script scoped to `claude.ai`, a popup UI for editing prompts, and an options page
for storing your API key.

## Key Features

- **Prompt optimization** — sends your draft to the Gemini API and returns a rewritten prompt.
- **Direct injection** — a content script inserts the optimized prompt into the claude.ai input.
- **Popup interface** — edit and optimize prompts from the toolbar popup.
- **Options page** — store and manage your Gemini API key and preferences.
- **Persistent storage** — settings are kept via the Chrome Storage API.
- **Clipboard support** — declares the `clipboardWrite` permission for copying prompts.

## How It Works

- **`manifest.json`** — Manifest V3 config declaring the popup, background service
  worker, content script, options page, permissions, and host permissions for
  `claude.ai` and the Gemini API endpoint.
- **`src/popup.*`** — the toolbar UI for writing, editing, and triggering optimization.
- **`src/background.js`** — service worker (ES module) coordinating API calls.
- **`src/content-script.js`** — runs on `claude.ai` pages and injects the optimized prompt.
- **`src/options.*`** — settings page for the Gemini API key and preferences.
- **`v2/`** — an alternate iteration of the extension.

### Permissions

Declared in `manifest.json`: `storage`, `activeTab`, `scripting`, `clipboardWrite`.
Host permissions are limited to `https://claude.ai/*` and
`https://generativelanguage.googleapis.com/*`.

## Tech Stack

- **Language:** JavaScript (ES modules)
- **Platform:** Chrome Extension (Manifest V3)
- **External API:** Google Gemini (`generativelanguage.googleapis.com`)
- **Storage:** Chrome Storage API

## Getting Started

### Prerequisites

- A Chromium-based browser (Chrome or Edge)
- A Google Gemini API key

### Install (load unpacked)

1. Clone the repository:
   ```bash
   git clone https://github.com/iampreetdave-max/Claude-Prompt-extension.git
   ```
2. Open `chrome://extensions/` (or `edge://extensions/`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the cloned project folder (the one containing `manifest.json`).
5. Open the extension's **Options** page and enter your Gemini API key.

### Usage

1. Open [claude.ai](https://claude.ai).
2. Click the extension icon to open the popup.
3. Write or paste a prompt and run optimize — Gemini rewrites it.
4. Inject the optimized prompt into the Claude composer.

## Configuration

The extension requires a **Google Gemini API key**, entered on the options page
and stored in Chrome extension storage. No key is bundled with the source.

> **Security note:** extension storage is not encrypted and can be read by anyone
> with local access to the browser profile. Restrict your key (IP / quota limits)
> in Google AI Studio and consider proxying requests. See
> [README-SECURITY-NOTE.md](README-SECURITY-NOTE.md) for details and an example
> Cloudflare Worker proxy.

## Project Structure

```
Claude-Prompt-extension/
├── manifest.json              # Manifest V3 configuration
├── src/
│   ├── popup.html / .css / .js    # Toolbar popup UI
│   ├── background.js              # Service worker (ES module)
│   ├── content-script.js          # claude.ai injection
│   ├── options.html / .css / .js  # Settings page
│   └── utils/                     # Shared helpers
├── icons/                     # 16 / 48 / 128 px icons
├── v2/                        # Alternate version
├── README-SECURITY-NOTE.md
├── LICENSE.txt
└── README.md
```

## License

This project is licensed under the [Apache License 2.0](LICENSE.txt).
