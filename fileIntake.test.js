// fileIntake.test.js - magic-byte validation tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const intake = require('../src/services/fileIntake');

const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
const dexMagic = Buffer.from('dex\n035\0abc');
const elfMagic = Buffer.concat([Buffer.from([0x7f]), Buffer.from('ELF'), Buffer.alloc(8)]);

test('accepts a real ZIP magic for apk', () => {
  const r = intake.validateBuffer('app.apk', zipMagic);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.format, 'apk');
});

test('accepts dex magic', () => {
  const r = intake.validateBuffer('classes.dex', dexMagic);
  assert.strictEqual(r.ok, true);
});

test('accepts elf magic for so', () => {
  const r = intake.validateBuffer('libnative.so', elfMagic);
  assert.strictEqual(r.ok, true);
});

test('rejects mismatched content (txt bytes named apk)', () => {
  const r = intake.validateBuffer('fake.apk', Buffer.from('plain text file'));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Magic-byte validation failed/);
});

test('rejects unsupported extensions', () => {
  const r = intake.validateBuffer('photo.png', zipMagic);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Unsupported format/);
});

test('rejects empty files', () => {
  const r = intake.validateBuffer('empty.zip', Buffer.alloc(0));
  assert.strictEqual(r.ok, false);
});

test('storeValidated deletes nothing on failure and stores on success', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-'));
  const bad = intake.storeValidated(dir, 'bad.apk', Buffer.from('not a zip'));
  assert.strictEqual(bad.ok, false);
  const good = intake.storeValidated(dir, 'good.zip', zipMagic);
  assert.strictEqual(good.ok, true);
  assert.ok(fs.existsSync(good.storedPath));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('supported formats list is exact', () => {
  assert.deepStrictEqual(intake.SUPPORTED_FORMATS, ['apk', 'aab', 'dex', 'jar', 'zip', 'so']);
});
