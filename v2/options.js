// extension/src/options.js
'use strict';

import {
  savePreferences,
  loadPreferences,
  exportSettings,
  importSettings,
  getTheme,
  setTheme
} from './utils/storage.js';
import { testProvider } from './utils/aiProviders.js';

let elements = {};
let snippets = [];
let currentProvider = 'gemini';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  setupEventListeners();
  await loadSettings();
});

function initElements() {
  elements = {
    // Provider tabs
    providerTabs: document.querySelectorAll('.provider-tab'),
    geminiSettings: document.getElementById('geminiSettings'),
    openaiSettings: document.getElementById('openaiSettings'),
    ollamaSettings: document.getElementById('ollamaSettings'),

    // API keys
    apiKey: document.getElementById('apiKey'),
    openaiKey: document.getElementById('openaiKey'),
    ollamaUrl: document.getElementById('ollamaUrl'),

    // Test buttons
    testGeminiBtn: document.getElementById('testGeminiBtn'),
    testOpenaiBtn: document.getElementById('testOpenaiBtn'),
    testOllamaBtn: document.getElementById('testOllamaBtn'),

    // Status displays
    geminiStatus: document.getElementById('geminiStatus'),
    openaiStatus: document.getElementById('openaiStatus'),
    ollamaStatus: document.getElementById('ollamaStatus'),

    // Theme
    themeBtns: document.querySelectorAll('.theme-btn'),

    // Preferences
    noReadme: document.getElementById('noReadme'),
    fullCode: document.getElementById('fullCode'),
    shortSummary: document.getElementById('shortSummary'),
    preferVanilla: document.getElementById('preferVanilla'),
    autoOptimize: document.getElementById('autoOptimize'),
    alwaysInclude: document.getElementById('alwaysInclude'),

    // Snippets
    snippetsList: document.getElementById('snippetsList'),
    addSnippet: document.getElementById('addSnippet'),

    // Export/Import
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),

    // Save
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status'),

    // Shortcuts link
    shortcutsLink: document.getElementById('shortcutsLink')
  };
}

function setupEventListeners() {
  // Provider tabs
  elements.providerTabs.forEach(tab => {
    tab.addEventListener('click', () => switchProvider(tab.dataset.provider));
  });

  // Test buttons
  elements.testGeminiBtn?.addEventListener('click', () => testApiKey('gemini'));
  elements.testOpenaiBtn?.addEventListener('click', () => testApiKey('openai'));
  elements.testOllamaBtn?.addEventListener('click', () => testApiKey('ollama'));

  // Theme
  elements.themeBtns.forEach(btn => {
    btn.addEventListener('click', () => handleThemeChange(btn.dataset.theme));
  });

  // Snippets
  elements.addSnippet?.addEventListener('click', addSnippet);

  // Export/Import
  elements.exportBtn?.addEventListener('click', handleExport);
  elements.importBtn?.addEventListener('click', () => elements.importFile?.click());
  elements.importFile?.addEventListener('change', handleImport);

  // Save
  elements.saveBtn?.addEventListener('click', handleSave);

  // Shortcuts link
  elements.shortcutsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}

async function loadSettings() {
  const prefs = await loadPreferences();

  // Provider
  currentProvider = prefs.provider || 'gemini';
  switchProvider(currentProvider);

  // API keys
  if (elements.apiKey) elements.apiKey.value = prefs.apiKey || '';
  if (elements.openaiKey) elements.openaiKey.value = prefs.openaiKey || '';
  if (elements.ollamaUrl) elements.ollamaUrl.value = prefs.ollamaUrl || 'http://localhost:11434';

  // Theme
  const theme = await getTheme();
  elements.themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  // Preferences
  if (elements.noReadme) elements.noReadme.checked = prefs.noReadme !== false;
  if (elements.fullCode) elements.fullCode.checked = prefs.fullCode !== false;
  if (elements.shortSummary) elements.shortSummary.checked = prefs.shortSummary !== false;
  if (elements.preferVanilla) elements.preferVanilla.checked = prefs.preferVanilla !== false;
  if (elements.autoOptimize) elements.autoOptimize.checked = prefs.autoOptimize || false;
  if (elements.alwaysInclude) elements.alwaysInclude.value = prefs.alwaysIncludeText || '';

  // Snippets
  snippets = prefs.savedSnippets || [];
  renderSnippets();
}

