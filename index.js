// index.js - CIPHERX AI + PAGER-X backend API (v0.7.0).
// Express + ws. Session auth via x-cipherx-session header. Audit on denials.
require('dotenv').config();
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const store = require('./persistence');
const sandbox = require('./sandbox');
const intake = require('./fileIntake');
const gateway = require('./modelGateway');
const orchestrator = require('./agentOrchestrator');
const registry = require('./agentRegistry');
const deviceManager = require('./deviceManager');
const pagerxCommander = require('./pagerxCommander');
const networkDiag = require('./networkDiag');
const reportService = require('./reportService');

const PORT = Number(process.env.PORT || 8080);
const OPERATOR_USER = process.env.OPERATOR_USER || 'operator';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || '';
const app = express();
app.use(express.json({ limit: '256mb' }));

store.init();

// --- sessions ---
function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  store.insert('sessions', { token, user, at: store.now() });
  return token;
}
function sessionUser(req) {
  const token = req.header('x-cipherx-session');
  if (!token) return null;
  const s = store.find('sessions', (x) => x.token === token && x.user);
  return s ? s.user : null;
}
function requireAuth(req, res, next) {
  if (!OPERATOR_PASSWORD) {
    store.audit('auth', 'DENIED', 'OPERATOR_PASSWORD not configured - all authenticated access refused.');
    return res.status(503).json({ error: 'Server not configured: OPERATOR_PASSWORD missing. Set it in .env and restart.' });
  }
  if (!sessionUser(req)) {
    store.audit('auth', 'DENIED', `Unauthenticated request to ${req.method} ${req.path}.`);
    return res.status(401).json({ error: 'Authentication required (x-cipherx-session header).' });
  }
  next();
}

// --- routes ---
// System
app.get('/api/health', (req, res) => {
  res.json({ status: 'CONNECTED', version: '0.7.0', uptime: Math.floor(process.uptime()) });
});
app.get('/api/tools', requireAuth, (req, res) => {
  const tools = ['jadx', 'apktool', 'aapt', 'readelf', 'unzip', 'ssh'];
  res.json({ tools: Object.fromEntries(tools.map((t) => [t, sandbox.which(t)])) });
});
app.get('/api/audit', requireAuth, (req, res) => {
  res.json({ entries: store.all('audit').slice(-100).reverse() });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!OPERATOR_PASSWORD) return res.status(503).json({ error: 'Server not configured: OPERATOR_PASSWORD missing.' });
  if (username === OPERATOR_USER && password === OPERATOR_PASSWORD) {
    store.audit('auth.login', 'OK', `Operator ${username} logged in.`);
    return res.json({ token: createSession(username) });
  }
  store.audit('auth.login', 'DENIED', `Failed login for "${username}".`);
  res.status(401).json({ error: 'Invalid credentials.' });
});
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.header('x-cipherx-session');
  store.remove('sessions', (s) => s.token === token);
  store.audit('auth.logout', 'OK', 'Session invalidated.');
  res.json({ ok: true });
});

// AI providers and keys
app.get('/api/ai/providers', requireAuth, (req, res) => {
  res.json({ providers: gateway.providerStates() });
});
app.get('/api/keys', requireAuth, (req, res) => {
  res.json({ keys: gateway.listStoredKeyIds() });
});
app.post('/api/keys/:providerId', requireAuth, (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Missing "key" in body.' });
  gateway.storeKey(req.params.providerId, key);
  store.audit('keys.store', 'OK', `Provider key stored (encrypted): ${req.params.providerId}.`);
  res.json({ ok: true });
});
app.delete('/api/keys/:providerId', requireAuth, (req, res) => {
  gateway.deleteKey(req.params.providerId);
  store.audit('keys.delete', 'OK', `Provider key deleted: ${req.params.providerId}.`);
  res.json({ ok: true });
});

