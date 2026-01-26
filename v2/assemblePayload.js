// extension/src/utils/assemblePayload.js
'use strict';

/**
 * Assemble the payload for Gemini API
 * Uses best practices for Claude prompt engineering
 */

/**
 * Create the complete prompt for Gemini to optimize for Claude
 * @param {string} rawPrompt - User's raw prompt
 * @param {Object} prefs - User preferences
 * @param {string[]} scrapedFilenames - Filenames from Claude tab
 * @param {Object[]} embeddedFiles - Uploaded files with content
 * @returns {string} Complete prompt for Gemini
 */
export function assemblePayload(rawPrompt, prefs, scrapedFilenames, embeddedFiles) {
  const parts = [];

  // System instruction with Claude best practices
  parts.push(`ROLE: You are an expert prompt engineer specializing in optimizing prompts for Claude (Anthropic's AI assistant).

YOUR TASK: Transform the user's raw prompt into an optimized, Claude-ready prompt that will yield the best possible results.

CLAUDE PROMPT BEST PRACTICES TO APPLY:

1. STRUCTURE AND CLARITY:
   - Use clear sections with headers (using markdown)
   - Put the most important instruction first
   - Use XML-style tags for complex inputs (e.g., <context>, <requirements>, <examples>)
   - Be specific about the desired output format

2. CONTEXT SETTING:
   - Provide relevant background upfront
   - Define the role/persona if applicable (e.g., "You are a senior software engineer...")
   - Specify the target audience for the output

3. EXPLICIT CONSTRAINTS:
   - State what NOT to do (negative constraints are powerful)
   - Specify length/format requirements
   - List any technologies, patterns, or approaches to prefer/avoid

4. CODE-SPECIFIC RULES:
${prefs.noReadme ? '   - Do NOT include README files or documentation unless explicitly needed' : ''}
${prefs.fullCode ? '   - Always provide complete, runnable code (no placeholders, no "// rest of code here")' : ''}
${prefs.fullCode ? '   - Include all imports, dependencies, and boilerplate' : ''}
${prefs.preferVanilla ? '   - Prefer vanilla JavaScript and standard web APIs when possible' : ''}
${prefs.preferVanilla ? '   - For browser extensions, use Chrome Manifest V3' : ''}
${prefs.shortSummary ? '   - Keep explanations minimal; code should be self-documenting' : ''}
${prefs.shortSummary ? '   - Add a brief 2-3 line summary at the end only' : ''}

5. OUTPUT OPTIMIZATION:
   - Request structured output when appropriate
   - Ask for step-by-step reasoning for complex tasks
   - Include success criteria if applicable

TRANSFORMATION RULES:
- Make vague requests specific
- Add missing context that Claude would need
- Remove redundant or filler words
- Ensure the prompt is self-contained
- Add format specifications (code blocks, bullet points, etc.)
- If files are referenced, include clear instructions on how to use them

OUTPUT FORMAT:
Return ONLY the optimized prompt text that can be directly pasted into Claude.
Do not include any meta-commentary, explanations, or "Here's the optimized prompt:" prefixes.
The output should be the prompt itself, ready to use.`);

  // Raw prompt section
  parts.push(`

---
RAW PROMPT TO OPTIMIZE:
---
${rawPrompt}`);

  // Always include text
  if (prefs.alwaysIncludeText && prefs.alwaysIncludeText.trim()) {
    parts.push(`

---
ADDITIONAL INSTRUCTIONS TO INCORPORATE:
---
${prefs.alwaysIncludeText}`);
  }

  // Saved snippets
  if (prefs.savedSnippets && prefs.savedSnippets.length > 0) {
    const validSnippets = prefs.savedSnippets.filter(s => s && s.trim());
    if (validSnippets.length > 0) {
      parts.push(`

---
CONTEXT SNIPPETS (incorporate if relevant):
---
${validSnippets.join('\n\n---\n\n')}`);
    }
  }

  // Detected Claude files
  if (scrapedFilenames && scrapedFilenames.length > 0) {
    parts.push(`

---
FILES DETECTED IN CLAUDE CONTEXT:
---
${scrapedFilenames.join(', ')}

Note: Reference these files appropriately in the optimized prompt if they are relevant to the task.`);
  }

  // Embedded files
  if (embeddedFiles && embeddedFiles.length > 0) {
    parts.push(`

---
EMBEDDED FILES (include as context in the optimized prompt):
---`);

    embeddedFiles.forEach(file => {
      const lang = getLanguageFromExt(file.ext);
      parts.push(`
=== ${file.name} ===`);
      parts.push('```' + lang);

      if (file.truncated) {
        const lines = file.text.split('\n');
        const preview = lines.slice(0, 50).join('\n');
        parts.push(preview);
        parts.push(`\n... [TRUNCATED: showing 50 of ${lines.length} lines]`);
      } else {
        parts.push(file.text);
      }

      parts.push('```');
    });
  }

  return parts.join('\n');
}

/**
 * Map file extension to language identifier for code blocks
 */
function getLanguageFromExt(ext) {
  const langMap = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'txt': 'text'
  };

  return langMap[ext?.toLowerCase()] || ext || 'text';
}
