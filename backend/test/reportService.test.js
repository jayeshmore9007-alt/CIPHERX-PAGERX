// reportService.test.js - report generation tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'reports-'));
const reportService = require('../src/services/reportService');

const doneJob = {
  id: 'job_reportok', state: 'DONE', createdAt: '2026-01-01T00:00:00.000Z',
  steps: [
    { agent: 'apk', name: 'analysis', state: 'DONE', output: { entryCountHint: 12 } },
    { agent: 'manifest', name: 'analysis', state: 'SKIPPED', output: null },
  ],
};

test('buildReport produces text for DONE jobs', () => {
  const text = reportService.buildReport(doneJob);
  assert.ok(text.includes('job_reportok'));
  assert.ok(text.includes('apk'));
  assert.ok(text.includes('SKIPPED'));
});

test('buildReport refuses running jobs', () => {
  assert.strictEqual(reportService.buildReport({ ...doneJob, state: 'RUNNING' }), null);
});

test('toHtml wraps findings in a document', () => {
  const html = reportService.toHtml(doneJob);
  assert.match(html, /<!doctype html>/);
  assert.ok(html.includes('job_reportok'));
});

test('toHtml refuses DONE_WITH_ERRORS? No - it is accepted', () => {
  const html = reportService.toHtml({ ...doneJob, state: 'DONE_WITH_ERRORS' });
  assert.ok(html.includes('DONE_WITH_ERRORS'));
});

test('streamPdf writes a real PDF header', async () => {
  const target = path.join(os.tmpdir(), `rep-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  const ws = fs.createWriteStream(target);
  const finished = new Promise((resolve, reject) => {
    ws.once('finish', resolve);
    ws.once('error', reject);
  });
  assert.strictEqual(reportService.streamPdf(doneJob, ws), true);
  await finished;
  const buf = fs.readFileSync(target);
  assert.strictEqual(buf.slice(0, 4).toString(), '%PDF');
  fs.unlinkSync(target);
});
