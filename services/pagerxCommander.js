// PAGER-X Commander AI: deterministic intent routing over the existing hard allowlist.
// This is deliberately not an arbitrary shell/LLM executor. It translates supported
// natural-language requests into a fixed deviceManager operation only.
const deviceManager = require('./deviceManager');

const INTENTS = [
  { id: 'device_health', patterns: [/\b(health|reachable|connection|connectivity)\b/i, /कनेक्शन|जोडले|जोडणी|ऑनलाइन आहे का/i], action: 'health' },
  { id: 'system_status', patterns: [/\b(status|system info|device info|uname)\b/i, /स्थिती|स्टेटस|डिव्हाइस माहिती/i], command: 'status' },
  { id: 'uptime', patterns: [/\b(uptime|how long running)\b/i, /किती वेळ चालू|अपटाइम/i], command: 'uptime' },
  { id: 'network_interfaces', patterns: [/\b(network interfaces|ip address|ifconfig|network status)\b/i, /नेटवर्क इंटरफेस|आयपी अॅड्रेस|नेटवर्क स्थिती/i], command: 'ifconfig' },
  { id: 'storage', patterns: [/\b(storage|disk space|filesystem|df)\b/i, /स्टोरेज|डिस्क स्पेस|जागा किती/i], command: 'df -h' },
  { id: 'recent_logs', patterns: [/\b(logs?|recent logs|system log)\b/i, /लॉग|नोंदी|अलीकडील लॉग/i], command: 'log tail' },
];

function classify(message) {
  const text = String(message || '').trim();
  if (!text || text.length > 500) return null;
  return INTENTS.find((intent) => intent.patterns.some((pattern) => pattern.test(text))) || null;
}

function capabilities() {
  return {
    agent: 'PAGERX COMMANDER AI',
    mode: 'deterministic-safe-command-router',
    available: [
      { id: 'device_health', description: 'Check whether the enrolled Pager SSH endpoint is reachable.' },
      { id: 'system_status', description: 'Read basic device/system identity.' },
      { id: 'uptime', description: 'Read device uptime.' },
      { id: 'network_interfaces', description: 'Read network interface configuration.' },
      { id: 'storage', description: 'Read filesystem capacity.' },
      { id: 'recent_logs', description: 'Read a bounded tail of system logs.' },
    ],
    not_yet_available: [
      'Starting/stopping Pager modules until firmware-specific supported controls are verified.',
      'Payload deployment or execution.',
      'Changing network configuration or wireless behavior.',
      'Arbitrary terminal commands.',
    ],
    safety: 'Only fixed operations backed by deviceManager hard allowlist are executable. Device must be explicitly APPROVED.',
  };
}

async function handleMessage({ deviceId, message }) {
  if (!deviceId) return { status: 'NEEDS_DEVICE', reply: 'आधी enrolled Pager device निवड.' };
  const intent = classify(message);
  if (!intent) {
    return {
      status: 'UNSUPPORTED_INTENT',
      reply: 'हा आदेश अजून समर्थित नाही. मी arbitrary terminal commands चालवत नाही. Device status, uptime, network interfaces, storage, recent logs किंवा connection health विचार.',
      capabilities: capabilities(),
    };
  }

  if (intent.action === 'health') {
    const result = await deviceManager.checkHealth(deviceId);
    return {
      status: result.healthy ? 'DONE' : 'FAILED',
      intent: intent.id,
      reply: result.detail,
      result,
    };
  }

  const result = await deviceManager.runCommand(deviceId, intent.command);
  return {
    status: result.status,
    intent: intent.id,
    reply: result.status === 'DONE'
      ? 'तपासणी पूर्ण झाली. खाली device output दिला आहे.'
      : (result.error || 'Command पूर्ण झाला नाही.'),
    result,
  };
}

module.exports = { classify, capabilities, handleMessage };
