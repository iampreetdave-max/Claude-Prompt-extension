'use strict';

import { loadPreferences } from './utils/storage.js';
import { assemblePayload } from './utils/assemblePayload.js';
import { generateOptimizedPrompt } from './utils/geminiClient.js';

let elements = {};
let attachedFiles = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Initialize elements after DOM is loaded
  elements = {
    rawPrompt: document.getElementById('rawPrompt'),
    scrapeClaude: document.getElementById('scrapeClaude'),
    fileInput: document.getElementById('fileInput'),
    fileList: document.getElementById('fileList'),
    optimizeBtn: document.getElementById('optimizeBtn'),
    status: document.getElementById('status'),
    outputGroup: document.getElementById('outputGroup'),
    optimizedPrompt: document.getElementById('optimizedPrompt'),
    copyBtn: document.getElementById('copyBtn')
  };

  // Check if all required elements exist
  if (!elements.rawPrompt || !elements.optimizeBtn) {
    console.error('Required elements not found in popup.html');
    return;
  }

  // Set up event listeners only if elements exist
  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', handleFileSelect);
  }

  if (elements.optimizeBtn) {
    elements.optimizeBtn.addEventListener('click', handleOptimize);
  }

  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', handleCopy);
  }
});

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  attachedFiles = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      attachedFiles.push({
        name: file.name,
        content: e.target.result
      });
      updateFileList();
    };
    reader.readAsText(file);
  });
}

function updateFileList() {
  if (!elements.fileList) return;

  elements.fileList.innerHTML = '';
  attachedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.textContent = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-file';
    removeBtn.addEventListener('click', () => {
      attachedFiles.splice(index, 1);
      updateFileList();
    });

    fileItem.appendChild(removeBtn);
    elements.fileList.appendChild(fileItem);
  });
}

async function handleOptimize() {
  if (!elements.rawPrompt || !elements.optimizeBtn) return;

  const rawPrompt = elements.rawPrompt.value.trim();

  if (!rawPrompt) {
    showStatus('Please enter a prompt', 'error');
    return;
  }

  // Show loading state
  elements.optimizeBtn.disabled = true;
  const btnText = elements.optimizeBtn.querySelector('.btn-text');
  if (btnText) {
    btnText.textContent = 'Optimizing...';
  }
  const spinner = elements.optimizeBtn.querySelector('.spinner');
  if (spinner) {
    spinner.classList.remove('hidden');
  }

  try {
    const prefs = await loadPreferences();

    if (!prefs.apiKey) {
      showStatus('Please set your Gemini API key in the options page', 'error');
      openOptionsPage();
      return;
    }

    // Get Claude context if checkbox is checked
    let claudeContext = '';
    if (elements.scrapeClaude && elements.scrapeClaude.checked) {
      claudeContext = await scrapeClaudeTab();
    }

    // Assemble the payload
    const payload = assemblePayload(
      rawPrompt,
      prefs,
      claudeContext ? [claudeContext] : [],
      attachedFiles
    );

    // Call Gemini API
    const optimized = await generateOptimizedPrompt(payload, prefs.apiKey);

    // Show results
    if (elements.optimizedPrompt) {
      elements.optimizedPrompt.value = optimized;
    }
    if (elements.outputGroup) {
      elements.outputGroup.classList.remove('hidden');
    }

    showStatus('Prompt optimized successfully!', 'success');

  } catch (error) {
    console.error('Optimization error:', error);
    showStatus(error.message || 'Failed to optimize prompt', 'error');
  } finally {
    // Reset button state
    if (elements.optimizeBtn) {
      elements.optimizeBtn.disabled = false;
      const btnText = elements.optimizeBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Optimize with Gemini';
      }
      const spinner = elements.optimizeBtn.querySelector('.spinner');
      if (spinner) {
        spinner.classList.add('hidden');
      }
    }
  }
}

async function scrapeClaudeTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('claude.ai')) {
      showStatus('Active tab is not a Claude tab', 'warning');
      return '';
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract conversation context from Claude UI
        const messages = document.querySelectorAll('[data-testid*="message"]');
        let context = '';
        messages.forEach(msg => {
          context += msg.textContent + '\n\n';
        });
        return context;
      }
    });

    return results[0]?.result || '';
  } catch (error) {
    console.error('Failed to scrape Claude tab:', error);
    return '';
  }
}

function handleCopy() {
  if (!elements.optimizedPrompt) return;

  const text = elements.optimizedPrompt.value;
  navigator.clipboard.writeText(text).then(() => {
    showStatus('Copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showStatus('Failed to copy to clipboard', 'error');
  });
}

function showStatus(message, type) {
  if (!elements.status) return;

  elements.status.textContent = message;
  elements.status.className = `status ${type}`;

  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}

function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}
