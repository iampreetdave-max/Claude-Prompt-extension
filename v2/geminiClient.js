// extension/src/utils/geminiClient.js
'use strict';

/**
 * Gemini API client for free tier usage
 * Uses gemini-1.5-flash which has generous free quota
 */

// Free tier compatible model
const MODEL = 'gemini-1.5-flash';
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Generate optimized prompt using Gemini API
 * @param {string} prompt - The assembled prompt
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} Optimized prompt
 */
export async function generateOptimizedPrompt(prompt, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is required. Please configure it in Settings.');
  }

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
      // Lower temperature for more consistent, focused output
      temperature: 0.4,
      // Sufficient for prompt optimization (free tier friendly)
      maxOutputTokens: 4096,
      topP: 0.9,
      topK: 40
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ]
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
      const errorMessage = errorData.error?.message || '';

      // Provide user-friendly error messages
      if (response.status === 400) {
        throw new Error('Invalid request. Please check your prompt and try again.');
      } else if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Free tier allows 15 requests/minute. Please wait and try again.');
      } else if (response.status === 500 || response.status === 503) {
        throw new Error('Gemini API is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(errorMessage || `API error: ${response.status}`);
      }
    }

    const data = await response.json();

    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}. Try rephrasing your prompt.`);
    }

    // Extract text from response
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      // Check if there's a finish reason that indicates an issue
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Response blocked by safety filters. Try rephrasing your prompt.');
      } else if (finishReason === 'RECITATION') {
        throw new Error('Response blocked due to recitation concerns.');
      }
      throw new Error('No response from Gemini API. Please try again.');
    }

    const parts = data.candidates[0].content.parts || [];
    const textParts = parts
      .filter(part => part.text)
      .map(part => part.text);

    if (textParts.length === 0) {
      throw new Error('Empty response from Gemini API. Please try again.');
    }

    // Clean up the response - remove any meta-commentary Gemini might add
    let result = textParts.join('\n').trim();

    // Remove common prefixes that Gemini might add
    const prefixPatterns = [
      /^Here['']s the optimized prompt:?\s*/i,
      /^Optimized prompt:?\s*/i,
      /^Here is the optimized version:?\s*/i,
      /^The optimized prompt:?\s*/i
    ];

    for (const pattern of prefixPatterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();

  } catch (error) {
    // Re-throw with more context if needed
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}
