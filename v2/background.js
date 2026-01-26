// extension/src/background.js
'use strict';

import { loadPreferences } from './utils/storage.js';
import { generateWithProvider } from './utils/aiProviders.js';

/**
 * Service worker for handling API calls, tab detection, and keyboard shortcuts
 */

// Badge management - show "ON" when on Claude.ai
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadge(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      updateBadge(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    // Tab might not exist
  }
});

function updateBadge(tabId, url) {
  if (url?.includes('claude.ai')) {
    chrome.action.setBadgeText({ text: 'ON', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#d4a574', tabId });
    chrome.action.setTitle({ title: 'Claude Prompt Optimizer - Ready!', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
    chrome.action.setTitle({ title: 'Claude Prompt Optimizer', tabId });
  }
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_side_panel') {
    try {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: window.id });
    } catch (e) {
      console.error('Failed to open side panel:', e);
    }
  }

  if (command === 'optimize_prompt') {
    // Send message to active tab's content script to trigger optimization
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_OPTIMIZE' });
      }
    } catch (e) {
      console.error('Failed to trigger optimization:', e);
    }
  }
});

// Side panel behavior - open side panel when clicking action on Claude
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPTIMIZE') {
    handleOptimize(request.payload)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (request.type === 'GET_CLAUDE_INPUT') {
    getCaudeInput(sender.tab?.id)
      .then(text => sendResponse({ text }))
      .catch(() => sendResponse({ text: '' }));
    return true;
  }
});

/**
 * Handle optimization request
 */
async function handleOptimize(payload) {
  try {
    const prefs = await loadPreferences();

    if (!prefs.apiKey && prefs.provider === 'gemini') {
      return { ok: false, error: 'API key not configured. Please set it in Options.' };
    }

    const optimizedPrompt = await generateWithProvider(payload, {
      provider: prefs.provider || 'gemini',
      apiKey: prefs.apiKey,
      openaiKey: prefs.openaiKey,
      ollamaUrl: prefs.ollamaUrl
    });

    return { ok: true, prompt: optimizedPrompt };

  } catch (error) {
    console.error('Optimization error:', error);

    let errorMessage = error.message;

    if (errorMessage.includes('403')) {
      errorMessage = 'API key invalid or restricted. Check Options > API key';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('quota')) {
      errorMessage = 'API quota exceeded. Check your Google AI Studio dashboard.';
    }

    return { ok: false, error: errorMessage };
  }
}

/**
 * Get text from Claude's input field
 */
async function getCaudeInput(tabId) {
  if (!tabId) return '';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const el = document.querySelector('[contenteditable="true"], .ProseMirror, [role="textbox"]');
        return el?.textContent || el?.innerText || '';
      }
    });
    return results[0]?.result || '';
  } catch {
    return '';
  }
}

// Context menu for quick optimization
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'optimize-selection',
    title: 'Optimize with Claude Optimizer',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'optimize-selection' && info.selectionText) {
    // Open popup with selected text
    // For now, copy to clipboard and show notification
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          navigator.clipboard.writeText(text);
        },
        args: [info.selectionText]
      });

      // Try to open side panel
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: window.id });
    } catch (e) {
      console.error('Context menu action failed:', e);
    }
  }
});
