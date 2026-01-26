// extension/src/content-script.js
'use strict';

/**
 * Content script for claude.ai
 * Handles file scraping, prompt injection, and keyboard triggers
 */

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCRAPE_CLAUDE_FILES') {
    const filenames = scrapeFilenames();
    sendResponse({ filenames });
  }

  if (request.type === 'GET_PROMPT') {
    const prompt = getPromptText();
    sendResponse({ prompt });
  }

  if (request.type === 'SET_PROMPT') {
    const success = setPromptText(request.text);
    sendResponse({ success });
  }

  if (request.type === 'TRIGGER_OPTIMIZE') {
    // Open the extension popup via keyboard shortcut
    // This is handled by the background script
    sendResponse({ received: true });
  }

  return true;
});

/**
 * Get text from Claude's input field
 */
function getPromptText() {
  const selectors = [
    '[data-placeholder="How can Claude help you today?"]',
    'div[contenteditable="true"]',
    '.ProseMirror',
    '[role="textbox"]',
    'textarea'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el.textContent || el.innerText || el.value || '';
    }
  }

  return '';
}

/**
 * Set text in Claude's input field
 */
function setPromptText(text) {
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
      if (el.innerHTML !== undefined) {
        el.innerHTML = '';
      }

      // Insert text
      document.execCommand('insertText', false, text);

      // Dispatch input event
      el.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    }
  }

  return false;
}

/**
 * Scrape file names from Claude interface
 */
function scrapeFilenames() {
  const filenames = new Set();

  // Selectors for file attachments
  const selectors = [
    '[data-testid*="attachment"]',
    '[data-testid*="file"]',
    '.file-pill',
    '.attachment-pill',
    'a[download]',
    '[aria-label*="file"]',
    '[aria-label*="attachment"]',
    'div[class*="file"]:not([class*="input"])',
    'div[class*="attachment"]:not([class*="button"])',
    'span[class*="file"]:not([class*="input"])'
  ];

  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        const filename = extractFilename(el);
        if (filename) {
          filenames.add(filename);
        }
      });
    } catch (e) {
      // Skip failed selectors
    }
  });

  // Look for filename patterns in visible text
  const filenameRegex = /\b[\w-]+\.(txt|js|ts|jsx|tsx|html|css|md|json|py|java|cpp|c|rs|go|sql|sh|yaml|yml|xml|php|rb|swift|kt)\b/gi;

  document.querySelectorAll('div, span, p').forEach(el => {
    const text = el.textContent || '';
    const matches = text.match(filenameRegex);
    if (matches) {
      matches.forEach(match => {
        if (match.length < 100 && isElementVisible(el)) {
          filenames.add(match);
        }
      });
    }
  });

  return Array.from(filenames);
}

/**
 * Extract filename from an element
 */
function extractFilename(element) {
  // Check download attribute
  if (element.hasAttribute('download')) {
    return element.getAttribute('download');
  }

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.includes('.')) {
    const match = ariaLabel.match(/[\w-]+\.\w+/);
    if (match) return match[0];
  }

  // Check text content
  const text = element.textContent?.trim();
  if (text && text.includes('.') && text.length < 100) {
    const match = text.match(/[\w-]+\.\w+/);
    if (match) return match[0];
  }

  // Check title attribute
  const title = element.getAttribute('title');
  if (title && title.includes('.')) {
    const match = title.match(/[\w-]+\.\w+/);
    if (match) return match[0];
  }

  return null;
}

/**
 * Check if element is visible
 */
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

// Notify that content script is ready
console.log('[Claude Optimizer] Content script loaded');
