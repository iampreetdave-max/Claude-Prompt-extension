// extension/src/utils/tokenCounter.js
'use strict';

/**
 * Token counter utility
 * Uses approximation since we don't have access to actual tokenizers
 * Claude uses ~4 characters per token on average for English text
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count for text
 * @param {string} text - Text to count tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text) return 0;

  // More accurate estimation considering:
  // - Words (split by spaces)
  // - Special characters
  // - Code patterns

  const words = text.split(/\s+/).filter(w => w.length > 0);
  let tokens = 0;

  for (const word of words) {
    if (word.length <= 4) {
      tokens += 1;
    } else if (word.length <= 8) {
      tokens += 2;
    } else if (word.length <= 12) {
      tokens += 3;
    } else {
      tokens += Math.ceil(word.length / 4);
    }
  }

  // Add tokens for special characters and punctuation
  const specialChars = text.match(/[{}()\[\]<>:;,."'`~!@#$%^&*+=|\\/?-]/g) || [];
  tokens += Math.ceil(specialChars.length / 2);

  // Add tokens for newlines
  const newlines = text.match(/\n/g) || [];
  tokens += newlines.length;

  return Math.max(1, tokens);
}

/**
 * Format token count for display
 * @param {number} tokens - Token count
 * @returns {string} Formatted string
 */
export function formatTokenCount(tokens) {
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + 'k';
  }
  return tokens.toString();
}

/**
 * Calculate token savings
 * @param {number} original - Original token count
 * @param {number} optimized - Optimized token count
 * @returns {object} Savings info
 */
export function calculateSavings(original, optimized) {
  const diff = original - optimized;
  const percentage = original > 0 ? Math.round((diff / original) * 100) : 0;

  return {
    saved: diff,
    percentage: percentage,
    isReduction: diff > 0
  };
}

/**
 * Get cost estimate (rough approximation)
 * Based on Claude's pricing: ~$3 per 1M input tokens
 * @param {number} tokens - Token count
 * @returns {string} Cost estimate
 */
export function estimateCost(tokens) {
  const costPerMillion = 3; // $3 per 1M tokens (approximate)
  const cost = (tokens / 1000000) * costPerMillion;

  if (cost < 0.001) {
    return '<$0.001';
  } else if (cost < 0.01) {
    return '$' + cost.toFixed(4);
  } else {
    return '$' + cost.toFixed(3);
  }
}
