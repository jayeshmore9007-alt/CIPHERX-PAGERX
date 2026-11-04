// deviceManager.js - PAGER-X authorized own-device management.
// Explicit enrollment -> PENDING, explicit approval -> APPROVED, hard allowlist.
// Any non-allowlisted command is refused with 403 and audited.
const { execFile } = require('child_process');
const store = require('./persistence');

// Hard allowlist. Nothing else can ever run on a device.
const DEVICE_ALLOWLIST = ['status', 'uptime', 'ifconfig', 'df -h', 'log tail'];

function listDevices() {
  return store.all('devices');
}

function getDevice(id) {
  return store.find('devices', (d) => d.id === id);
}

/** Enroll a device as PENDING. The operator must approve explicitly. */
function enroll({ name, host, user, port }) {
  if (!name || !host || !user) throw new Error('Device name, host and user are required.');
  return store.insert('devices', {
    name, host, user,
    port: Number(port) || 22,
    status: 'PENDING',
    allowlist: [...DEVICE_ALLOWLIST],
  });
}

function approve(id) {
  const d = getDevice(id);
  if (!d) return null;
  return store.update('devices', (x) => x.id === id, { status: 'APPROVED' });
}

function revoke(id) {
  const d = getDevice(id);
  if (!d) return null;
  return store.update('devices', (x) => x.id === id, { status: 'REVOKED' });
}

/** Real reachability check (TCP connect to host:port). */
function checkHealth(id) {
  return new Promise((resolve) => {
    const d = getDevice(id);
    if (!d) return resolve({ healthy: false, detail: 'Device not found.' });
    const net = require('net');
    const socket = net.createConnection({ host: d.host, port: d.port, timeout: 4000 });
    const finish = (healthy, detail) => { socket.destroy(); resolve({ healthy, detail }); };
    socket.on('connect', () => finish(true, `TCP connect to ${d.host}:${d.port} succeeded.`));
    socket.on('timeout', () => finish(false, `Connection to ${d.host}:${d.port} timed out.`));
    socket.on('error', (e) => finish(false, `Connection failed: ${e.message}`));
  });
}

/** Run an allowlisted command on an APPROVED device via ssh. Refuses everything else. */
function runCommand(id, command) {
  return new Promise((resolve) => {
    const d = getDevice(id);
    if (!d) return resolve({ status: 'FAILED', error: 'Device not found.' });
    if (d.status !== 'APPROVED') {
      store.audit('pagerx.command', 'DENIED', `Device ${id} is not APPROVED (state ${d.status}).`);
      return resolve({ status: 'FAILED', error: `Device is ${d.status}. Explicit approval is required before commands.` });
    }
    if (!DEVICE_ALLOWLIST.includes(command)) {
      store.audit('pagerx.command', 'DENIED', `Non-allowlisted command "${command}" refused on device ${id}.`);
      return resolve({ status: 'FAILED', error: `Command "${command}" is not on the hard allowlist: ${DEVICE_ALLOWLIST.join(', ')}.` });
    }
    store.audit('pagerx.command', 'ALLOWED', `Allowlisted "${command}" on device ${id}.`);
    // Map allowlisted names to real remote commands.
    const real = {
      'status': 'uname -a',
      'uptime': 'uptime',
      'ifconfig': 'ifconfig || ip addr',
      'df -h': 'df -h',
      'log tail': 'tail -n 50 /var/log/syslog 2>/dev/null || dmesg | tail -n 50',
    }[command];
    execFile('ssh', [
      '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new',
      '-o', 'ConnectTimeout=8', '-p', String(d.port),
      `${d.user}@${d.host}`, real,
    ], { timeout: 20000, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
      const record = {
        deviceId: id, command,
        status: err ? 'FAILED' : 'DONE',
        output: err ? null : String(stdout || stderr || '').slice(0, 8000),
        error: err ? err.message : null,
      };
      store.insert('tasks', record);
      resolve(record.status === 'DONE'
        ? { status: 'DONE', output: record.output }
        : { status: 'FAILED', error: record.error });
    });
  });
}

function taskHistory(deviceId) {
  return store.all('tasks').filter((t) => t.deviceId === deviceId).slice(-100).reverse();
}

module.exports = { DEVICE_ALLOWLIST, listDevices, getDevice, enroll, approve, revoke, checkHealth, runCommand, taskHistory };
