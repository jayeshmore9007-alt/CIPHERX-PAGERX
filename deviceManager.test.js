// deviceManager.test.js - PAGER-X enrollment, approval and hard allowlist tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'devices-'));
const store = require('../src/services/persistence');
const dm = require('../src/services/deviceManager');

test('allowlist is exactly the five safe commands', () => {
  assert.deepStrictEqual(dm.DEVICE_ALLOWLIST, ['status', 'uptime', 'ifconfig', 'df -h', 'log tail']);
});

test('enroll requires name, host and user', () => {
  assert.throws(() => dm.enroll({}), /required/);
});

test('enrolled device starts PENDING and must be approved', async () => {
  const d = dm.enroll({ name: 'lab-phone', host: '192.0.2.10', user: 'operator', port: 22 });
  assert.strictEqual(d.status, 'PENDING');
  const refused = await dm.runCommand(d.id, 'uptime');
  assert.strictEqual(refused.status, 'FAILED');
  assert.match(refused.error, /PENDING/);

  const approved = dm.approve(d.id);
  assert.strictEqual(approved.status, 'APPROVED');
});

test('non-allowlisted commands are refused even on approved devices', async () => {
  const d = dm.enroll({ name: 'phone2', host: '192.0.2.11', user: 'operator' });
  dm.approve(d.id);
  const refused = await dm.runCommand(d.id, 'rm -rf /');
  assert.strictEqual(refused.status, 'FAILED');
  assert.match(refused.error, /not on the hard allowlist/);
  // refusal is audited
  const audits = store.all('audit');
  assert.ok(audits.some((a) => a.action === 'pagerx.command' && a.result === 'DENIED'));
});

test('revoked devices cannot run commands', async () => {
  const d = dm.enroll({ name: 'phone3', host: '192.0.2.12', user: 'operator' });
  dm.approve(d.id);
  dm.revoke(d.id);
  const refused = await dm.runCommand(d.id, 'status');
  assert.strictEqual(refused.status, 'FAILED');
  assert.match(refused.error, /REVOKED/);
});

test('unknown device health check fails honestly', async () => {
  const h = await dm.checkHealth('missing-device');
  assert.strictEqual(h.healthy, false);
});
