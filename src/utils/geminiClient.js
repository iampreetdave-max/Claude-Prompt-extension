// extension/src/utils/geminiClient.js
'use strict';

/**
 * Gemini API client
 */

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Generate optimized prompt using Gemini API
 * @param {string} prompt - The assembled prompt
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} Optimized prompt
 */
export async function generateOptimizedPrompt(prompt, apiKey) {
  const url = `${API_ENDPOINT}?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      topP: 0.95
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Extract text from response
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid API response format');
    }
    
    const parts = data.candidates[0].content.parts || [];
    const textParts = parts
      .filter(part => part.text)
      .map(part => part.text);
    
    if (textParts.length === 0) {
      throw new Error('No text content in API response');
    }
    
    return textParts.join('\n');
    
  } catch (error) {
    // Re-throw with more context if needed
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Check your internet connection.');
    }
    throw error;
  }
}
