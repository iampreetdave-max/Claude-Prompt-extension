'use strict';

import {
  loadPreferences,
  saveToHistory,
  getHistory,
  clearHistory,
  deleteHistoryItem,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getPresets,
  setActivePreset,
  getTheme,
  setTheme
} from './utils/storage.js';
import { assemblePayload } from './utils/assemblePayload.js';
import { generateWithProvider } from './utils/aiProviders.js';
import { estimateTokens, formatTokenCount, calculateSavings } from './utils/tokenCounter.js';
import { createDiff } from './utils/diffView.js';

// State
let elements = {};
let attachedFiles = [];
let isOnClaudeTab = false;
let currentTabId = null;
let lastOriginalPrompt = '';
let lastOptimizedPrompt = '';
let autoOptimizeTimeout = null;
let activePresetId = 'quick';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  await initializeTheme();
  setupEventListeners();
  await loadPresetsUI();
  await checkClaudeTab();
  setupKeyboardShortcuts();
});

function initializeElements() {
  elements = {
    // Header
    themeToggle: document.getElementById('themeToggle'),
    sidePanelBtn: document.getElementById('sidePanelBtn'),
    historyBtn: document.getElementById('historyBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    claudeDetected: document.getElementById('claudeDetected'),

    // Tabs
    tabs: document.querySelectorAll('.tab'),
    promptTab: document.getElementById('promptTab'),
    templatesTab: document.getElementById('templatesTab'),
    compareTab: document.getElementById('compareTab'),

    // Presets
    presetsList: document.getElementById('presetsList'),

    // Token counter
    tokenCounter: document.getElementById('tokenCounter'),
    tokenCount: document.getElementById('tokenCount'),
    tokenSavings: document.getElementById('tokenSavings'),

    // Input
    rawPrompt: document.getElementById('rawPrompt'),
    scrapeClaude: document.getElementById('scrapeClaude'),
    autoOptimize: document.getElementById('autoOptimize'),
    fileInput: document.getElementById('fileInput'),
    fileList: document.getElementById('fileList'),

    // Actions
    optimizeBtn: document.getElementById('optimizeBtn'),
    status: document.getElementById('status'),

    // Output
    outputGroup: document.getElementById('outputGroup'),
    optimizedPrompt: document.getElementById('optimizedPrompt'),
    outputTokens: document.getElementById('outputTokens'),
    savingsPercent: document.getElementById('savingsPercent'),
    copyBtn: document.getElementById('copyBtn'),
    pasteToClaudeBtn: document.getElementById('pasteToClaudeBtn'),

    // Templates
    templatesGrid: document.getElementById('templatesGrid'),
    addTemplateBtn: document.getElementById('addTemplateBtn'),

    // Compare
    originalDiff: document.getElementById('originalDiff'),
    optimizedDiff: document.getElementById('optimizedDiff'),
    diffStats: document.getElementById('diffStats'),

    // Modals
    historyModal: document.getElementById('historyModal'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),

    templateModal: document.getElementById('templateModal'),
    templateName: document.getElementById('templateName'),
    templateIcon: document.getElementById('templateIcon'),
    templatePrompt: document.getElementById('templatePrompt'),
    closeTemplateBtn: document.getElementById('closeTemplateBtn'),
    cancelTemplateBtn: document.getElementById('cancelTemplateBtn'),
    saveTemplateBtn: document.getElementById('saveTemplateBtn')
  };
}

function setupEventListeners() {
  // Header actions
  elements.themeToggle?.addEventListener('click', toggleTheme);
  elements.sidePanelBtn?.addEventListener('click', openSidePanel);
  elements.historyBtn?.addEventListener('click', openHistory);
  elements.settingsBtn?.addEventListener('click', openSettings);

  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Presets
  elements.presetsList?.addEventListener('click', handlePresetClick);

  // Input
  elements.rawPrompt?.addEventListener('input', handlePromptInput);
  elements.autoOptimize?.addEventListener('change', handleAutoOptimizeChange);
  elements.fileInput?.addEventListener('change', handleFileSelect);

  // Actions
  elements.optimizeBtn?.addEventListener('click', handleOptimize);
  elements.copyBtn?.addEventListener('click', handleCopy);
  elements.pasteToClaudeBtn?.addEventListener('click', handlePasteToClaude);

  // Templates
  elements.addTemplateBtn?.addEventListener('click', openTemplateModal);
  elements.closeTemplateBtn?.addEventListener('click', closeTemplateModal);
  elements.cancelTemplateBtn?.addEventListener('click', closeTemplateModal);
  elements.saveTemplateBtn?.addEventListener('click', handleSaveTemplate);

  // History
  elements.closeHistoryBtn?.addEventListener('click', closeHistory);
  elements.clearHistoryBtn?.addEventListener('click', handleClearHistory);

  // Load templates
  loadTemplates();
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to optimize
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleOptimize();
    }
  });
}

