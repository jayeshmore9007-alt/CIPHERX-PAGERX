// SANTOKI AI COMMANDER - Marathi-first planning brain and bounded agent router.
// This phase creates an explicit agent plan. It does not execute arbitrary commands.
const gateway = require('./modelGateway');

const AGENTS = {
  android: { id: 'android_controller', label_mr: 'Android Controller AI', executor: 'NOT_CONNECTED' },
  pagerx: { id: 'pagerx_device_agent', label_mr: 'PAGER-X Device Agent', executor: 'LIMITED_READ_ONLY' },
  cipherx: { id: 'cipherx_project_agent', label_mr: 'CIPHERX Project Agent', executor: 'NOT_CONNECTED' },
  backend: { id: 'backend_admin_agent', label_mr: 'Backend Admin Agent', executor: 'NOT_CONNECTED' },
  computer: { id: 'authorized_computer_agent', label_mr: 'Authorized Computer Agent', executor: 'NOT_CONNECTED' },
  general: { id: 'general_assistant', label_mr: 'General Assistant', executor: 'PLAN_ONLY' },
};

const DOMAINS = [
  { id: 'android', label: 'Android phone', scope: 'permissioned Android app actions and diagnostics' },
  { id: 'pagerx', label: 'WiFi Pineapple Pager', scope: 'approved Pager diagnostics through the existing fixed allowlist' },
  { id: 'cipherx', label: 'CIPHERX project', scope: 'project files, tests, reports, and app/backend development' },
  { id: 'backend', label: 'Backend server', scope: 'authenticated service health, configuration checks, and logs' },
  { id: 'computer', label: 'Authorized computer', scope: 'future allowlisted local file and developer workflow actions' },
  { id: 'general', label: 'General assistant', scope: 'explanation, research planning, and user guidance' },
];

const BLOCKED = /steal credentials|credential theft|password dump|keylog|ransomware|malware|persistence|bypass authentication|disable security|deauth|evil twin|handshake capture|intercept traffic|exfiltrat|unauthorized access/i;

function detectDomain(message) {
  const lower = String(message || '').toLowerCase();
  if (/pager|pineapple|पेजर|वायफाय पायनॅपल/.test(lower)) return 'pagerx';
  if (/backend|server|सर्व्हर|बॅकएंड/.test(lower)) return 'backend';
  if (/computer|pc|laptop|संगणक|कॉम्प्युटर/.test(lower)) return 'computer';
  if (/android|फोन|मोबाइल|अॅप|ॲप/.test(lower)) return 'android';
  if (/cipherx|project|प्रोजेक्ट|कोड|बिल्ड|apk|गिटहब/.test(lower)) return 'cipherx';
  return 'general';
}

function fallbackPlan(message) {
  const domain = detectDomain(message);
  const descriptions = {
    pagerx: ['तुमचा आधीपासून APPROVED केलेला Pager निवडा.', 'फक्त उपलब्ध read-only diagnostics निवडा.', 'कमांड चालवण्यापूर्वी तुमची स्पष्ट परवानगी घ्या.', 'निकाल मराठीत समजावून सांगा.'],
    android: ['Android वर कोणती परवानगी आवश्यक आहे ते तपासा.', 'फक्त Android API आणि user-granted permissions वापरा.', 'कृतीपूर्वी आवश्यक confirmation घ्या.', 'निकाल आणि बदलांची नोंद दाखवा.'],
    cipherx: ['प्रोजेक्टची संबंधित फाइल्स आणि सध्याची रचना तपासा.', 'बदलांची योजना आणि प्रभावित फाइल्स निश्चित करा.', 'बदल केल्यानंतर tests आणि type-check चालवा.', 'त्रुटी आणि पूर्ण झालेली कामे मराठीत नोंदवा.'],
    backend: ['Backend endpoint आणि authentication स्थिती तपासा.', 'सुरक्षित configuration आणि उपलब्ध logs तपासा.', 'बदल आवश्यक असल्यास आधी backup आणि confirmation घ्या.', 'Health check आणि audit log मधून पडताळणी करा.'],
    computer: ['फक्त नोंदणीकृत आणि अधिकृत संगणक निवडा.', 'फाइल किंवा developer workflow साठी allowlisted कृती ठरवा.', 'कृतीपूर्वी preview आणि स्पष्ट confirmation दाखवा.', 'परिणाम पडताळून audit log नोंदवा.'],
    general: ['तुमचा उद्देश आणि अपेक्षित परिणाम स्पष्ट करा.', 'कामासाठी योग्य CIPHERX एजंट निवडा.', 'सुरक्षित टप्प्यांची योजना तयार करा.', 'पूर्ण झालेला निकाल सोप्या मराठीत सांगा.'],
  };
  const agent = AGENTS[domain];
  return {
    domain, agent_id: agent.id, agent_label_mr: agent.label_mr,
    executor_state: agent.executor, summary_mr: 'तुमची सूचना समजली. खाली सुरक्षित कामाची योजना दिली आहे.',
    steps_mr: descriptions[domain], needs_approval: true,
  };
}

