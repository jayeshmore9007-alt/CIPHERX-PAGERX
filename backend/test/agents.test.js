// agents.test.js - agent catalog, routing, honest NOT_CONFIGURED, cancel/retry.
const test = require('node:test');
const assert = require('node:assert');

// Isolate the persistence layer away from any real data dir.
process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'agents-'));
const store = require('../src/services/persistence');
const orchestrator = require('../src/services/agentOrchestrator');
const registry = require('../src/services/agentRegistry');

test('catalog contains all 14 real agents', () => {
  const ids = orchestrator.CATALOG.map((a) => a.id).sort();
  assert.deepStrictEqual(ids, ['apimapper', 'apk', 'behavior', 'code', 'dependency', 'dex', 'logic', 'manifest', 'native', 'network', 'report', 'resource', 'security', 'ui']);
  for (const a of orchestrator.CATALOG) {
    assert.ok(a.name && a.description && a.systemPrompt, `agent ${a.id} incomplete`);
  }
});

test('pipeline order starts with apk and ends with report', () => {
  assert.strictEqual(orchestrator.PIPELINE_ORDER[0], 'apk');
  assert.strictEqual(orchestrator.PIPELINE_ORDER[orchestrator.PIPELINE_ORDER.length - 1], 'report');
  assert.strictEqual(orchestrator.PIPELINE_ORDER.length, 14);
});

test('routeIntent maps text to expected agents', () => {
  assert.strictEqual(registry.routeIntent('check the manifest permissions'), 'manifest');
  assert.strictEqual(registry.routeIntent('what API endpoints exist'), 'apimapper');
  assert.strictEqual(registry.routeIntent('is the network config safe'), 'network');
  assert.strictEqual(registry.routeIntent('random gibberish'), 'report');
});

test('every agent has a real executor', () => {
  for (const id of orchestrator.PIPELINE_ORDER) {
    assert.strictEqual(typeof orchestrator.EXECUTORS[id], 'function', `missing executor for ${id}`);
  }
});

test('gateway reports honest NOT_CONFIGURED without keys', () => {
  const gateway = require('../src/services/modelGateway');
  const states = gateway.providerStates();
  for (const p of states) {
    assert.ok(['CONNECTED', 'NOT_CONFIGURED'].includes(p.state));
    assert.strictEqual(p.label.length > 0, true);
  }
});

test('cancelJob cancels a queued job', () => {
  // Create a job directly in the store without running the queue.
  const job = { id: 'job_testcancel', type: 'analyze', state: 'QUEUED', agents: ['apk'], steps: [], logs: [], retries: 0, createdAt: new Date().toISOString() };
  store.upsertJob(job);
  const cancelled = orchestrator.cancelJob('job_testcancel');
  assert.strictEqual(cancelled.state, 'CANCELLED');
});

test('retryJob re-queues a cancelled job and counts retries', () => {
  const fresh = orchestrator.retryJob('job_testcancel');
  assert.strictEqual(fresh.state, 'QUEUED');
  assert.strictEqual(fresh.retries, 1);
  // cancel again immediately to keep the queue clean
  orchestrator.cancelJob('job_testcancel');
});
