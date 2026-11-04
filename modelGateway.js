// modelGateway.js - unified AI provider gateway.
// Supported: OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama.
// All system prompts are English-only. No provider is ever simulated: a
// provider without a stored key reports NOT_CONFIGURED and calls fail honestly.
const https = require('https');
const store = require('./persistence');
const vault = require('./keyVault');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', envKey: 'OPENAI_API_KEY' },
  { id: 'anthropic', label: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'gemini', label: 'Gemini', envKey: 'GEMINI_API_KEY' },
  { id: 'groq', label: 'Groq', envKey: 'GROQ_API_KEY' },
  { id: 'openrouter', label: 'OpenRouter', envKey: 'OPENROUTER_API_KEY' },
  { id: 'ollama', label: 'Ollama (local)', envKey: null },
];

function storedKey(providerId) {
  const rec = store.find('keys', (k) => k.providerId === providerId);
  if (rec) {
    const pt = vault.decrypt(rec);
    if (pt) return pt;
  }
  const envKey = (PROVIDERS.find((p) => p.id === providerId) || {}).envKey;
  return envKey ? (process.env[envKey] || null) : null;
}

function storeKey(providerId, plaintext) {
  const enc = vault.encrypt(plaintext);
  const existing = store.find('keys', (k) => k.providerId === providerId);
  if (existing) return store.update('keys', (k) => k.providerId === providerId, { ...enc, providerId });
  return store.insert('keys', { providerId, ...enc });
}

function deleteKey(providerId) {
  return store.remove('keys', (k) => k.providerId === providerId);
}

function listStoredKeyIds() {
  return store.all('keys').map((k) => k.providerId);
}

/** Honest provider states: CONNECTED (key available) or NOT_CONFIGURED. */
function providerStates() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    state: p.id === 'ollama' ? 'CONNECTED' : (storedKey(p.id) ? 'CONNECTED' : 'NOT_CONFIGURED'),
  }));
}

// --- raw HTTP helper (no fetch dependency; Node 20 https) ---
function postJson(url, headers, body, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: timeoutMs,
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`Provider HTTP ${res.statusCode}: ${out.slice(0, 300)}`));
        }
        try { resolve(JSON.parse(out)); } catch { reject(new Error('Provider returned invalid JSON.')); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Provider request timed out.')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/** Call a provider with a chat-style prompt. Returns plain text output. */
async function callProvider(providerId, { system, user }, model) {
  switch (providerId) {
    case 'openai':
    case 'groq':
    case 'openrouter': {
      const url = providerId === 'openai' ? 'https://api.openai.com/v1/chat/completions'
        : providerId === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      const key = storedKey(providerId);
      if (!key) throw Object.assign(new Error(`Provider ${providerId} is NOT_CONFIGURED (no API key stored).`), { state: 'NOT_CONFIGURED' });
      const res = await postJson(url, { Authorization: `Bearer ${key}` }, {
        model: model || (providerId === 'groq' ? 'llama-3.1-8b-instant' : providerId === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'),
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 1500,
      });
      return (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) || '';
    }
    case 'anthropic': {
      const key = storedKey('anthropic');
      if (!key) throw Object.assign(new Error('Provider anthropic is NOT_CONFIGURED (no API key stored).'), { state: 'NOT_CONFIGURED' });
      const res = await postJson('https://api.anthropic.com/v1/messages', {
        'x-api-key': key, 'anthropic-version': '2023-06-01',
      }, {
        model: model || 'claude-3-5-haiku-20241022', max_tokens: 1500, system,
        messages: [{ role: 'user', content: user }],
      });
      return (res.content && res.content[0] && res.content[0].text) || '';
    }
    case 'gemini': {
      const key = storedKey('gemini');
      if (!key) throw Object.assign(new Error('Provider gemini is NOT_CONFIGURED (no API key stored).'), { state: 'NOT_CONFIGURED' });
      const res = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-1.5-flash')}:generateContent?key=${encodeURIComponent(key)}`,
        {}, { systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }] });
      return (res.candidates && res.candidates[0] && res.candidates[0].content && res.candidates[0].content.parts[0].text) || '';
    }
    case 'ollama': {
      // Ollama runs locally over plain HTTP.
      const http = require('http');
      const u = new URL(OLLAMA_BASE_URL);
      return new Promise((resolve, reject) => {
        const data = JSON.stringify({
          model: model || 'llama3.1',
          stream: false,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        });
        const req = http.request({
          hostname: u.hostname, port: u.port || 11434, path: '/api/chat', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          timeout: 90000,
        }, (res) => {
          let out = '';
          res.on('data', (c) => { out += c; });
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Ollama HTTP ${res.statusCode}: ${out.slice(0, 200)}`));
            try { resolve((JSON.parse(out).message || {}).content || ''); }
            catch { reject(new Error('Ollama returned invalid JSON.')); }
          });
        });
        req.on('timeout', () => req.destroy(new Error('Ollama request timed out.')));
        req.on('error', reject);
        req.write(data); req.end();
      });
    }
    default:
      throw Object.assign(new Error(`Unknown provider "${providerId}".`), { state: 'NOT_CONFIGURED' });
  }
}

/**
 * Run with fallback across providers. Per-agent provider/model overrides come
 * from the agent config store. Throws with honest states if none are usable.
 */
async function runWithFallback({ system, user, preferredProvider, preferredModel }) {
  const order = [];
  if (preferredProvider) order.push({ id: preferredProvider, model: preferredModel });
  for (const p of PROVIDERS) {
    if (p.id !== preferredProvider) order.push({ id: p.id, model: preferredModel });
  }
  const errors = [];
  for (const cand of order) {
    if (cand.id !== 'ollama' && !storedKey(cand.id)) continue;
    try {
      const text = await callProvider(cand.id, { system, user }, cand.model);
      return { provider: cand.id, text };
    } catch (e) {
      errors.push(`${cand.id}: ${e.message}`);
    }
  }
  throw new Error(`No AI provider available. Tried: ${errors.join(' | ') || 'none configured'}`);
}

module.exports = {
  PROVIDERS, providerStates, storedKey, storeKey, deleteKey, listStoredKeyIds, callProvider, runWithFallback,
};
