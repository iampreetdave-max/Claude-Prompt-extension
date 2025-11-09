// extension/src/popup.js
'use strict';

import { loadPreferences } from './utils/storage.js';
import { assemblePayload } from './utils/assemblePayload.js';

const elements = {
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

let uploadedFiles = [];

// File upload handler
elements.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);

  uploadedFiles = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      const ext = file.name.split('.').pop() || '';

      return {
        name: file.name,
        ext: ext,
        text: text,
        truncated: text.length > 50000
      };
    })
  );

  renderFileList();
});

function renderFileList() {
  if (uploadedFiles.length === 0) {
    elements.fileList.innerHTML = '';
    return;
  }

  elements.fileList.innerHTML = uploadedFiles
    .map((f, i) => `
      <div class="file-item">
        <span>${f.name}</span>
        <button class="remove-file" data-index="${i}">×</button>
      </div>
    `)
    .join('');

  // Add remove handlers
  elements.fileList.querySelectorAll('.remove-file').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      uploadedFiles.splice(index, 1);
      renderFileList();

      // Reset file input
      elements.fileInput.value = '';
    });
  });
}

// Optimize button handler
elements.optimizeBtn.addEventListener('click', async () => {
  const rawPrompt = elements.rawPrompt.value.trim();

  if (!rawPrompt) {
    showStatus('Please enter a prompt', 'error');
    return;
  }

  setLoading(true);
  showStatus('Optimizing...', 'info');

  try {
    // Load preferences
    const prefs = await loadPreferences();

    // Scrape Claude tab if requested
    let scrapedFilenames = [];
    if (elements.scrapeClaude.checked) {
      scrapedFilenames = await scrapeClaudeTab();
    }

    // Assemble payload
    const payload = assemblePayload(rawPrompt, prefs, scrapedFilenames, uploadedFiles);

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: 'OPTIMIZE',
      payload: payload
    });

    if (response.ok) {
      elements.optimizedPrompt.value = response.prompt;
      elements.outputGroup.classList.remove('hidden');
      showStatus('Optimization complete!', 'success');
    } else {
      showStatus(response.error || 'Optimization failed', 'error');
    }

  } catch (error) {
    console.error('Error:', error);
    showStatus(error.message || 'An error occurred', 'error');
  } finally {
    setLoading(false);
  }
});

// Copy button handler
elements.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(elements.optimizedPrompt.value);
    showStatus('Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy', 'error');
  }
});

/**
 * Scrape filenames from Claude tab
 */
async function scrapeClaudeTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || !tab.url.includes('claude.ai')) {
      showStatus('Not on a Claude tab', 'error');
      return [];
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_CLAUDE_FILES' });
    return response.filenames || [];

  } catch (error) {
    console.error('Scrape error:', error);
    showStatus('Could not scrape Claude tab', 'error');
    return [];
  }
}

/**
 * Set loading state
 */
function setLoading(isLoading) {
  elements.optimizeBtn.disabled = isLoading;
  const btnText = elements.optimizeBtn.querySelector('.btn-text');
  const spinner = elements.optimizeBtn.querySelector('.spinner');

  if (isLoading) {
    btnText.textContent = 'Optimizing...';
    spinner.classList.remove('hidden');
  } else {
    btnText.textContent = 'Optimize with Gemini';
    spinner.classList.add('hidden');
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;

  setTimeout(() => {
    elements.status.className = 'status';
  }, 3000);
}
