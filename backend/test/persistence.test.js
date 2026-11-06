// persistence.test.js - JSON store round-trip tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-'));
const store = require('../src/services/persistence');

test('init creates all 9 collections with schema version 2', () => {
  store.init();
  for (const c of store.COLLECTIONS) {
    const raw = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, `${c}.json`), 'utf8'));
    assert.strictEqual(raw.schemaVersion, 2);
    assert.ok(Array.isArray(raw.items));
  }
  assert.strictEqual(store.COLLECTIONS.length, 9);
});

test('project create + note round trip', () => {
  const p = store.createProject('Test project');
  assert.ok(p.id && p.name === 'Test project');
  store.addNote(p.id, 'first note');
  const found = store.find('projects', (x) => x.id === p.id);
  assert.strictEqual(found.notes.length, 1);
  assert.strictEqual(found.notes[0].text, 'first note');
});

test('history is stored newest-first per project', () => {
  const p = store.createProject('Hist project');
  store.addHistory(p.id, 'job_a', 'DONE', 'a done');
  store.addHistory(p.id, 'job_b', 'FAILED', 'b failed');
  const h = store.historyFor(p.id);
  assert.strictEqual(h.length, 2);
  assert.strictEqual(h[0].jobId, 'job_b');
});

test('job upsert inserts then updates', () => {
  store.upsertJob({ id: 'job_x', state: 'QUEUED', steps: [], logs: [], retries: 0, type: 'analyze', createdAt: store.now() });
  store.upsertJob({ id: 'job_x', state: 'RUNNING', steps: [], logs: [], retries: 0, type: 'analyze', createdAt: store.now() });
  const j = store.find('jobs', (x) => x.id === 'job_x');
  assert.strictEqual(j.state, 'RUNNING');
  assert.strictEqual(store.all('jobs').filter((x) => x.id === 'job_x').length, 1);
});

test('audit entries accumulate', () => {
  store.audit('test.action', 'OK', 'detail');
  const entries = store.all('audit');
  assert.ok(entries.some((e) => e.action === 'test.action' && e.result === 'OK'));
});

test('remove deletes matching records only', () => {
  const before = store.all('projects').length;
  store.insert('projects', { name: 'Doomed', notes: [] });
  store.remove('projects', (x) => x.name === 'Doomed');
  assert.strictEqual(store.all('projects').length, before);
});
