# AuraFlow Automation Extension

This is the browser extension companion for the AuraFlow Web App.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this `plugin` folder.

## Usage

1. In the AuraFlow Web App, run a workflow.
2. When a module opens a target URL (e.g., ChatGPT), it will append a `#session=...` parameter.
3. This extension detects the session parameter and injects a floating control panel into the page.
4. Use the panel to auto-fill the prompt and execute the action.
