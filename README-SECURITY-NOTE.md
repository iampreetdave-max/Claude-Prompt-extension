# SECURITY WARNING: API KEY EXPOSURE

⚠️ **Your Gemini API key is stored locally in the browser extension storage.**

## Risks
- Browser extensions can be inspected by anyone with local access
- Keys stored in extensions are not encrypted
- Malicious extensions could potentially read storage

## Recommendations

1. **Restrict your API key in Google AI Studio:**
   - Set IP restrictions
   - Set quota limits
   - Monitor usage regularly

2. **Optional: Use a proxy (recommended for production):**

Example Cloudflare Worker proxy:
```javascript
export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    
    const body = await request.json();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
```

3. **Never share your extension folder with others**
4. **Rotate keys regularly**