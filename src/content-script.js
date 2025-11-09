// extension/src/content-script.js
'use strict';

/**
 * Content script for claude.ai
 * Scrapes visible file names from the current chat
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCRAPE_CLAUDE_FILES') {
    const filenames = scrapeFilenames();
    sendResponse({ filenames: filenames });
  }
  return true;
});

/**
 * Best-effort scraping of file names from Claude interface
 * Uses multiple selectors to catch different UI states
 */
function scrapeFilenames() {
  const filenames = new Set();
  
  // Common selectors for file attachments in Claude UI
  const selectors = [
    '[data-testid*="attachment"]',
    '[data-testid*="file"]',
    '.file-pill',
    '.attachment-pill',
    'a[download]',
    '[aria-label*="file"]',
    '[aria-label*="attachment"]',
    // Look for elements that might contain file names
    'div[class*="file"]:not([class*="input"])',
    'div[class*="attachment"]:not([class*="button"])',
    'span[class*="file"]:not([class*="input"])',
    'span[class*="attachment"]:not([class*="button"])'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Try to extract filename from various sources
        const filename = extractFilename(el);
        if (filename) {
          filenames.add(filename);
        }
      });
    } catch (e) {
      // Silently skip failed selectors
    }
  });
  
  // Also check for text content that looks like filenames
  const allText = document.querySelectorAll('div, span');
  const filenameRegex = /\b[\w-]+\.(txt|js|html|css|md|json|py|java|cpp|c|rs|go|tsx|jsx|ts)\b/gi;
  
  allText.forEach(el => {
    const text = el.textContent || '';
    const matches = text.match(filenameRegex);
    if (matches) {
      matches.forEach(match => {
        // Only add if it's visible and not too long
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