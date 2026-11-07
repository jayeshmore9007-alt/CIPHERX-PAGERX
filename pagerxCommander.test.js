const test = require('node:test');
const assert = require('node:assert/strict');
const commander = require('./pagerxCommander');
const deviceManager = require('./deviceManager');

test('Commander maps supported English diagnostics to fixed intents', () => {
  assert.equal(commander.classify('show device status').command, 'status');
  assert.equal(commander.classify('check uptime').command, 'uptime');
  assert.equal(commander.classify('show network interfaces').command, 'ifconfig');
  assert.equal(commander.classify('show disk storage').command, 'df -h');
  assert.equal(commander.classify('show recent logs').command, 'log tail');
});

test('Commander recognizes Marathi status and connectivity requests', () => {
  assert.equal(commander.classify('डिव्हाइस माहिती दाखव').command, 'status');
  assert.equal(commander.classify('कनेक्शन तपास').action, 'health');
});

test('Commander refuses arbitrary shell and unsupported high-impact requests', () => {
  assert.equal(commander.classify('rm -rf /'), null);
  assert.equal(commander.classify('run arbitrary shell command whoami'), null);
  assert.equal(commander.classify('deauthenticate nearby clients'), null);
});

test('Commander advertises only bounded read-only diagnostics', () => {
  const caps = commander.capabilities();
  assert.equal(caps.mode, 'llm-assisted-intent-router-with-deterministic-fallback');
  assert.equal(caps.available.length, 6);
  assert.ok(caps.not_yet_available.some((x) => x.includes('Payload')));
});

test('Pager enrollment accepts private IPv4 ranges only', () => {
  for (const host of ['172.16.52.1', '10.0.0.4', '192.168.1.20', '169.254.1.2']) {
    assert.equal(deviceManager.isPrivateIPv4(host), true, host);
  }
  for (const host of ['8.8.8.8', '1.1.1.1', '127.0.0.1', 'example.com', '172.32.0.1']) {
    assert.equal(deviceManager.isPrivateIPv4(host), false, host);
  }
});

test('AI classifier safely falls back to fixed local intents when no provider is configured', async () => {
  const intent = await commander.classifyWithAI('show device status');
  assert.equal(intent.command, 'status');
  assert.equal(await commander.classifyWithAI('deauthenticate nearby clients'), null);
});
