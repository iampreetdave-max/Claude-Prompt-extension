// extension/src/options.js
'use strict';

import { savePreferences, loadPreferences } from './utils/storage.js';

let elements = {};
let snippets = [];

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize elements after DOM is loaded
  elements = {
    apiKey: document.getElementById('apiKey'),
    noReadme: document.getElementById('noReadme'),
    fullCode: document.getElementById('fullCode'),
    shortSummary: document.getElementById('shortSummary'),
    preferVanilla: document.getElementById('preferVanilla'),
    alwaysInclude: document.getElementById('alwaysInclude'),
    snippetsList: document.getElementById('snippetsList'),
    addSnippet: document.getElementById('addSnippet'),
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status')
  };

  // Check if required elements exist
  if (!elements.apiKey || !elements.saveBtn) {
    console.error('Required elements not found in options.html');
    return;
  }

  const prefs = await loadPreferences();

  if (elements.apiKey) elements.apiKey.value = prefs.apiKey || '';
  if (elements.noReadme) elements.noReadme.checked = prefs.noReadme !== false;
  if (elements.fullCode) elements.fullCode.checked = prefs.fullCode !== false;
  if (elements.shortSummary) elements.shortSummary.checked = prefs.shortSummary !== false;
  if (elements.preferVanilla) elements.preferVanilla.checked = prefs.preferVanilla !== false;
  if (elements.alwaysInclude) elements.alwaysInclude.value = prefs.alwaysIncludeText || '';

  snippets = prefs.savedSnippets || [];
  renderSnippets();

  // Set up event listeners after elements are initialized
  if (elements.saveBtn) {
    elements.saveBtn.addEventListener('click', async () => {
      if (!elements.apiKey) return;

      const prefs = {
        apiKey: elements.apiKey.value.trim(),
        noReadme: elements.noReadme?.checked ?? true,
        fullCode: elements.fullCode?.checked ?? true,
        shortSummary: elements.shortSummary?.checked ?? true,
        preferVanilla: elements.preferVanilla?.checked ?? true,
        alwaysIncludeText: elements.alwaysInclude?.value.trim() ?? '',
        savedSnippets: snippets
      };

      try {
        await savePreferences(prefs);
        showStatus('Settings saved successfully!', 'success');
      } catch (error) {
        showStatus('Failed to save settings', 'error');
      }
    });
  }

  // Snippet management
  if (elements.addSnippet) {
    elements.addSnippet.addEventListener('click', () => {
      snippets.push('');
      renderSnippets();
    });
  }
});

function renderSnippets() {
  if (!elements.snippetsList) return;

  elements.snippetsList.innerHTML = '';

  snippets.forEach((snippet, index) => {
    const div = document.createElement('div');
    div.className = 'snippet-item';

    const textarea = document.createElement('textarea');
    textarea.value = snippet;
    textarea.placeholder = 'Enter snippet text...';
    textarea.addEventListener('input', (e) => {
      snippets[index] = e.target.value;
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      snippets.splice(index, 1);
      renderSnippets();
    });

    div.appendChild(textarea);
    div.appendChild(removeBtn);
    elements.snippetsList.appendChild(div);
  });
}

function showStatus(message, type) {
  if (!elements.status) return;

  elements.status.textContent = message;
  elements.status.className = `status ${type}`;

  setTimeout(() => {
    if (elements.status) {
      elements.status.className = 'status';
    }
  }, 3000);
}