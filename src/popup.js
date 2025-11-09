'use strict';

import { savePreferences, loadPreferences } from './utils/storage.js';

const elements = {
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

let snippets = [];

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  const prefs = await loadPreferences();
  
  elements.apiKey.value = prefs.apiKey || '';
  elements.noReadme.checked = prefs.noReadme !== false;
  elements.fullCode.checked = prefs.fullCode !== false;
  elements.shortSummary.checked = prefs.shortSummary !== false;
  elements.preferVanilla.checked = prefs.preferVanilla !== false;
  elements.alwaysInclude.value = prefs.alwaysIncludeText || '';
  
  snippets = prefs.savedSnippets || [];
  renderSnippets();
});

// Save settings
elements.saveBtn.addEventListener('click', async () => {
  const prefs = {
    apiKey: elements.apiKey.value.trim(),
    noReadme: elements.noReadme.checked,
    fullCode: elements.fullCode.checked,
    shortSummary: elements.shortSummary.checked,
    preferVanilla: elements.preferVanilla.checked,
    alwaysIncludeText: elements.alwaysInclude.value.trim(),
    savedSnippets: snippets
  };
  
  try {
    await savePreferences(prefs);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings', 'error');
  }
});

// Snippet management
elements.addSnippet.addEventListener('click', () => {
  snippets.push('');
  renderSnippets();
});

function renderSnippets() {
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
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  
  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}