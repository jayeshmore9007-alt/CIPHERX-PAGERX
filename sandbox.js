// sandbox.js - per-job workspace isolation, tool execution with timeouts and
// output caps, plus helper utilities (which, grepDir, listFiles, readText).
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE_ROOT = process.env.RELAB_WORKSPACE || '/tmp/cipherx-relab';
const STEP_TIMEOUT_MS = Number(process.env.STEP_TIMEOUT_MS || 60000);
const MAX_OUTPUT_CHARS = Number(process.env.MAX_OUTPUT_CHARS || 20000);

/** Create an isolated workspace for a job; returns its absolute path. */
function jobWorkspace(jobId) {
  const dir = path.join(WORKSPACE_ROOT, jobId);
  fs.mkdirSync(path.join(dir, 'extract'), { recursive: true });
  return dir;
}

/** Remove a job workspace. */
function cleanupWorkspace(jobId) {
  const dir = path.join(WORKSPACE_ROOT, jobId);
  if (jobId && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Real binary lookup on PATH. Returns 'INSTALLED' or 'TOOL_NOT_INSTALLED'. */
function which(bin) {
  try {
    const paths = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    for (const p of paths) {
      const candidate = path.join(p, bin);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return 'INSTALLED';
      } catch { /* keep looking */ }
    }
    return 'TOOL_NOT_INSTALLED';
  } catch {
    return 'TOOL_NOT_INSTALLED';
  }
}

/** Run a tool with a hard timeout and output cap. Never throws raw output. */
function runTool(bin, args, opts = {}) {
  const timeout = opts.timeoutMs || STEP_TIMEOUT_MS;
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    const timer = setTimeout(() => {
      done({ ok: false, error: `Timeout after ${timeout} ms (tool killed).`, output: null, timedOut: true });
    }, timeout);
    try {
      execFile(bin, args, { timeout, maxBuffer: 4 * 1024 * 1024, cwd: opts.cwd || process.cwd() }, (err, stdout, stderr) => {
        clearTimeout(timer);
        if (err && err.killed) {
          return done({ ok: false, error: `Tool failed: ${err.message}`, output: null });
        }
        const out = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.slice(0, MAX_OUTPUT_CHARS);
        done({ ok: !err, output: out, error: err ? `Tool failed: ${err.message}` : null });
      });
    } catch (e) {
      clearTimeout(timer);
      done({ ok: false, error: `Could not execute ${bin}: ${e.message}`, output: null });
    }
  });
}

/** List files (max depth 3) inside a directory. */
function listFiles(dir, maxDepth = 3) {
  const out = [];
  const walk = (d, depth) => {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else out.push(full);
    }
  };
  walk(dir, 0);
  return out.slice(0, 500);
}

/** Simple line grep inside a directory (no external grep needed). */
function grepDir(dir, pattern, limit = 100) {
  const rx = new RegExp(pattern, 'i');
  const results = [];
  for (const f of listFiles(dir, 4)) {
    const text = readText(f, 40000);
    if (text === null) continue;
    for (const line of text.split('\n')) {
      if (rx.test(line)) {
        results.push({ file: f, line: line.trim().slice(0, 300) });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

/** Read a text file (null if unreadable or binary). */
function readText(file, maxChars = MAX_OUTPUT_CHARS) {
  try {
    const buf = fs.readFileSync(file);
    // crude binary check: high ratio of NUL / invalid UTF-8 replacement
    const text = buf.toString('utf8', 0, maxChars);
    if (text.includes('\u0000')) return null;
    return text;
  } catch {
    return null;
  }
}

function randomId() {
  return crypto.randomBytes(8).toString('hex');
}

module.exports = {
  jobWorkspace, cleanupWorkspace, which, runTool, listFiles, grepDir, readText, randomId,
  WORKSPACE_ROOT, STEP_TIMEOUT_MS, MAX_OUTPUT_CHARS,
};
