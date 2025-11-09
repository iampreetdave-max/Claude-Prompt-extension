// extension/src/utils/assemblePayload.js
'use strict';

/**
 * Assemble the payload for Gemini API
 */

/**
 * Create the complete prompt for Gemini
 * @param {string} rawPrompt - User's raw prompt
 * @param {Object} prefs - User preferences
 * @param {string[]} scrapedFilenames - Filenames from Claude tab
 * @param {Object[]} embeddedFiles - Uploaded files with content
 * @returns {string} Complete prompt for Gemini
 */
export function assemblePayload(rawPrompt, prefs, scrapedFilenames, embeddedFiles) {
  const parts = [];
  
  // System instruction
  parts.push(`ROLE: You optimize prompts for downstream coding LLMs (Claude, etc.).
GOAL: Rewrite the user's raw prompt into a concise, token-efficient, model-agnostic instruction that reliably yields end-to-end code and a tiny closing summary.

HARD RULES:
${prefs.noReadme ? '- Do NOT ask for a README and do NOT generate one.' : ''}
${prefs.fullCode ? '- Require full, runnable code with a clear file tree and code blocks for each file.' : ''}
${prefs.preferVanilla ? '- Prefer Chrome MV3 + vanilla HTML/CSS/JS when applicable; otherwise choose mainstream stacks.' : ''}
${prefs.shortSummary ? '- Keep explanations minimal; add a few-line summary at the end only.' : ''}
- If files are attached below, refer to them by filename and include essential snippets where needed.
- Avoid generic filler; reduce tokens.

OUTPUT: A single Claude-ready prompt that the user can paste as-is.`);
  
  // Raw prompt
  parts.push(`\n\nRaw Prompt:\n${rawPrompt}`);
  
  // Always include text
  if (prefs.alwaysIncludeText) {
    parts.push(`\n\nAlways Include Instructions:\n${prefs.alwaysIncludeText}`);
  }
  
  // Saved snippets
  if (prefs.savedSnippets && prefs.savedSnippets.length > 0) {
    const validSnippets = prefs.savedSnippets.filter(s => s.trim());
    if (validSnippets.length > 0) {
      parts.push(`\n\nSaved Snippets to Consider:\n${validSnippets.join('\n---\n')}`);
    }
  }
  
  // Detected Claude files
  if (scrapedFilenames && scrapedFilenames.length > 0) {
    parts.push(`\n\nDetected Claude Files (names only):\n${scrapedFilenames.join(', ')}`);
  }
  
  // Embedded files
  if (embeddedFiles && embeddedFiles.length > 0) {
    parts.push('\n\nEmbedded Files:');
    
    embeddedFiles.forEach(file => {
      parts.push(`\n=== FILE: ${file.name}`);
      parts.push(`\`\`\`${file.ext}`);
      
      if (file.truncated) {
        // Show first part and indicate truncation
        const lines = file.text.split('\n');
        const preview = lines.slice(0, 50).join('\n');
        parts.push(preview);
        parts.push(`\n... [TRUNCATED - ${lines.length} total lines]`);
      } else {
        parts.push(file.text);
      }
      
      parts.push('```');
    });
  }
  
  return parts.join('\n');
}