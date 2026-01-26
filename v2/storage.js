// extension/src/utils/storage.js
'use strict';

/**
 * Storage utilities for Chrome extension
 * Handles preferences, history, templates, and presets
 */

const STORAGE_KEYS = {
  API_KEY: 'geminiApiKey',
  OPENAI_KEY: 'openaiApiKey',
  OLLAMA_URL: 'ollamaUrl',
  PREFERENCES: 'preferences',
  HISTORY: 'promptHistory',
  TEMPLATES: 'promptTemplates',
  PRESETS: 'presets',
  ACTIVE_PRESET: 'activePreset',
  THEME: 'theme',
  PROVIDER: 'aiProvider'
};

const MAX_HISTORY_ITEMS = 50;

// Default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'debug',
    name: 'Debug Code',
    icon: '🐛',
    prompt: 'Debug the following code. Identify the bug, explain why it occurs, and provide the corrected code:\n\n[paste code here]'
  },
  {
    id: 'explain',
    name: 'Explain Code',
    icon: '📖',
    prompt: 'Explain this code in detail. Cover what it does, how it works, and any important patterns used:\n\n[paste code here]'
  },
  {
    id: 'refactor',
    name: 'Refactor Code',
    icon: '🔧',
    prompt: 'Refactor this code to improve readability, performance, and maintainability. Explain your changes:\n\n[paste code here]'
  },
  {
    id: 'tests',
    name: 'Write Tests',
    icon: '🧪',
    prompt: 'Write comprehensive unit tests for this code. Include edge cases and use appropriate testing patterns:\n\n[paste code here]'
  },
  {
    id: 'review',
    name: 'Code Review',
    icon: '👀',
    prompt: 'Review this code for bugs, security issues, performance problems, and style. Provide specific feedback:\n\n[paste code here]'
  },
  {
    id: 'document',
    name: 'Add Documentation',
    icon: '📝',
    prompt: 'Add comprehensive documentation to this code including JSDoc/docstrings, inline comments for complex logic, and a usage example:\n\n[paste code here]'
  }
];

// Default presets
const DEFAULT_PRESETS = [
  {
    id: 'quick',
    name: 'Quick Coding',
    icon: '⚡',
    preferences: {
      noReadme: true,
      fullCode: true,
      shortSummary: true,
      preferVanilla: true
    }
  },
  {
    id: 'learning',
    name: 'Learning Mode',
    icon: '📚',
    preferences: {
      noReadme: false,
      fullCode: true,
      shortSummary: false,
      preferVanilla: false
    }
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: '📄',
    preferences: {
      noReadme: false,
      fullCode: false,
      shortSummary: false,
      preferVanilla: false
    }
  }
];

/**
 * Save preferences to chrome.storage.local
 */
export async function savePreferences(prefs) {
  const data = {
    [STORAGE_KEYS.API_KEY]: prefs.apiKey,
    [STORAGE_KEYS.OPENAI_KEY]: prefs.openaiKey,
    [STORAGE_KEYS.OLLAMA_URL]: prefs.ollamaUrl,
    [STORAGE_KEYS.PROVIDER]: prefs.provider,
    [STORAGE_KEYS.THEME]: prefs.theme,
    [STORAGE_KEYS.PREFERENCES]: {
      noReadme: prefs.noReadme,
      fullCode: prefs.fullCode,
      shortSummary: prefs.shortSummary,
      preferVanilla: prefs.preferVanilla,
      alwaysIncludeText: prefs.alwaysIncludeText,
      savedSnippets: prefs.savedSnippets,
      autoOptimize: prefs.autoOptimize
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
    chrome.storage.local.get([
      STORAGE_KEYS.API_KEY,
      STORAGE_KEYS.OPENAI_KEY,
      STORAGE_KEYS.OLLAMA_URL,
      STORAGE_KEYS.PREFERENCES,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.PROVIDER
    ], (result) => {
      const prefs = result[STORAGE_KEYS.PREFERENCES] || {};

      resolve({
        apiKey: result[STORAGE_KEYS.API_KEY] || '',
        openaiKey: result[STORAGE_KEYS.OPENAI_KEY] || '',
        ollamaUrl: result[STORAGE_KEYS.OLLAMA_URL] || 'http://localhost:11434',
        provider: result[STORAGE_KEYS.PROVIDER] || 'gemini',
        theme: result[STORAGE_KEYS.THEME] || 'auto',
        noReadme: prefs.noReadme !== false,
        fullCode: prefs.fullCode !== false,
        shortSummary: prefs.shortSummary !== false,
        preferVanilla: prefs.preferVanilla !== false,
        alwaysIncludeText: prefs.alwaysIncludeText || '',
        savedSnippets: prefs.savedSnippets || [],
        autoOptimize: prefs.autoOptimize || false
      });
    });
  });
}

