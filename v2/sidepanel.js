'use strict';

import { loadPreferences, getHistory, saveToHistory, getTheme, setTheme } from './utils/storage.js';
import { assemblePayload } from './utils/assemblePayload.js';
import { generateWithProvider } from './utils/aiProviders.js';
import { estimateTokens, formatTokenCount } from './utils/tokenCounter.js';

// Default templates for quick access
const QUICK_TEMPLATES = {
  debug: 'Debug this code. Find the bug, explain why it happens, and provide the fix:\n\n[paste code]',
  explain: 'Explain this code in detail. What does it do and how?\n\n[paste code]',
  refactor: 'Refactor this code for better readability and performance:\n\n[paste code]',
  tests: 'Write unit tests for this code with edge cases:\n\n[paste code]'
};

let elements = {};
let isOnClaudeTab = false;
let currentTabId = null;
let autoOptimizeTimeout = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  await initTheme();
  setupListeners();
  await checkClaudeTab();
  await loadHistory();
});

function initElements() {
  elements = {
    themeToggle: document.getElementById('spThemeToggle'),
    settingsBtn: document.getElementById('spSettingsBtn'),
    claudeStatus: document.getElementById('spClaudeStatus'),
    templates: document.getElementById('spTemplates'),
    tokens: document.getElementById('spTokens'),
    rawPrompt: document.getElementById('spRawPrompt'),
    autoOptimize: document.getElementById('spAutoOptimize'),
    optimizeBtn: document.getElementById('spOptimizeBtn'),
    status: document.getElementById('spStatus'),
    outputSection: document.getElementById('spOutputSection'),
    outputTokens: document.getElementById('spOutputTokens'),
    optimizedPrompt: document.getElementById('spOptimizedPrompt'),
    copyBtn: document.getElementById('spCopyBtn'),
    pasteBtn: document.getElementById('spPasteBtn'),
    history: document.getElementById('spHistory')
  };
}

function setupListeners() {
  elements.themeToggle?.addEventListener('click', toggleTheme);
  elements.settingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());

  elements.templates?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sp-template-btn');
    if (btn && QUICK_TEMPLATES[btn.dataset.template]) {
      elements.rawPrompt.value = QUICK_TEMPLATES[btn.dataset.template];
      updateTokenCount();
    }
  });

  elements.rawPrompt?.addEventListener('input', () => {
    updateTokenCount();
    if (elements.autoOptimize?.checked) {
      clearTimeout(autoOptimizeTimeout);
      autoOptimizeTimeout = setTimeout(handleOptimize, 1500);
    }
  });

  elements.optimizeBtn?.addEventListener('click', handleOptimize);
  elements.copyBtn?.addEventListener('click', handleCopy);
  elements.pasteBtn?.addEventListener('click', handlePaste);
}

// Theme
async function initTheme() {
  const theme = await getTheme();
  applyTheme(theme);
}

function applyTheme(theme) {
  const isDark = theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const sun = elements.themeToggle?.querySelector('.icon-sun');
  const moon = elements.themeToggle?.querySelector('.icon-moon');
  sun?.classList.toggle('hidden', isDark);
  moon?.classList.toggle('hidden', !isDark);
}

async function toggleTheme() {
  const current = await getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  await setTheme(next);
  applyTheme(next);
}

// Claude detection
async function checkClaudeTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.includes('claude.ai')) {
      isOnClaudeTab = true;
      currentTabId = tab.id;
      elements.claudeStatus?.classList.remove('hidden');

      // Try to capture input
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const el = document.querySelector('[contenteditable="true"], .ProseMirror');
          return el?.textContent?.trim() || '';
        }
      });

      const captured = results[0]?.result;
      if (captured && elements.rawPrompt) {
        elements.rawPrompt.value = captured;
        updateTokenCount();
      }
    }
  } catch (e) {
    console.error('Claude detection error:', e);
  }

  // Listen for tab changes
  chrome.tabs.onActivated?.addListener(async (info) => {
    try {
      const tab = await chrome.tabs.get(info.tabId);
      isOnClaudeTab = tab.url?.includes('claude.ai') || false;
      currentTabId = isOnClaudeTab ? tab.id : null;
      elements.claudeStatus?.classList.toggle('hidden', !isOnClaudeTab);
    } catch (e) {}
  });
}

