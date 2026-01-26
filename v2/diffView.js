// extension/src/utils/diffView.js
'use strict';

/**
 * Simple diff utility for comparing original and optimized prompts
 */

/**
 * Create a simple word-level diff
 * @param {string} original - Original text
 * @param {string} optimized - Optimized text
 * @returns {object} Diff result with stats and HTML
 */
export function createDiff(original, optimized) {
  const originalWords = tokenize(original);
  const optimizedWords = tokenize(optimized);

  // Build word sets for comparison
  const originalSet = new Set(originalWords.map(w => w.toLowerCase()));
  const optimizedSet = new Set(optimizedWords.map(w => w.toLowerCase()));

  // Count changes
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // Generate highlighted HTML for original (show removed)
  const originalHtml = originalWords.map(word => {
    const lower = word.toLowerCase();
    if (!optimizedSet.has(lower)) {
      removed++;
      return `<span class="diff-removed">${escapeHtml(word)}</span>`;
    }
    unchanged++;
    return escapeHtml(word);
  }).join(' ');

  // Generate highlighted HTML for optimized (show added)
  const optimizedHtml = optimizedWords.map(word => {
    const lower = word.toLowerCase();
    if (!originalSet.has(lower)) {
      added++;
      return `<span class="diff-added">${escapeHtml(word)}</span>`;
    }
    return escapeHtml(word);
  }).join(' ');

  return {
    originalHtml,
    optimizedHtml,
    stats: {
      added,
      removed,
      unchanged,
      originalWords: originalWords.length,
      optimizedWords: optimizedWords.length
    }
  };
}

/**
 * Create a unified diff view
 * @param {string} original - Original text
 * @param {string} optimized - Optimized text
 * @returns {string} HTML for unified diff
 */
export function createUnifiedDiff(original, optimized) {
  const originalLines = original.split('\n');
  const optimizedLines = optimized.split('\n');

  const result = [];
  const maxLines = Math.max(originalLines.length, optimizedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || '';
    const optLine = optimizedLines[i] || '';

    if (origLine === optLine) {
      result.push(`<div class="diff-line diff-unchanged">${escapeHtml(origLine) || '&nbsp;'}</div>`);
    } else {
      if (origLine && !optimizedLines.includes(origLine)) {
        result.push(`<div class="diff-line diff-removed">- ${escapeHtml(origLine)}</div>`);
      }
      if (optLine && !originalLines.includes(optLine)) {
        result.push(`<div class="diff-line diff-added">+ ${escapeHtml(optLine)}</div>`);
      }
    }
  }

  return result.join('');
}

/**
 * Tokenize text into words
 */
function tokenize(text) {
  return text.split(/(\s+)/).filter(w => w.trim().length > 0);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Calculate similarity percentage between two texts
 * @param {string} original - Original text
 * @param {string} optimized - Optimized text
 * @returns {number} Similarity percentage (0-100)
 */
export function calculateSimilarity(original, optimized) {
  const originalWords = new Set(tokenize(original).map(w => w.toLowerCase()));
  const optimizedWords = new Set(tokenize(optimized).map(w => w.toLowerCase()));

  if (originalWords.size === 0 && optimizedWords.size === 0) return 100;
  if (originalWords.size === 0 || optimizedWords.size === 0) return 0;

  let matches = 0;
  for (const word of originalWords) {
    if (optimizedWords.has(word)) matches++;
  }

  const union = new Set([...originalWords, ...optimizedWords]);
  return Math.round((matches / union.size) * 100);
}