// Theme
async function initializeTheme() {
  const theme = await getTheme();
  applyTheme(theme);
}

function applyTheme(theme) {
  const isDark = theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const sunIcon = elements.themeToggle?.querySelector('.icon-sun');
  const moonIcon = elements.themeToggle?.querySelector('.icon-moon');

  if (sunIcon && moonIcon) {
    sunIcon.classList.toggle('hidden', isDark);
    moonIcon.classList.toggle('hidden', !isDark);
  }
}

async function toggleTheme() {
  const current = await getTheme();
  const newTheme = current === 'dark' ? 'light' : 'dark';
  await setTheme(newTheme);
  applyTheme(newTheme);
}

// Tabs
function switchTab(tabName) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  elements.promptTab?.classList.toggle('active', tabName === 'prompt');
  elements.promptTab?.classList.toggle('hidden', tabName !== 'prompt');
  elements.templatesTab?.classList.toggle('active', tabName === 'templates');
  elements.templatesTab?.classList.toggle('hidden', tabName !== 'templates');
  elements.compareTab?.classList.toggle('active', tabName === 'compare');
  elements.compareTab?.classList.toggle('hidden', tabName !== 'compare');

  if (tabName === 'compare') {
    updateCompareView();
  }
}

// Presets
async function loadPresetsUI() {
  const { presets, activePreset } = await getPresets();
  activePresetId = activePreset || 'quick';

  if (elements.presetsList) {
    elements.presetsList.innerHTML = presets.map(preset => `
      <button class="preset-btn ${preset.id === activePresetId ? 'active' : ''}"
              data-preset="${preset.id}"
              title="${preset.name}">
        ${preset.icon || ''} ${preset.name}
      </button>
    `).join('');
  }
}

async function handlePresetClick(e) {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;

  const presetId = btn.dataset.preset;
  activePresetId = presetId;
  await setActivePreset(presetId);

  elements.presetsList.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === presetId);
  });
}

// Token counter
function updateTokenCount() {
  const text = elements.rawPrompt?.value || '';
  const tokens = estimateTokens(text);

  if (elements.tokenCount) {
    elements.tokenCount.textContent = formatTokenCount(tokens);
  }
}

// Claude tab detection
async function checkClaudeTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url?.includes('claude.ai')) {
      isOnClaudeTab = true;
      currentTabId = tab.id;

      elements.claudeDetected?.classList.remove('hidden');
      if (elements.scrapeClaude) elements.scrapeClaude.checked = true;

      await captureClaudeInput(tab.id);
    }
  } catch (error) {
    console.error('Error checking Claude tab:', error);
  }
}

async function captureClaudeInput(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selectors = [
          '[data-placeholder="How can Claude help you today?"]',
          'div[contenteditable="true"]',
          '.ProseMirror',
          '[role="textbox"]'
        ];

        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent || el.innerText || '';
            if (text.trim()) return text.trim();
          }
        }
        return '';
      }
    });

    const captured = results[0]?.result || '';
    if (captured && elements.rawPrompt) {
      elements.rawPrompt.value = captured;
      elements.rawPrompt.placeholder = 'Captured from Claude';
      updateTokenCount();
    }
  } catch (error) {
    console.error('Error capturing Claude input:', error);
  }
}

// File handling
function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  attachedFiles = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = file.name.split('.').pop() || 'txt';
      attachedFiles.push({
        name: file.name,
        content: e.target.result,
        ext
      });
      updateFileList();
    };
    reader.readAsText(file);
  });
}

function updateFileList() {
  if (!elements.fileList) return;

  elements.fileList.innerHTML = attachedFiles.map((file, i) => `
    <div class="file-item">
      <span>${file.name}</span>
      <button class="remove-file" data-index="${i}">\u00d7</button>
    </div>
  `).join('');

  elements.fileList.querySelectorAll('.remove-file').forEach(btn => {
    btn.addEventListener('click', () => {
      attachedFiles.splice(parseInt(btn.dataset.index), 1);
      updateFileList();
    });
  });
}

// Prompt input handling
function handlePromptInput() {
  updateTokenCount();

  if (elements.autoOptimize?.checked) {
    clearTimeout(autoOptimizeTimeout);
    autoOptimizeTimeout = setTimeout(() => {
      handleOptimize();
    }, 1500);
  }
}

