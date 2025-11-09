// extension/src/utils/storage.js
'use strict';

/**
 * Storage utilities for Chrome extension
 */

const STORAGE_KEYS = {
  API_KEY: 'geminiApiKey',
  PREFERENCES: 'preferences'
};

/**
 * Save preferences to chrome.storage.local
 */
export async function savePreferences(prefs) {
  const data = {
    [STORAGE_KEYS.API_KEY]: prefs.apiKey,
    [STORAGE_KEYS.PREFERENCES]: {
      noReadme: prefs.noReadme,
      fullCode: prefs.fullCode,
      shortSummary: prefs.shortSummary,
      preferVanilla: prefs.preferVanilla,
      alwaysIncludeText: prefs.alwaysIncludeText,
      savedSnippets: prefs.savedSnippets
    }
  };
  
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Load preferences from chrome.storage.local
 */
export async function loadPreferences() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.PREFERENCES], (result) => {
      const prefs = result[STORAGE_KEYS.PREFERENCES] || {};
      
      resolve({
        apiKey: result[STORAGE_KEYS.API_KEY] || '',
        noReadme: prefs.noReadme !== false,
        fullCode: prefs.fullCode !== false,
        shortSummary: prefs.shortSummary !== false,
        preferVanilla: prefs.preferVanilla !== false,
        alwaysIncludeText: prefs.alwaysIncludeText || '',
        savedSnippets: prefs.savedSnippets || []
      });
    });
  });
}