// Token counter
function updateTokenCount() {
  const tokens = estimateTokens(elements.rawPrompt?.value || '');
  if (elements.tokens) {
    elements.tokens.textContent = `${formatTokenCount(tokens)} tokens`;
  }
}

// Optimize
async function handleOptimize() {
  const prompt = elements.rawPrompt?.value?.trim();
  if (!prompt) {
    showStatus('Enter a prompt first', 'error');
    return;
  }

  setLoading(true);

  try {
    const prefs = await loadPreferences();

    if (!prefs.apiKey && prefs.provider === 'gemini') {
      showStatus('Set API key in Settings', 'error');
      return;
    }

    const payload = assemblePayload(prompt, prefs, [], []);

    const optimized = await generateWithProvider(payload, {
      provider: prefs.provider || 'gemini',
      apiKey: prefs.apiKey,
      openaiKey: prefs.openaiKey,
      ollamaUrl: prefs.ollamaUrl
    });

    await saveToHistory(prompt, optimized);

    if (elements.optimizedPrompt) {
      elements.optimizedPrompt.value = optimized;
    }

    const outTokens = estimateTokens(optimized);
    if (elements.outputTokens) {
      elements.outputTokens.textContent = `${formatTokenCount(outTokens)} tokens`;
    }

    elements.outputSection?.classList.remove('hidden');
    showStatus('Optimized!', 'success');
    loadHistory();

  } catch (error) {
    showStatus(error.message || 'Failed', 'error');
  } finally {
    setLoading(false);
  }
}

// Copy/Paste
function handleCopy() {
  const text = elements.optimizedPrompt?.value;
  if (text) {
    navigator.clipboard.writeText(text);
    showStatus('Copied!', 'success');
  }
}

async function handlePaste() {
  const text = elements.optimizedPrompt?.value;
  if (!text) return;

  if (!isOnClaudeTab || !currentTabId) {
    await navigator.clipboard.writeText(text);
    showStatus('Copied - paste in Claude', 'success');
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: (promptText) => {
        const el = document.querySelector('[contenteditable="true"], .ProseMirror');
        if (el) {
          el.focus();
          el.innerHTML = '';
          document.execCommand('insertText', false, promptText);
          return true;
        }
        return false;
      },
      args: [text]
    });
    showStatus('Pasted!', 'success');
  } catch {
    await navigator.clipboard.writeText(text);
    showStatus('Copied - paste manually', 'success');
  }
}

// History
async function loadHistory() {
  const history = await getHistory();

  if (elements.history) {
    if (history.length === 0) {
      elements.history.innerHTML = '<p class="sp-empty">No history yet</p>';
    } else {
      elements.history.innerHTML = history.slice(0, 5).map(item => `
        <div class="sp-history-item" data-original="${encodeURIComponent(item.original)}" data-optimized="${encodeURIComponent(item.optimized)}">
          <div class="sp-history-date">${new Date(item.timestamp).toLocaleString()}</div>
          <div class="sp-history-preview">${item.original.substring(0, 50)}...</div>
        </div>
      `).join('');

      elements.history.querySelectorAll('.sp-history-item').forEach(item => {
        item.addEventListener('click', () => {
          const original = decodeURIComponent(item.dataset.original);
          const optimized = decodeURIComponent(item.dataset.optimized);
          elements.rawPrompt.value = original;
          elements.optimizedPrompt.value = optimized;
          elements.outputSection?.classList.remove('hidden');
          updateTokenCount();
        });
      });
    }
  }
}

// Utilities
function setLoading(loading) {
  if (elements.optimizeBtn) {
    elements.optimizeBtn.disabled = loading;
    const text = elements.optimizeBtn.querySelector('.sp-btn-text');
    const spinner = elements.optimizeBtn.querySelector('.sp-spinner');
    if (text) text.textContent = loading ? 'Optimizing...' : 'Optimize';
    spinner?.classList.toggle('hidden', !loading);
  }
}

function showStatus(message, type) {
  if (elements.status) {
    elements.status.textContent = message;
    elements.status.className = `sp-status ${type}`;
    setTimeout(() => {
      elements.status.className = 'sp-status';
    }, 2500);
  }
}
