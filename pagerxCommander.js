// PAGER-X Commander AI: deterministic intent routing over the existing hard allowlist.
// User text is never executed as shell. Only fixed operations in deviceManager are called.
const deviceManager = require('./deviceManager');
const gateway = require('./modelGateway');

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
    mode: 'llm-assisted-intent-router-with-deterministic-fallback',
    intelligence: 'Optional configured CIPHERX model provider; only validated intent IDs can be selected.',
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
  const intent = await classifyWithAI(message);
  if (!intent) {
    return {
      status: 'UNSUPPORTED_INTENT',
      reply: 'हा आदेश अजून समर्थित नाही. Arbitrary terminal commands चालत नाहीत. Device status, uptime, network interfaces, storage, recent logs किंवा connection health विचार.',
      capabilities: capabilities(),
    };
  }
  if (intent.action === 'health') {
    const result = await deviceManager.checkHealth(deviceId);
    return { status: result.healthy ? 'DONE' : 'FAILED', intent: intent.id, reply: result.detail, result };
  }
  const result = await deviceManager.runCommand(deviceId, intent.command);
  return {
    status: result.status,
    intent: intent.id,
    reply: result.status === 'DONE' ? 'तपासणी पूर्ण झाली. खाली device output दिला आहे.' : (result.error || 'Command पूर्ण झाला नाही.'),
    result,
  };
}

module.exports = { classify, classifyWithAI, capabilities, handleMessage };
const BLOCKED_INTENT = /deauth|de-auth|rogue ap|evil twin|handshake capture|credential|password capture|intercept|man.in.the.middle|exfiltrat|steal|attack/i;

async function classifyWithAI(message) {
  const text = String(message || '').trim();
  if (!text || text.length > 500 || BLOCKED_INTENT.test(text)) return null;

  // The model may choose an intent ID only. It never supplies a command,
  // shell fragment, URL, target, or payload. Unknown IDs fail closed.
  try {
    const response = await gateway.runWithFallback({
      system: 'You are a strict intent classifier for a device-management assistant. Return exactly one JSON object: {"intent":"device_health|system_status|uptime|network_interfaces|storage|recent_logs|unsupported"}. Choose only a listed read-only diagnostic intent. If the user asks for anything else, return unsupported. Never output commands or extra text.',
      user: text,
      preferredProvider: null,
      preferredModel: null,
    });
    const raw = String(response.text || '').trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/i, '');
    const parsed = JSON.parse(raw);
    const intent = INTENTS.find((item) => item.id === parsed.intent);
    if (intent) return intent;
    if (parsed.intent === 'unsupported') return null;
  } catch {
    // No configured provider, malformed model output, or provider failure:
    // continue with deterministic local intent matching.
  }
  return classify(text);
}

