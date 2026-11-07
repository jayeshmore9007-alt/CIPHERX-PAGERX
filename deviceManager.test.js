// deviceManager.test.js - PAGER-X enrollment, approval and hard allowlist tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pagerx-devices-'));
const store = require('./persistence');
const dm = require('./deviceManager');

test('allowlist is exactly the fixed read-only diagnostic set', () => {
  assert.deepEqual(dm.DEVICE_ALLOWLIST, ['status', 'uptime', 'ifconfig', 'df -h', 'log tail']);
});

test('enrollment requires name, private IPv4 host and user', () => {
  assert.throws(() => dm.enroll({}), /required/);
  assert.throws(() => dm.enroll({ name: 'pager', host: '8.8.8.8', user: 'root' }), /private IPv4/);
  assert.throws(() => dm.enroll({ name: 'pager', host: '192.168.1.10', user: 'root', port: 70000 }), /Invalid SSH port/);
});

test('enrolled device starts PENDING and must be explicitly approved', async () => {
  const d = dm.enroll({ name: 'owned-pager', host: '192.168.1.10', user: 'root', port: 22 });
  assert.equal(d.status, 'PENDING');
  const refused = await dm.runCommand(d.id, 'uptime');
  assert.equal(refused.status, 'FAILED');
  assert.match(refused.error, /approval is required/);
  const approved = dm.approve(d.id);
  assert.equal(approved.status, 'APPROVED');
});

test('non-allowlisted commands are refused even on approved devices', async () => {
  const d = dm.enroll({ name: 'owned-pager-2', host: '192.168.1.11', user: 'root' });
  dm.approve(d.id);
  const refused = await dm.runCommand(d.id, 'rm -rf /');
  assert.equal(refused.status, 'FAILED');
  assert.match(refused.error, /hard allowlist/);
  const audits = store.all('audit');
  assert.ok(audits.some((a) => a.action === 'pagerx.command' && a.result === 'DENIED'));
});

test('revoked devices cannot run commands', async () => {
  const d = dm.enroll({ name: 'owned-pager-3', host: '192.168.1.12', user: 'root' });
  dm.approve(d.id);
  dm.revoke(d.id);
  const refused = await dm.runCommand(d.id, 'status');
  assert.equal(refused.status, 'FAILED');
  assert.match(refused.error, /approval is required/);
});

test('unknown device health check fails honestly', async () => {
  const h = await dm.checkHealth('missing-device');
  assert.equal(h.healthy, false);
});

test('private IPv4 validation excludes public, loopback and documentation ranges', () => {
  assert.equal(dm.isPrivateIPv4('172.16.52.1'), true);
  assert.equal(dm.isPrivateIPv4('10.0.0.4'), true);
  assert.equal(dm.isPrivateIPv4('192.168.1.20'), true);
  assert.equal(dm.isPrivateIPv4('8.8.8.8'), false);
  assert.equal(dm.isPrivateIPv4('127.0.0.1'), false);
  assert.equal(dm.isPrivateIPv4('192.0.2.10'), false);
});