/**
 * Save a prompt to history
 */
export async function saveToHistory(original, optimized) {
  const history = await getHistory();

  const entry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    original: original,
    optimized: optimized
  };

  // Add to beginning, limit size
  history.unshift(entry);
  if (history.length > MAX_HISTORY_ITEMS) {
    history.pop();
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(entry);
      }
    });
  });
}

/**
 * Get prompt history
 */
export async function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.HISTORY], (result) => {
      resolve(result[STORAGE_KEYS.HISTORY] || []);
    });
  });
}

/**
 * Clear history
 */
export async function clearHistory() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Delete a history item
 */
export async function deleteHistoryItem(id) {
  const history = await getHistory();
  const filtered = history.filter(item => item.id !== id);

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: filtered }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get templates (default + custom)
 */
export async function getTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.TEMPLATES], (result) => {
      const custom = result[STORAGE_KEYS.TEMPLATES] || [];
      resolve([...DEFAULT_TEMPLATES, ...custom]);
    });
  });
}

/**
 * Save custom template
 */
export async function saveTemplate(template) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.TEMPLATES], (result) => {
      const templates = result[STORAGE_KEYS.TEMPLATES] || [];

      const newTemplate = {
        id: 'custom_' + Date.now(),
        name: template.name,
        icon: template.icon || '📋',
        prompt: template.prompt,
        isCustom: true
      };

      templates.push(newTemplate);

      chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: templates }, () => {
        resolve(newTemplate);
      });
    });
  });
}

/**
 * Delete custom template
 */
export async function deleteTemplate(id) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.TEMPLATES], (result) => {
      const templates = result[STORAGE_KEYS.TEMPLATES] || [];
      const filtered = templates.filter(t => t.id !== id);

      chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: filtered }, () => {
        resolve();
      });
    });
  });
}

/**
 * Get presets
 */
export async function getPresets() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.PRESETS, STORAGE_KEYS.ACTIVE_PRESET], (result) => {
      const custom = result[STORAGE_KEYS.PRESETS] || [];
      const activeId = result[STORAGE_KEYS.ACTIVE_PRESET] || null;
      const all = [...DEFAULT_PRESETS, ...custom];

      resolve({
        presets: all,
        activePreset: activeId
      });
    });
  });
}

/**
 * Set active preset
 */
export async function setActivePreset(presetId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_PRESET]: presetId }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Save custom preset
 */
export async function savePreset(preset) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.PRESETS], (result) => {
      const presets = result[STORAGE_KEYS.PRESETS] || [];

      const newPreset = {
        id: 'custom_' + Date.now(),
        name: preset.name,
        icon: preset.icon || '⚙️',
        preferences: preset.preferences,
        isCustom: true
      };

      presets.push(newPreset);

      chrome.storage.local.set({ [STORAGE_KEYS.PRESETS]: presets }, () => {
        resolve(newPreset);
      });
    });
  });
}

/**
 * Export all settings
 */
export async function exportSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      const exportData = {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        data: result
      };
      resolve(JSON.stringify(exportData, null, 2));
    });
  });
}

/**
 * Import settings
 */
export async function importSettings(jsonString) {
  return new Promise((resolve, reject) => {
    try {
      const imported = JSON.parse(jsonString);

      if (!imported.version || !imported.data) {
        throw new Error('Invalid backup file format');
      }

      chrome.storage.local.set(imported.data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get theme preference
 */
export async function getTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.THEME], (result) => {
      resolve(result[STORAGE_KEYS.THEME] || 'auto');
    });
  });
}

/**
 * Set theme
 */
export async function setTheme(theme) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.THEME]: theme }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