function handleAutoOptimizeChange() {
  if (!elements.autoOptimize?.checked) {
    clearTimeout(autoOptimizeTimeout);
  }
}

// Optimize
async function handleOptimize() {
  const rawPrompt = elements.rawPrompt?.value?.trim();

  if (!rawPrompt) {
    showStatus('Please enter a prompt', 'error');
    return;
  }

  setLoading(true);
  lastOriginalPrompt = rawPrompt;

  try {
    const prefs = await loadPreferences();

    if (!prefs.apiKey && prefs.provider === 'gemini') {
      showStatus('Please set your API key in Settings', 'error');
      openSettings();
      return;
    }

    // Get active preset preferences
    const { presets } = await getPresets();
    const activePreset = presets.find(p => p.id === activePresetId);
    const mergedPrefs = { ...prefs, ...(activePreset?.preferences || {}) };

    // Scrape Claude context if enabled
    let scrapedFilenames = [];
    if (elements.scrapeClaude?.checked && isOnClaudeTab) {
      scrapedFilenames = await scrapeClaudeFiles();
    }

    // Prepare files
    const embeddedFiles = attachedFiles.map(f => ({
      name: f.name,
      ext: f.ext,
      text: f.content,
      truncated: f.content.split('\n').length > 50
    }));

    // Assemble payload
    const payload = assemblePayload(rawPrompt, mergedPrefs, scrapedFilenames, embeddedFiles);

    // Generate optimized prompt
    const optimized = await generateWithProvider(payload, {
      provider: prefs.provider || 'gemini',
      apiKey: prefs.apiKey,
      openaiKey: prefs.openaiKey,
      ollamaUrl: prefs.ollamaUrl
    });

    lastOptimizedPrompt = optimized;

    // Save to history
    await saveToHistory(rawPrompt, optimized);

    // Update UI
    if (elements.optimizedPrompt) {
      elements.optimizedPrompt.value = optimized;
    }
    elements.outputGroup?.classList.remove('hidden');

    // Update token stats
    const originalTokens = estimateTokens(rawPrompt);
    const optimizedTokens = estimateTokens(optimized);
    const savings = calculateSavings(originalTokens, optimizedTokens);

    if (elements.outputTokens) {
      elements.outputTokens.textContent = `${formatTokenCount(optimizedTokens)} tokens`;
    }
    if (elements.savingsPercent) {
      if (savings.isReduction) {
        elements.savingsPercent.textContent = `-${savings.percentage}%`;
        elements.savingsPercent.style.display = 'inline';
      } else {
        elements.savingsPercent.style.display = 'none';
      }
    }

    showStatus('Optimized successfully!', 'success');

  } catch (error) {
    console.error('Optimization error:', error);
    showStatus(error.message || 'Optimization failed', 'error');
  } finally {
    setLoading(false);
  }
}

async function scrapeClaudeFiles() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('claude.ai')) return [];

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_CLAUDE_FILES' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(response?.filenames || []);
      });
    });
  } catch {
    return [];
  }
}

// Copy & Paste
function handleCopy() {
  const text = elements.optimizedPrompt?.value;
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => showStatus('Copied!', 'success'))
    .catch(() => showStatus('Copy failed', 'error'));
}

async function handlePasteToClaude() {
  const text = elements.optimizedPrompt?.value;
  if (!text) return;

  if (!isOnClaudeTab || !currentTabId) {
    // Copy to clipboard as fallback
    await navigator.clipboard.writeText(text);
    showStatus('Copied! Open Claude and paste.', 'info');
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: (promptText) => {
        const selectors = [
          '[data-placeholder="How can Claude help you today?"]',
          'div[contenteditable="true"]',
          '.ProseMirror',
          '[role="textbox"]'
        ];

        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el) {
            el.focus();
            // Clear existing content
            el.innerHTML = '';
            // Insert new text
            document.execCommand('insertText', false, promptText);
            return true;
          }
        }
        return false;
      },
      args: [text]
    });

    showStatus('Pasted to Claude!', 'success');

    // Close popup after successful paste
    setTimeout(() => window.close(), 500);
  } catch (error) {
    console.error('Paste error:', error);
    await navigator.clipboard.writeText(text);
    showStatus('Copied! Paste manually in Claude.', 'info');
  }
}