function switchProvider(provider) {
  currentProvider = provider;

  // Update tabs
  elements.providerTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.provider === provider);
  });

  // Show/hide settings
  elements.geminiSettings?.classList.toggle('hidden', provider !== 'gemini');
  elements.openaiSettings?.classList.toggle('hidden', provider !== 'openai');
  elements.ollamaSettings?.classList.toggle('hidden', provider !== 'ollama');
}

async function testApiKey(provider) {
  const btn = provider === 'gemini' ? elements.testGeminiBtn :
              provider === 'openai' ? elements.testOpenaiBtn :
              elements.testOllamaBtn;

  const statusEl = provider === 'gemini' ? elements.geminiStatus :
                   provider === 'openai' ? elements.openaiStatus :
                   elements.ollamaStatus;

  if (!btn || !statusEl) return;

  btn.disabled = true;
  btn.textContent = 'Testing...';
  statusEl.textContent = 'Testing connection...';
  statusEl.className = 'api-status testing';

  const config = {
    apiKey: elements.apiKey?.value?.trim(),
    openaiKey: elements.openaiKey?.value?.trim(),
    ollamaUrl: elements.ollamaUrl?.value?.trim() || 'http://localhost:11434'
  };

  const result = await testProvider(provider, config);

  if (result.success) {
    statusEl.textContent = 'Connection successful! Ready to use.';
    statusEl.className = 'api-status success';
  } else {
    statusEl.textContent = result.error || 'Connection failed';
    statusEl.className = 'api-status error';
  }

  btn.disabled = false;
  btn.textContent = 'Test';
}

async function handleThemeChange(theme) {
  await setTheme(theme);
  elements.themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function addSnippet() {
  snippets.push('');
  renderSnippets();
}

function renderSnippets() {
  if (!elements.snippetsList) return;

  elements.snippetsList.innerHTML = snippets.map((snippet, index) => `
    <div class="snippet-item">
      <textarea placeholder="Enter snippet (e.g., coding standards, boilerplate)...">${snippet}</textarea>
      <button class="remove-btn" data-index="${index}">Remove</button>
    </div>
  `).join('');

  // Add event listeners
  elements.snippetsList.querySelectorAll('textarea').forEach((textarea, index) => {
    textarea.addEventListener('input', (e) => {
      snippets[index] = e.target.value;
    });
  });

  elements.snippetsList.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      snippets.splice(parseInt(btn.dataset.index), 1);
      renderSnippets();
    });
  });
}

async function handleSave() {
  const prefs = {
    provider: currentProvider,
    apiKey: elements.apiKey?.value?.trim() || '',
    openaiKey: elements.openaiKey?.value?.trim() || '',
    ollamaUrl: elements.ollamaUrl?.value?.trim() || 'http://localhost:11434',
    noReadme: elements.noReadme?.checked ?? true,
    fullCode: elements.fullCode?.checked ?? true,
    shortSummary: elements.shortSummary?.checked ?? true,
    preferVanilla: elements.preferVanilla?.checked ?? true,
    autoOptimize: elements.autoOptimize?.checked ?? false,
    alwaysIncludeText: elements.alwaysInclude?.value?.trim() || '',
    savedSnippets: snippets.filter(s => s.trim())
  };

  try {
    await savePreferences(prefs);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

async function handleExport() {
  try {
    const data = await exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-optimizer-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Settings exported!', 'success');
  } catch (error) {
    showStatus('Export failed: ' + error.message, 'error');
  }
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    await importSettings(text);
    await loadSettings();
    showStatus('Settings imported successfully!', 'success');
  } catch (error) {
    showStatus('Import failed: ' + error.message, 'error');
  }

  // Reset file input
  e.target.value = '';
}

function showStatus(message, type) {
  if (!elements.status) return;

  elements.status.textContent = message;
  elements.status.className = `status ${type}`;

  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}
