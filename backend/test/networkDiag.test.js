// networkDiag.test.js - Wi-Fi measurement analysis tests.
const test = require('node:test');
const assert = require('node:assert');
const { analyzeMeasurements } = require('../src/services/networkDiag');

test('excellent signal, low latency, WPA2 -> healthy summary', () => {
  const r = analyzeMeasurements({ rssi: -45, latencyMs: 12, packetLoss: 0, security: 'WPA2' });
  assert.match(r.summary, /healthy/i);
  assert.ok(!r.issues.some((i) => i.severity === 'HIGH'));
});

test('weak signal -> HIGH severity issue', () => {
  const r = analyzeMeasurements({ rssi: -82, latencyMs: 20, packetLoss: 0, security: 'WPA3' });
  assert.ok(r.issues.some((i) => i.severity === 'HIGH' && /weak/i.test(i.message)));
});

test('open network -> HIGH severity issue', () => {
  const r = analyzeMeasurements({ rssi: -50, latencyMs: 10, packetLoss: 0, security: 'OPEN' });
  assert.ok(r.issues.some((i) => i.severity === 'HIGH' && /OPEN/i.test(i.message)));
});

test('WEP network -> HIGH severity issue', () => {
  const r = analyzeMeasurements({ rssi: -50, latencyMs: 10, packetLoss: 0, security: 'WEP' });
  assert.ok(r.issues.some((i) => i.severity === 'HIGH' && /WEP/i.test(i.message)));
});

test('high packet loss -> HIGH severity issue', () => {
  const r = analyzeMeasurements({ rssi: -55, latencyMs: 15, packetLoss: 8, security: 'WPA2' });
  assert.ok(r.issues.some((i) => i.severity === 'HIGH' && /packet loss/i.test(i.message)));
});

test('missing measurements are reported honestly as INFO', () => {
  const r = analyzeMeasurements({ security: 'unknown' });
  assert.ok(r.issues.some((i) => i.severity === 'INFO'));
});