async function planMessage(message) {
  const text = String(message || '').trim();
  if (!text || text.length > 2000) {
    const error = new Error('Message is required and must be 2000 characters or fewer.');
    error.statusCode = 400;
    throw error;
  }
  if (BLOCKED.test(text)) {
    return {
      status: 'BLOCKED',
      summary_mr: 'ही विनंती अनधिकृत प्रवेश, गोपनीय माहिती चोरणे किंवा हानिकारक कृतीशी संबंधित असू शकते. त्यामुळे मी ती चालवू शकत नाही.',
      steps_mr: ['तुमच्या स्वतःच्या डिव्हाइसची सुरक्षित तपासणी किंवा संरक्षणात्मक diagnostics निवडा.'],
      domain: 'security', agent_id: 'security_guard', agent_label_mr: 'Security Guard AI',
      executor_state: 'BLOCKED', needs_approval: true, execution: 'NOT_EXECUTED',
    };
  }

  const fallback = fallbackPlan(text);
  try {
    const response = await gateway.runWithFallback({
      system: [
        'You are SANTOKI, the Marathi-first main assistant brain inside CIPHERX.',
        'Understand Marathi, Hindi, and English. Respond in simple Marathi unless asked otherwise.',
        'Return ONLY valid JSON with keys: domain, summary_mr, steps_mr, needs_approval.',
        'domain must be one of: android, pagerx, cipherx, backend, computer, general.',
        'steps_mr must be an array of 3 to 6 short Marathi strings.',
        'Create a plan only. Never claim an action was executed.',
        'Never output shell commands, scripts, credentials, exploit steps, or arbitrary code.',
        'All device/computer changes require explicit user confirmation and an allowlisted executor.',
        'For unsupported capabilities, clearly state that execution is not yet connected.',
      ].join(' '),
      user: text, preferredProvider: null, preferredModel: null,
    });
    const raw = String(response.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(raw);
    if (!AGENTS[parsed.domain] || typeof parsed.summary_mr !== 'string' || !Array.isArray(parsed.steps_mr)) throw new Error('Invalid planner response');
    const agent = AGENTS[parsed.domain];
    return {
      status: 'PLAN_READY', domain: parsed.domain,
      agent_id: agent.id, agent_label_mr: agent.label_mr, executor_state: agent.executor,
      summary_mr: parsed.summary_mr.slice(0, 1200),
      steps_mr: parsed.steps_mr.filter((s) => typeof s === 'string').slice(0, 6).map((s) => s.slice(0, 300)),
      needs_approval: true, execution: 'NOT_EXECUTED',
    };
  } catch {
    return { status: 'PLAN_READY', ...fallback, execution: 'NOT_EXECUTED', note_mr: 'AI provider उपलब्ध नसल्यामुळे स्थानिक नियमांवर आधारित योजना तयार केली आहे.' };
  }
}

function capabilities() {
  return {
    name: 'SANTOKI AI COMMANDER',
    role: 'Marathi-first central planner and bounded multi-agent router',
    supported_domains: DOMAINS,
    agent_map: AGENTS,
    current_mode: 'PLAN_AND_ROUTE',
    connected_executors: ['PAGER-X fixed read-only diagnostics (existing approved-device flow)'],
    planned_integrations: ['Android permissioned actions', 'CIPHERX project workflows', 'backend administration', 'authorized computer workflows', 'voice input and Marathi speech output'],
    safety: 'No arbitrary shell or unrestricted machine control. Every consequential action requires an allowlisted executor and explicit operator approval.',
  };
}

module.exports = { planMessage, capabilities, fallbackPlan, detectDomain };
