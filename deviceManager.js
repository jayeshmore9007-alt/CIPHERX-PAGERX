// deviceManager.js - PAGER-X authorized own-device management.
// Explicit enrollment -> PENDING -> operator approval -> APPROVED.
// Only fixed read-only diagnostics are executable; arbitrary shell is never accepted.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const store = require('./persistence');

const DEVICE_ALLOWLIST = ['status', 'uptime', 'ifconfig', 'df -h', 'log tail'];

function isPrivateIPv4(host) {
  if (net.isIP(host) !== 4) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254);
}

function listDevices() { return store.all('devices'); }
function getDevice(id) { return store.find('devices', (d) => d.id === id); }

/** Enroll only a private IPv4 endpoint; operator approval is a separate step. */
function enroll({ name, host, user, port }) {
  if (!name || !host || !user) throw new Error('Device name, host and user are required.');
  if (!isPrivateIPv4(String(host).trim())) {
    throw new Error('Pager host must be a private IPv4 address (for example, the verified local Pager address). Public IPs and hostnames are refused.');
  }
  const parsedPort = Number(port) || 22;
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) throw new Error('Invalid SSH port.');
  return store.insert('devices', {
    name: String(name).trim().slice(0, 80),
    host: String(host).trim(),
    user: String(user).trim().slice(0, 64),
    port: parsedPort,
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

function checkHealth(id) {
  return new Promise((resolve) => {
    const d = getDevice(id);
    if (!d) return resolve({ healthy: false, detail: 'Device not found.' });
    if (!isPrivateIPv4(d.host)) return resolve({ healthy: false, detail: 'Refusing a non-private Pager address.' });
    const socket = net.createConnection({ host: d.host, port: d.port, timeout: 4000 });
    const finish = (healthy, detail) => { socket.destroy(); resolve({ healthy, detail }); };
    socket.on('connect', () => finish(true, `TCP connection to ${d.host}:${d.port} succeeded.`));
    socket.on('timeout', () => finish(false, `Connection to ${d.host}:${d.port} timed out.`));
    socket.on('error', (e) => finish(false, `Connection failed: ${e.message}`));
  });
}

function sshOptions(d) {
  const knownHosts = process.env.PAGERX_KNOWN_HOSTS_FILE || path.join(os.homedir(), '.ssh', 'known_hosts');
  if (!fs.existsSync(knownHosts)) {
    throw new Error('SSH host-key file is missing. Verify the Pager host key and add it to PAGERX_KNOWN_HOSTS_FILE before connecting.');
  }
  const args = [
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes',
    '-o', `UserKnownHostsFile=${knownHosts}`,
    '-o', 'ConnectTimeout=8',
    '-o', 'PasswordAuthentication=no',
    '-o', 'KbdInteractiveAuthentication=no',
    '-p', String(d.port),
  ];
  if (process.env.PAGERX_SSH_KEY_PATH) {
    args.push('-o', 'IdentitiesOnly=yes', '-i', process.env.PAGERX_SSH_KEY_PATH);
  }
  return args;
}

/** Execute only an approved, fixed read-only diagnostic via pinned SSH host key. */
function runCommand(id, command) {
  return new Promise((resolve) => {
    const d = getDevice(id);
    if (!d) return resolve({ status: 'FAILED', error: 'Device not found.' });
    if (d.status !== 'APPROVED') {
      store.audit('pagerx.command', 'DENIED', `Device ${id} is not APPROVED (state ${d.status}).`);
      return resolve({ status: 'FAILED', error: 'Explicit device approval is required.' });
    }
    if (!isPrivateIPv4(d.host)) {
      store.audit('pagerx.command', 'DENIED', `Non-private host refused for device ${id}.`);
      return resolve({ status: 'FAILED', error: 'Only private local Pager addresses are allowed.' });
    }
    if (!DEVICE_ALLOWLIST.includes(command)) {
      store.audit('pagerx.command', 'DENIED', `Non-allowlisted command "${command}" refused on device ${id}.`);
      return resolve({ status: 'FAILED', error: `Command is not on the hard allowlist: ${DEVICE_ALLOWLIST.join(', ')}.` });
    }
    let options;
    try { options = sshOptions(d); }
    catch (error) { return resolve({ status: 'FAILED', error: error.message }); }

    const real = {
      'status': 'uname -a',
      'uptime': 'uptime',
      'ifconfig': 'ifconfig || ip addr',
      'df -h': 'df -h',
      'log tail': 'tail -n 50 /var/log/syslog 2>/dev/null || dmesg | tail -n 50',
    }[command];

    store.audit('pagerx.command', 'ALLOWED', `Allowlisted "${command}" on approved Pager ${id}.`);
    execFile('ssh', [...options, `${d.user}@${d.host}`, real],
      { timeout: 20000, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
        const record = {
          deviceId: id,
          command,
          status: err ? 'FAILED' : 'DONE',
          output: err ? null : String(stdout || stderr || '').slice(0, 8000),
          error: err ? String(err.message).slice(0, 500) : null,
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

module.exports = {
  DEVICE_ALLOWLIST, isPrivateIPv4, listDevices, getDevice,
  enroll, approve, revoke, checkHealth, runCommand, taskHistory,
};
