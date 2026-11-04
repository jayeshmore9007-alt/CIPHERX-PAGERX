// persistence.js - JSON-file store for projects, history, jobs, agent config,
// keys, devices, audit, sessions. SCHEMA_VERSION 2, 9 collections.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || './data';
const SCHEMA_VERSION = 2;
const COLLECTIONS = ['projects', 'history', 'jobs', 'agentConfig', 'keys', 'devices', 'audit', 'sessions', 'tasks'];
// Note: 'files' are stored inside projects; 'tasks' holds PAGER-X task history.

function fileFor(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function init() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const c of COLLECTIONS) {
    const f = fileFor(c);
    if (!fs.existsSync(f)) {
      fs.writeFileSync(f, JSON.stringify({ schemaVersion: SCHEMA_VERSION, items: [] }, null, 2));
    }
  }
}

function read(name) {
  init();
  try {
    const raw = JSON.parse(fs.readFileSync(fileFor(name), 'utf8'));
    if (!Array.isArray(raw.items)) raw.items = [];
    return raw.items;
  } catch {
    return [];
  }
}

function write(name, items) {
  init();
  fs.writeFileSync(fileFor(name), JSON.stringify({ schemaVersion: SCHEMA_VERSION, items }, null, 2));
}

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

// Generic CRUD
function all(name) { return read(name); }
function find(name, pred) { return read(name).find(pred) || null; }
function insert(name, doc) {
  const items = read(name);
  const record = { id: doc.id || id(name.slice(0, 3)), createdAt: now(), ...doc, id: doc.id || undefined };
  // ensure id set
  if (!record.id) record.id = id(name.slice(0, 3));
  items.push(record);
  write(name, items);
  return record;
}
function update(name, pred, patch) {
  const items = read(name);
  const i = items.findIndex(pred);
  if (i < 0) return null;
  items[i] = { ...items[i], ...patch, updatedAt: now() };
  write(name, items);
  return items[i];
}
function remove(name, pred) {
  const items = read(name);
  const next = items.filter((x) => !pred(x));
  write(name, next);
  return items.length - next.length;
}

// Projects: { id, name, notes[], createdAt }
function createProject(name) {
  return insert('projects', { name, notes: [] });
}
function addNote(projectId, text) {
  const p = find('projects', (x) => x.id === projectId);
  if (!p) return null;
  const notes = [...(p.notes || []), { text, at: now() }];
  return update('projects', (x) => x.id === projectId, { notes });
}

// History: { id, projectId, jobId, state, summary, at }
function addHistory(projectId, jobId, state, summary) {
  return insert('history', { projectId, jobId, state, summary });
}
function historyFor(projectId) {
  return read('history').filter((h) => h.projectId === projectId).sort((a, b) => (a.at < b.at ? 1 : -1));
}

// Jobs: { id, type, state, steps[], logs[], retries, projectId, fileId, createdAt }
function upsertJob(job) {
  const existing = find('jobs', (x) => x.id === job.id);
  if (existing) return update('jobs', (x) => x.id === job.id, job);
  return insert('jobs', job);
}

// Audit: { id, at, action, result, detail }
function audit(action, result, detail) {
  return insert('audit', { action, result, detail: detail || null });
}

module.exports = {
  init, SCHEMA_VERSION, COLLECTIONS, now, id,
  all, find, insert, update, remove,
  createProject, addNote, addHistory, historyFor, upsertJob, audit,
};
