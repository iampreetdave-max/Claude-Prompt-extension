// extension/src/utils/aiProviders.js
'use strict';

/**
 * Multi-provider AI client
 * Supports: Gemini (free), OpenAI, Ollama (local)
 */

const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    free: true
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    free: false
  },
  ollama: {
    name: 'Ollama (Local)',
    model: 'llama3.2',
    endpoint: '/api/generate',
    free: true
  }
};

/**
 * Generate optimized prompt using selected provider
 * @param {string} prompt - The assembled prompt
 * @param {object} config - Provider configuration
 * @returns {Promise<string>} Optimized prompt
 */
export async function generateWithProvider(prompt, config) {
  const { provider, apiKey, openaiKey, ollamaUrl } = config;

  switch (provider) {
    case 'gemini':
      return generateWithGemini(prompt, apiKey);
    case 'openai':
      return generateWithOpenAI(prompt, openaiKey);
    case 'ollama':
      return generateWithOllama(prompt, ollamaUrl);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Generate with Gemini API
 */
async function generateWithGemini(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const url = `${PROVIDERS.gemini.endpoint}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        topP: 0.9
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    })
  });

  if (!response.ok) {
    await handleGeminiError(response);
  }

  const data = await response.json();

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
  }

  if (!data.candidates?.[0]?.content?.parts) {
    throw new Error('No response from Gemini API');
  }

  const text = data.candidates[0].content.parts
    .filter(p => p.text)
    .map(p => p.text)
    .join('\n');

  return cleanResponse(text);
}

/**
 * Generate with OpenAI API
 */
async function generateWithOpenAI(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const response = await fetch(PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: PROVIDERS.openai.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (response.status === 429) {
      throw new Error('OpenAI rate limit exceeded');
    } else if (response.status === 402) {
      throw new Error('OpenAI quota exceeded - add billing');
    }
    throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (!text) {
    throw new Error('No response from OpenAI');
  }

  return cleanResponse(text);
}

/**
 * Generate with Ollama (local)
 */
async function generateWithOllama(prompt, baseUrl) {
  const url = `${baseUrl || 'http://localhost:11434'}/api/generate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: PROVIDERS.ollama.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 4096
        }
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model "${PROVIDERS.ollama.model}" not found. Run: ollama pull ${PROVIDERS.ollama.model}`);
      }
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return cleanResponse(data.response || '');

  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to Ollama. Make sure it is running on ' + (baseUrl || 'http://localhost:11434'));
    }
    throw error;
  }
}

/**
 * Handle Gemini API errors
 */
async function handleGeminiError(response) {
  const error = await response.json().catch(() => ({}));
  const message = error.error?.message || '';

  if (response.status === 400) {
    throw new Error('Invalid request. Check your prompt.');
  } else if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid Gemini API key');
  } else if (response.status === 429) {
    throw new Error('Rate limit: 15 req/min for free tier. Wait and retry.');
  } else if (response.status >= 500) {
    throw new Error('Gemini API is temporarily unavailable');
  }
  throw new Error(message || `API error: ${response.status}`);
}

/**
 * Clean up response - remove meta-commentary
 */
function cleanResponse(text) {
  let result = text.trim();

  // Remove common prefixes
  const prefixes = [
    /^Here['']s the optimized prompt:?\s*/i,
    /^Optimized prompt:?\s*/i,
    /^Here is the optimized version:?\s*/i,
    /^The optimized prompt:?\s*/i,
    /^Here is your optimized prompt:?\s*/i
  ];

  for (const pattern of prefixes) {
    result = result.replace(pattern, '');
  }

  return result.trim();
}

/**
 * Test provider connection
 */
export async function testProvider(provider, config) {
  const testPrompt = 'Reply with exactly: "Connection successful"';

  try {
    switch (provider) {
      case 'gemini':
        await generateWithGemini(testPrompt, config.apiKey);
        break;
      case 'openai':
        await generateWithOpenAI(testPrompt, config.openaiKey);
        break;
      case 'ollama':
        await generateWithOllama(testPrompt, config.ollamaUrl);
        break;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get provider info
 */
export function getProviderInfo(provider) {
  return PROVIDERS[provider] || PROVIDERS.gemini;
}

/**
 * Get all providers
 */
export function getAllProviders() {
  return Object.entries(PROVIDERS).map(([id, info]) => ({
    id,
    ...info
  }));
}