// Agents
app.get('/api/agents', requireAuth, (req, res) => {
  res.json({ agents: orchestrator.CATALOG.map((a) => ({ id: a.id, name: a.name, description: a.description, tools: a.tools, formats: a.formats })) });
});
app.get('/api/ai/agent-config', requireAuth, (req, res) => {
  res.json({ defaults: null, agents: store.all('agentConfig') });
});
app.put('/api/ai/agent-config/:agentId', requireAuth, (req, res) => {
  const { provider, model } = req.body || {};
  if (!provider) return res.status(400).json({ error: 'Missing "provider".' });
  if (!orchestrator.agentById[req.params.agentId]) return res.status(404).json({ error: 'Unknown agent.' });
  const existing = store.find('agentConfig', (c) => c.agentId === req.params.agentId);
  if (existing) store.update('agentConfig', (c) => c.agentId === req.params.agentId, { provider, model: model || null });
  else store.insert('agentConfig', { agentId: req.params.agentId, provider, model: model || null });
  res.json({ ok: true });
});
app.post('/api/agents/:agentId/task', requireAuth, (req, res) => {
  const agent = orchestrator.agentById[req.params.agentId];
  if (!agent) return res.status(404).json({ error: 'Unknown agent.' });
  const { input, projectId, fileId, authorized } = req.body || {};
  if (projectId && fileId && !authorized) {
    store.audit('agent.task', 'DENIED', `Missing authorization flag for ${req.params.agentId} task.`);
    return res.status(403).json({ error: 'Authorization required: set authorized:true and confirm the target is yours or explicitly authorized.' });
  }
  if (!projectId || !fileId) {
    return res.status(400).json({ error: 'Single-agent tasks require projectId and fileId of an uploaded, validated target.' });
  }
  const job = orchestrator.createJob({ type: `agent:${req.params.agentId}`, projectId, fileId, agents: [req.params.agentId] });
  store.audit('agent.task', 'OK', `Agent ${req.params.agentId} queued as ${job.id}.`);
  res.json({ jobId: job.id });
});
app.post('/api/route-intent', requireAuth, (req, res) => {
  res.json({ agent: registry.routeIntent((req.body || {}).text) });
});

