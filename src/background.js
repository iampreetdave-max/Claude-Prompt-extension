// extension/src/background.js
'use strict';

import { loadPreferences } from './utils/storage.js';
import { generateOptimizedPrompt } from './utils/geminiClient.js';

/**
 * Service worker for handling API calls
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPTIMIZE') {
    handleOptimize(request.payload)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

/**
 * Handle optimization request
 */
async function handleOptimize(payload) {
  try {
    // Load API key
    const prefs = await loadPreferences();
    
    if (!prefs.apiKey) {
      return { ok: false, error: 'API key not configured. Please set it in Options.' };
    }
    
    // Call Gemini API
    const optimizedPrompt = await generateOptimizedPrompt(payload, prefs.apiKey);
    
    return { ok: true, prompt: optimizedPrompt };
    
  } catch (error) {
    console.error('Optimization error:', error);
    
    // Parse error message for user-friendly display
    let errorMessage = error.message;
    
    if (errorMessage.includes('403')) {
      errorMessage = 'API key invalid or restricted. Check Options > API key';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('quota')) {
      errorMessage = 'API quota exceeded. Check your Google AI Studio dashboard.';
    }
    
    return { ok: false, error: errorMessage };
  }
}