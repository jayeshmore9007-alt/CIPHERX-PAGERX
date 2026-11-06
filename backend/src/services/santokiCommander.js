// SANTOKI AI COMMANDER - multilingual planning brain for CIPHERX.
// Phase 1: understand Marathi/English requests and create safe, bounded plans.
// This module does NOT execute arbitrary shell, desktop, Android, or device actions.
const gateway = require('./modelGateway');

const DOMAINS = [
  { id: 'android', label: 'Android phone', scope: 'permissioned Android app actions and diagnostics' },
  { id: 'pagerx', label: 'WiFi Pineapple Pager', scope: 'approved Pager diagnostics through the existing fixed allowlist' },
  { id: 'cipherx', label: 'CIPHERX project', scope: 'project files, tests, reports, and app/backend development' },
  { id: 'backend', label: 'Backend server', scope: 'authenticated service health, configuration checks, and logs' },
  { id: 'computer', label: 'Authorized computer', scope: 'future allowlisted local file and developer workflow actions' },
  { id: 'general', label: 'General assistant', scope: 'explanation, research planning, and user guidance' },
];

const BLOCKED = /steal credentials|credential theft|password dump|keylog|ransomware|malware|persistence|bypass authentication|disable security|deauth|evil twin|handshake capture|intercept traffic|exfiltrat|unauthorized access/i;

function fallbackPlan(message) {
  const text = String(message || '');
  const lower = text.toLowerCase();
  let domain = 'general';
  if (/pager|pineapple|पेजर|वायफाय पायनॅपल/.test(lower)) domain = 'pagerx';
  else if (/android|फोन|मोबाइल|अॅप|ॲप/.test(lower)) domain = 'android';
  else if (/backend|server|सर्व्हर|बॅकएंड/.test(lower)) domain = 'backend';
  else if (/computer|pc|laptop|संगणक|कॉम्प्युटर/.test(lower)) domain = 'computer';
  else if (/cipherx|project|प्रोजेक्ट|कोड|बिल्ड|apk/.test(lower)) domain = 'cipherx';
  const descriptions = {
    pagerx: ['तुमचा आधीपासून APPROVED केलेला Pager निवडा.', 'फक्त उपलब्ध read-only diagnostics निवडा.', 'कमांड चालवण्यापूर्वी तुमची स्पष्ट परवानगी घ्या.', 'निकाल मराठीत समजावून सांगा.'],
    android: ['Android वर कोणती परवानगी आवश्यक आहे ते तपासा.', 'फक्त Android API आणि user-granted permissions वापरा.', 'कृतीपूर्वी आवश्यक confirmation घ्या.', 'निकाल आणि बदलांची नोंद दाखवा.'],
    cipherx: ['प्रोजेक्टची संबंधित फाइल्स आणि सध्याची रचना तपासा.', 'बदलांची योजना आणि प्रभावित फाइल्स निश्चित करा.', 'बदल केल्यानंतर tests आणि type-check चालवा.', 'त्रुटी आणि पूर्ण झालेली कामे मराठीत नोंदवा.'],
    backend: ['Backend endpoint आणि authentication स्थिती तपासा.', 'सुरक्षित configuration आणि उपलब्ध logs तपासा.', 'बदल आवश्यक असल्यास आधी backup आणि confirmation घ्या.', 'Health check आणि audit log मधून पडताळणी करा.'],
    computer: ['फक्त नोंदणीकृत आणि अधिकृत संगणक निवडा.', 'फाइल किंवा developer workflow साठी allowlisted कृती ठरवा.', 'कृतीपूर्वी preview आणि स्पष्ट confirmation दाखवा.', 'परिणाम पडताळून audit log नोंदवा.'],
    general: ['तुमचा उद्देश आणि अपेक्षित परिणाम स्पष्ट करा.', 'कामासाठी योग्य CIPHERX एजंट निवडा.', 'सुरक्षित टप्प्यांची योजना तयार करा.', 'पूर्ण झालेला निकाल सोप्या मराठीत सांगा.'],
  };
  return { domain, summary_mr: 'तुमची सूचना समजली. खाली सुरक्षित कामाची योजना दिली आहे.', steps_mr: descriptions[domain], needs_approval: true };
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
      summary_mr: 'ही विनंती अनधिकृत प्रवेश, गोपनीय माहिती चोरणे किंवा हानिकारक कृतीशी संबंधित असू शकते. त्यामुळे मी ती चालवू किंवा तिची कार्यवाही योजना देऊ शकत नाही.',
      steps_mr: ['तुमच्या स्वतःच्या डिव्हाइसची सुरक्षित तपासणी किंवा संरक्षणात्मक diagnostics निवडा.'],
      domain: 'security',
      needs_approval: true,
      execution: 'NOT_EXECUTED',
    };
  }

  const fallback = fallbackPlan(text);
  try {
    const response = await gateway.runWithFallback({
      system: [
        'You are SANTOKI, the Marathi-first main assistant brain inside CIPHERX.',
        'Understand Marathi, Hindi, and English. Respond in simple Marathi unless the user explicitly asks otherwise.',
        'Return ONLY valid JSON with keys: domain, summary_mr, steps_mr, needs_approval.',
        'domain must be one of: android, pagerx, cipherx, backend, computer, general.',
        'steps_mr must be an array of 3 to 6 short Marathi strings.',
        'Create a plan only. Never claim an action was executed.',
        'Never output shell commands, scripts, credentials, exploit steps, or arbitrary code.',
        'All device/computer changes require explicit user confirmation and an allowlisted executor.',
        'For unsupported capabilities, clearly state that execution is not yet connected and offer a safe next step.',
      ].join(' '),
      user: text,
      preferredProvider: null,
      preferredModel: null,
    });
    const raw = String(response.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(raw);
    const allowed = DOMAINS.some((d) => d.id === parsed.domain);
    if (!allowed || typeof parsed.summary_mr !== 'string' || !Array.isArray(parsed.steps_mr)) throw new Error('Invalid planner response');
    return {
      status: 'PLAN_READY',
      domain: parsed.domain,
      summary_mr: parsed.summary_mr.slice(0, 1200),
      steps_mr: parsed.steps_mr.filter((s) => typeof s === 'string').slice(0, 6).map((s) => s.slice(0, 300)),
      needs_approval: true,
      execution: 'NOT_EXECUTED',
    };
  } catch {
    return { status: 'PLAN_READY', ...fallback, execution: 'NOT_EXECUTED', note_mr: 'AI provider उपलब्ध नसल्यामुळे स्थानिक नियमांवर आधारित योजना तयार केली आहे.' };
  }
}

function capabilities() {
  return {
    name: 'SANTOKI AI COMMANDER',
    role: 'Marathi-first central planner and agent router',
    supported_domains: DOMAINS,
    current_mode: 'PLAN_ONLY',
    connected_executors: ['PAGER-X fixed read-only diagnostics (existing approved-device flow)'],
    planned_integrations: ['Android permissioned actions', 'CIPHERX project workflows', 'backend administration', 'authorized computer workflows', 'voice input and Marathi speech output'],
    safety: 'No arbitrary shell or unrestricted machine control. Every consequential action requires an allowlisted executor and explicit operator approval.',
  };
}

module.exports = { planMessage, capabilities, fallbackPlan };