// Projects
app.get('/api/projects', requireAuth, (req, res) => {
  res.json({ projects: store.all('projects').map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, fileCount: (p.files || []).length })) });
});
app.post('/api/projects', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Project name required.' });
  const p = store.createProject(name);
  store.audit('project.create', 'OK', `Project ${p.id} created.`);
  res.json(p);
});
app.get('/api/projects/:id', requireAuth, (req, res) => {
  const p = store.find('projects', (x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project: { ...p, files: p.files || [] }, history: store.historyFor(p.id) });
});
app.post('/api/projects/:id/files', requireAuth, (req, res) => {
  const p = store.find('projects', (x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  const { filename, base64, authorized } = req.body || {};
  if (!authorized) {
    store.audit('upload', 'DENIED', `Upload to ${req.params.id} without authorization flag.`);
    return res.status(403).json({ error: 'Authorization required: set authorized:true and confirm you own this file or have explicit permission.' });
  }
  if (!filename || !base64) return res.status(400).json({ error: 'filename and base64 required.' });
  const buf = Buffer.from(base64, 'base64');
  const dir = path.join(process.env.DATA_DIR || './data', 'uploads', p.id);
  const stored = intake.storeValidated(dir, filename, buf);
  if (!stored.ok) {
    store.audit('upload', 'DENIED', `Rejected ${filename}: ${stored.reason}`);
    return res.status(415).json({ error: stored.reason });
  }
  const file = { id: `file_${sandbox.randomId()}`, name: stored.storedName, format: stored.format, size: stored.size, storedPath: stored.storedPath, at: store.now() };
  const files = [...(p.files || []), file];
  store.update('projects', (x) => x.id === p.id, { files });
  store.audit('upload', 'OK', `Stored ${file.name} (${file.format}, ${file.size} B) in ${p.id}.`);
  res.json({ file });
});
app.post('/api/projects/:id/notes', requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Note text required.' });
  const updated = store.addNote(req.params.id, text);
  if (!updated) return res.status(404).json({ error: 'Project not found.' });
  res.json({ ok: true });
});

// Jobs
app.post('/api/jobs', requireAuth, (req, res) => {
  const { projectId, fileId, authorized, agents } = req.body || {};
  if (!authorized) {
    store.audit('job.create', 'DENIED', 'Analysis requested without authorization flag.');
    return res.status(403).json({ error: 'Authorization required: set authorized:true and confirm the target is yours or explicitly authorized.' });
  }
  const p = store.find('projects', (x) => x.id === projectId);
  if (!p) return res.status(404).json({ error: 'Project not found.' });
  const f = (p.files || []).find((x) => x.id === fileId);
  if (!f) return res.status(404).json({ error: 'File not found in project.' });
  const job = orchestrator.createJob({ type: 'analyze', projectId, fileId, agents });
  store.audit('job.create', 'OK', `Analysis job ${job.id} queued for ${f.name}.`);
  res.json({ jobId: job.id });
});
app.get('/api/jobs', requireAuth, (req, res) => {
  res.json({ jobs: store.all('jobs').map((j) => ({ id: j.id, type: j.type, state: j.state, retries: j.retries, createdAt: j.createdAt })) });
});
app.get('/api/jobs/:id', requireAuth, (req, res) => {
  const job = orchestrator.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  res.json(job);
});
app.post('/api/jobs/:id/cancel', requireAuth, (req, res) => {
  const job = orchestrator.cancelJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  store.audit('job.cancel', 'OK', `Cancel requested for ${req.params.id}.`);
  res.json(job);
});
app.post('/api/jobs/:id/retry', requireAuth, (req, res) => {
  const job = orchestrator.retryJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  store.audit('job.retry', 'OK', `Retry requested for ${req.params.id}.`);
  res.json(job);
});
app.get('/api/jobs/:id/report', requireAuth, (req, res) => {
  const job = orchestrator.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const format = (req.query.format || 'html').toLowerCase();
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    if (!reportService.streamPdf(job, res)) {
      res.status(409).json({ error: `Report unavailable: job state is ${job.state}.` });
    }
    return;
  }
  const html = reportService.toHtml(job);
  if (!html) return res.status(409).json({ error: `Report unavailable: job state is ${job.state}.` });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Wi-Fi diagnostics
app.post('/api/wifi/analyze', requireAuth, (req, res) => {
  const { rssi, latencyMs, packetLoss, security } = req.body || {};
  res.json(networkDiag.analyzeMeasurements({ rssi, latencyMs, packetLoss, security }));
});

// PAGER-X
app.get('/api/pagerx/status', requireAuth, (req, res) => {
  const ssh = sandbox.which('ssh');
  res.json({ ssh, message: ssh === 'INSTALLED' ? 'SSH binary available - device commands enabled.' : 'SSH binary missing - install openssh-client to enable device commands.' });
});
app.get('/api/devices', requireAuth, (req, res) => {
  res.json({ devices: deviceManager.listDevices().map((d) => ({ id: d.id, name: d.name, host: d.host, status: d.status, allowlist: d.allowlist })) });
});
app.post('/api/devices', requireAuth, (req, res) => {
  try {
    const d = deviceManager.enroll(req.body || {});
    store.audit('device.enroll', 'OK', `Device ${d.id} (${d.host}) enrolled as PENDING.`);
    res.json(d);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post('/api/devices/:id/approve', requireAuth, (req, res) => {
  const d = deviceManager.approve(req.params.id);
  if (!d) return res.status(404).json({ error: 'Device not found.' });
  store.audit('device.approve', 'OK', `Device ${req.params.id} approved.`);
  res.json(d);
});
app.post('/api/devices/:id/revoke', requireAuth, (req, res) => {
  const d = deviceManager.revoke(req.params.id);
  if (!d) return res.status(404).json({ error: 'Device not found.' });
  store.audit('device.revoke', 'OK', `Device ${req.params.id} revoked.`);
  res.json(d);
});
app.get('/api/devices/:id/health', requireAuth, async (req, res) => {
  res.json(await deviceManager.checkHealth(req.params.id));
});
app.post('/api/pagerx/command', requireAuth, async (req, res) => {
  const { deviceId, command } = req.body || {};
  if (!deviceId || !command) return res.status(400).json({ error: 'deviceId and command required.' });
  const r = await deviceManager.runCommand(deviceId, command);
  if (r.status === 'FAILED') return res.status(403).json(r);
  res.json(r);
});
app.get('/api/pagerx/commander/capabilities', requireAuth, (req, res) => {
  res.json(pagerxCommander.capabilities());
});
app.post('/api/pagerx/commander/message', requireAuth, async (req, res) => {
  const { deviceId, message } = req.body || {};
  if (!deviceId || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'deviceId and message are required.' });
  }
  if (message.length > 500) return res.status(413).json({ error: 'Message too long (max 500 characters).' });
  try {
    const result = await pagerxCommander.handleMessage({ deviceId, message });
    store.audit('pagerx.commander', result.status, `Intent ${result.intent || 'unknown'} for device ${deviceId}.`);
    res.json(result);
  } catch (error) {
    store.audit('pagerx.commander', 'FAILED', `Commander error for device ${deviceId}: ${error.message}`);
    res.status(500).json({ error: 'Commander operation failed.' });
  }
});
app.get('/api/devices/:id/tasks', requireAuth, (req, res) => {
  res.json({ tasks: deviceManager.taskHistory(req.params.id) });
});

// --- server + websocket ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const wsClients = new Set();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth' && msg.token) {
        const s = store.find('sessions', (x) => x.token === msg.token);
        if (s) {
          ws.authed = true;
          wsClients.add(ws);
          ws.send(JSON.stringify({ event: 'ws:ready' }));
        } else {
          ws.send(JSON.stringify({ event: 'ws:denied', error: 'Invalid session token.' }));
          ws.close();
        }
      }
    } catch { /* ignore non-JSON */ }
  });
  ws.on('close', () => wsClients.delete(ws));
});

orchestrator.setBroadcaster((evt) => {
  for (const ws of wsClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(evt));
  }
});

server.listen(PORT, () => {
  console.log(`CIPHERX backend v0.7.0 listening on port ${PORT} (HTTP + WS /ws)`);
});