// Templates
async function loadTemplates() {
  const templates = await getTemplates();

  if (elements.templatesGrid) {
    elements.templatesGrid.innerHTML = templates.map(t => `
      <div class="template-card ${t.isCustom ? 'custom' : ''}" data-template-id="${t.id}">
        ${t.isCustom ? `<button class="template-delete" data-delete="${t.id}">\u00d7</button>` : ''}
        <div class="template-icon">${t.icon}</div>
        <div class="template-name">${t.name}</div>
      </div>
    `).join('');

    // Add click handlers
    elements.templatesGrid.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-delete')) {
          handleDeleteTemplate(e.target.dataset.delete);
          return;
        }
        const template = templates.find(t => t.id === card.dataset.templateId);
        if (template) {
          useTemplate(template);
        }
      });
    });
  }
}

function useTemplate(template) {
  if (elements.rawPrompt) {
    elements.rawPrompt.value = template.prompt;
    updateTokenCount();
  }
  switchTab('prompt');
}

function openTemplateModal() {
  elements.templateModal?.classList.remove('hidden');
  elements.templateName.value = '';
  elements.templateIcon.value = '';
  elements.templatePrompt.value = '';
}

function closeTemplateModal() {
  elements.templateModal?.classList.add('hidden');
}

async function handleSaveTemplate() {
  const name = elements.templateName?.value?.trim();
  const icon = elements.templateIcon?.value?.trim() || '📋';
  const prompt = elements.templatePrompt?.value?.trim();

  if (!name || !prompt) {
    showStatus('Name and prompt are required', 'error');
    return;
  }

  await saveTemplate({ name, icon, prompt });
  closeTemplateModal();
  loadTemplates();
  showStatus('Template saved!', 'success');
}

async function handleDeleteTemplate(id) {
  await deleteTemplate(id);
  loadTemplates();
}

// Compare view
function updateCompareView() {
  if (!lastOriginalPrompt || !lastOptimizedPrompt) {
    elements.originalDiff.innerHTML = '<em>No comparison available yet. Optimize a prompt first.</em>';
    elements.optimizedDiff.innerHTML = '';
    elements.diffStats.innerHTML = '';
    return;
  }

  const diff = createDiff(lastOriginalPrompt, lastOptimizedPrompt);

  elements.originalDiff.innerHTML = diff.originalHtml;
  elements.optimizedDiff.innerHTML = diff.optimizedHtml;

  elements.diffStats.innerHTML = `
    <span>Original: ${diff.stats.originalWords} words</span>
    <span>Optimized: ${diff.stats.optimizedWords} words</span>
    <span style="color: var(--success-color);">-${diff.stats.removed} removed</span>
    <span style="color: var(--info-color);">+${diff.stats.added} added</span>
  `;
}

// History
async function openHistory() {
  const history = await getHistory();

  if (history.length === 0) {
    elements.historyList?.classList.add('hidden');
    elements.historyEmpty?.classList.remove('hidden');
  } else {
    elements.historyList?.classList.remove('hidden');
    elements.historyEmpty?.classList.add('hidden');

    elements.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-date">${formatDate(item.timestamp)}</div>
        <div class="history-preview">${escapeHtml(item.original.substring(0, 80))}...</div>
        <div class="history-actions">
          <button class="btn btn-secondary history-use" data-id="${item.id}">Use</button>
          <button class="btn btn-secondary history-delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add handlers
    elements.historyList.querySelectorAll('.history-use').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = history.find(h => h.id === btn.dataset.id);
        if (item) {
          elements.rawPrompt.value = item.original;
          elements.optimizedPrompt.value = item.optimized;
          lastOriginalPrompt = item.original;
          lastOptimizedPrompt = item.optimized;
          elements.outputGroup?.classList.remove('hidden');
          updateTokenCount();
          closeHistory();
        }
      });
    });

    elements.historyList.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteHistoryItem(btn.dataset.id);
        openHistory(); // Refresh
      });
    });
  }

  elements.historyModal?.classList.remove('hidden');
}

function closeHistory() {
  elements.historyModal?.classList.add('hidden');
}

async function handleClearHistory() {
  await clearHistory();
  openHistory(); // Refresh
}

// Side panel
async function openSidePanel() {
  try {
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
  } catch (error) {
    showStatus('Side panel not available', 'warning');
  }
}

// Settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Utilities
function setLoading(loading) {
  if (elements.optimizeBtn) {
    elements.optimizeBtn.disabled = loading;
    const btnText = elements.optimizeBtn.querySelector('.btn-text');
    const spinner = elements.optimizeBtn.querySelector('.spinner');

    if (btnText) btnText.textContent = loading ? 'Optimizing...' : 'Optimize';
    spinner?.classList.toggle('hidden', !loading);
  }
}

function showStatus(message, type) {
  if (!elements.status) return;

  elements.status.textContent = message;
  elements.status.className = `status ${type}`;

  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
