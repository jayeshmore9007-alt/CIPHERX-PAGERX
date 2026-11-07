// agentOrchestrator.js - real multi-agent execution engine.
// 14 independent agents, each with a dedicated execution function, tools,
// input/output schema, AI model routing, progress, error handling, cancel,
// retry and logs. Sequential job queue. No simulated success ever.
const fs = require('fs');
const path = require('path');
const store = require('./persistence');
const sandbox = require('./sandbox');
const gateway = require('./modelGateway');

const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Agent catalog: id, name, description, tools, formats, systemPrompt.
// Pipeline order defines the full analysis flow.
const CATALOG = [
  { id: 'apk', name: 'APK Analyzer', description: 'Validates APK/AAB packaging structure, entry inventory and size profile.', tools: ['unzip'], formats: ['apk', 'aab', 'zip'], systemPrompt: 'You are the APK Analyzer, part of an authorized reverse engineering lab. Describe the application package structure from the provided file inventory. Output concise English findings only. Never invent data; base every statement on the given inventory.' },
  { id: 'manifest', name: 'Manifest Agent', description: 'Extracts permissions, exported components and SDK requirements.', tools: ['apktool', 'aapt'], formats: ['apk', 'aab'], systemPrompt: 'You are the Manifest Agent. Analyze AndroidManifest data for permissions, exported components and target SDK. Summarize risks factually in English. Note anything suspicious only if evidence is present.' },
  { id: 'dex', name: 'DEX Analyzer', description: 'Counts classes/packages in DEX bytecode and flags string indicators.', tools: ['jadx'], formats: ['apk', 'dex', 'jar'], systemPrompt: 'You are the DEX Analyzer. Interpret DEX class/package counts and string indicators. Report facts and possible interpretations clearly separated. English only.' },
  { id: 'resource', name: 'Resource Analyzer', description: 'Profiles layouts, assets and resource sizes.', tools: ['apktool'], formats: ['apk', 'aab', 'zip'], systemPrompt: 'You are the Resource Analyzer. Describe resource/layout/asset organization from real file listings. English only, no speculation beyond the data.' },
  { id: 'code', name: 'Code Intelligence Agent', description: 'Maps decompiled source structure (packages, entry points).', tools: ['jadx'], formats: ['apk', 'dex', 'jar'], systemPrompt: 'You are the Code Intelligence Agent. You inspect reconstructed (decompiled) code structure. Never claim the code is the original source. English only.' },
  { id: 'native', name: 'Native Analyzer', description: 'Reads ELF metadata of native libraries (.so).', tools: ['readelf'], formats: ['so', 'apk', 'aab'], systemPrompt: 'You are the Native Analyzer. Interpret ELF metadata (arch, dependencies) of native libraries. English only, factual.' },
  { id: 'ui', name: 'UI Reconstruction Agent', description: 'Maps activities to layouts and describes UI structure.', tools: ['apktool'], formats: ['apk', 'aab'], systemPrompt: 'You are the UI Reconstruction Agent. Describe UI structure from real layout files and activity mappings. English only.' },
  { id: 'apimapper', name: 'API Mapper', description: 'Discovers API endpoints in code and resources.', tools: ['jadx'], formats: ['apk', 'dex', 'jar', 'zip'], systemPrompt: 'You are the API Mapper. List discovered endpoints/domains exactly as found, with file references. English only.' },
  { id: 'network', name: 'Network Analyzer', description: 'Analyzes network security config and cleartext policy.', tools: ['jadx'], formats: ['apk', 'aab'], systemPrompt: 'You are the Network Analyzer. Assess network security configuration: cleartext traffic, certificate pinning, backup rules. English only.' },
  { id: 'security', name: 'Security Auditor', description: 'Audits permissions, exported components and weak configuration.', tools: ['jadx', 'apktool'], formats: ['apk', 'aab', 'dex', 'jar'], systemPrompt: 'You are the Security Auditor in an authorized lab. Report descriptive security findings with severity and evidence. This is analysis only - never provide exploitation steps.' },
  { id: 'dependency', name: 'Dependency Agent', description: 'Identifies embedded libraries and SDK fingerprints.', tools: ['jadx', 'unzip'], formats: ['apk', 'aab', 'jar', 'zip'], systemPrompt: 'You are the Dependency Agent. Identify library/SDK fingerprints from package names and file listings. Mark uncertain identifications as probable, not certain. English only.' },
  { id: 'logic', name: 'Logic Mapper', description: 'Maps application module architecture from reconstructed code.', tools: ['jadx'], formats: ['apk', 'dex', 'jar'], systemPrompt: 'You are the Logic Mapper. Describe the module architecture and data flow as far as evidence shows. English only.' },
  { id: 'behavior', name: 'Behavior Analyzer', description: 'Describes runtime behavior indicators found in code.', tools: ['jadx'], formats: ['apk', 'dex', 'jar'], systemPrompt: 'You are the Behavior Analyzer. Describe runtime behavior indicators (receivers, services, schedulers) factually. English only.' },
  { id: 'report', name: 'Report Generator', description: 'Assembles the final structured report from all agent outputs.', tools: [], formats: [], systemPrompt: 'You are the Report Generator. Merge the preceding agents\' findings into one clear, honest English report with sections: Overview, Findings, Security Notes, Limitations. Explicitly state which tools were unavailable.' },
];

const PIPELINE_ORDER = ['apk', 'manifest', 'dex', 'resource', 'code', 'native', 'ui', 'apimapper', 'network', 'security', 'dependency', 'logic', 'behavior', 'report'];
const agentById = Object.fromEntries(CATALOG.map((a) => [a.id, a]));

// ---------------------------------------------------------------------------
// Job queue, WebSocket broadcast, cancel/retry
const queue = [];
let running = false;
let broadcaster = () => {};
const cancelRequested = new Set();

function setBroadcaster(fn) { broadcaster = fn; }
function emit(evt) { broadcaster(evt); }

function getJob(jobId) {
  return store.find('jobs', (j) => j.id === jobId);
}

function saveJob(job) {
  store.upsertJob(job);
}

function createJob({ type, projectId, fileId, agents }) {
  const job = {
    id: `job_${sandbox.randomId()}`,
    type: type || 'analyze',
    state: 'QUEUED',
    projectId: projectId || null,
    fileId: fileId || null,
    agents: (agents && agents.length ? agents : PIPELINE_ORDER).filter((a) => agentById[a]),
    steps: [],
    logs: [],
    retries: 0,
    createdAt: store.now(),
    updatedAt: store.now(),
  };
  saveJob(job);
  queue.push(job.id);
  emit({ event: 'job:created', jobId: job.id, type: job.type });
  processQueue();
  return job;
}

function cancelJob(jobId) {
  const job = getJob(jobId);
  if (!job) return null;
  if (job.state === 'QUEUED') {
    const i = queue.indexOf(jobId);
    if (i >= 0) queue.splice(i, 1);
    saveJob({ ...job, state: 'CANCELLED', updatedAt: store.now() });
    emit({ event: 'job:event', jobId, state: 'CANCELLED' });
    return getJob(jobId);
  }
  if (job.state === 'RUNNING') {
    cancelRequested.add(jobId);
    return getJob(jobId);
  }
  return job;
}

function retryJob(jobId) {
  const job = getJob(jobId);
  if (!job) return null;
  if (!['FAILED', 'CANCELLED'].includes(job.state)) return job;
  if (job.retries >= MAX_RETRIES) {
    return { ...job, error: `Maximum retries (${MAX_RETRIES}) reached.` };
  }
  const fresh = { ...job, state: 'QUEUED', steps: [], logs: [], retries: job.retries + 1, error: null, updatedAt: store.now() };
  saveJob(fresh);
  queue.push(jobId);
  emit({ event: 'job:event', jobId, state: 'QUEUED' });
  processQueue();
  return fresh;
}

async function processQueue() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const jobId = queue.shift();
      const job = getJob(jobId);
      if (!job || job.state !== 'QUEUED') continue;
      await runJob(jobId);
    }
  } finally {
    running = false;
  }
}

function logStep(job, evt) {
  // upsert step record
  const steps = [...(job.steps || [])];
  const i = steps.findIndex((s) => s.agent === evt.agent && s.name === evt.name);
  const step = { agent: evt.agent, name: evt.name, state: evt.state, output: evt.output ?? null, at: evt.at || store.now() };
  if (i >= 0) steps[i] = step; else steps.push(step);
  job.steps = steps;
  job.updatedAt = store.now();
  saveJob(job);
  emit({ event: 'job:step', jobId: job.id, ...step });
}

function logLine(job, message) {
  job.logs = [...(job.logs || []), { at: store.now(), message }];
  saveJob(job);
}

// ---------------------------------------------------------------------------
// Workspace preparation with real tools; honest TOOL_NOT_INSTALLED states.
function prepareWorkspace(job, projectFile) {
  const ws = sandbox.jobWorkspace(job.id);
  const src = projectFile.storedPath;
  const fmt = projectFile.format;
  const result = { workspace: ws, srcDir: null, decDir: null, notes: [] };

  const unzipState = sandbox.which('unzip');
  if (unzipState !== 'INSTALLED') {
    result.notes.push('unzip is TOOL_NOT_INSTALLED - archive listing unavailable.');
    return result;
  }
  // Real extraction for zip-based formats.
  if (['apk', 'aab', 'jar', 'zip'].includes(fmt)) {
    const extractDir = path.join(ws, 'extract');
    const r = sandbox.runTool('unzip', ['-o', src, '-d', extractDir]);
    if (r.ok) {
      result.decDir = extractDir;
    } else {
      result.notes.push(`Extraction failed: ${r.error}`);
    }
  }
  // jadx decompilation for dex-bearing formats.
  if (['apk', 'dex', 'jar'].includes(fmt) && sandbox.which('jadx') === 'INSTALLED') {
    const srcDir = path.join(ws, 'src');
    const r = sandbox.runTool('jadx', ['-d', srcDir, src], { timeoutMs: 300000 });
    if (r.ok) result.srcDir = srcDir;
    else result.notes.push(`jadx failed: ${r.error}`);
  } else if (['apk', 'dex', 'jar'].includes(fmt)) {
    result.notes.push('jadx is TOOL_NOT_INSTALLED - source reconstruction unavailable for this job.');
  }
  // apktool for resources/manifest.
  if (['apk', 'aab'].includes(fmt)) {
    if (sandbox.which('apktool') === 'INSTALLED') {
      const decDir = path.join(ws, 'dec');
      const r = sandbox.runTool('apktool', ['d', '-f', '-o', decDir, src], { timeoutMs: 300000 });
      if (r.ok) result.decDir = decDir;
      else result.notes.push(`apktool failed: ${r.error}`);
    } else {
      result.notes.push('apktool is TOOL_NOT_INSTALLED - resource/manifest decoding unavailable.');
    }
  }
  return result;
}

// Build the context each agent sees. ctx.currentAgentId / ctx.job are set per run.
function buildContext(job, workspaceInfo, projectFile) {
  return {
    job,
    currentAgentId: null,
    project: store.find('projects', (p) => p.id === job.projectId),
    file: projectFile,
    workspace: workspaceInfo.workspace,
    srcDir: workspaceInfo.srcDir,
    decDir: workspaceInfo.decDir,
    notes: workspaceInfo.notes,
  };
}

function agentConfigFor(agentId) {
  const rec = store.find('agentConfig', (c) => c.agentId === agentId);
  return rec || null;
}

// ---------------------------------------------------------------------------
// Per-agent real execution logic. Each returns structured output.
const EXECUTORS = {
  apk: async (ctx) => {
    if (sandbox.which('unzip') !== 'INSTALLED') {
      return { state: 'TOOL_NOT_INSTALLED', hint: 'Install unzip to enable archive inventory.', output: { inventory: null } };
    }
    const r = sandbox.runTool('unzip', ['-l', ctx.file.storedPath]);
    if (!r.ok) return { state: 'FAILED', output: { error: r.error } };
    const lines = (r.output || '').split('\n').length;
    return { state: 'DONE', output: { entryCountHint: lines, listing: (r.output || '').slice(0, 4000) } };
  },
  manifest: async (ctx) => {
    if (!ctx.decDir) {
      return { state: 'SKIPPED', hint: 'Requires apktool-decoded resources (apktool missing or failed).', output: null };
    }
    const manifest = sandbox.readText(path.join(ctx.decDir, 'AndroidManifest.xml'), 20000);
    if (!manifest) return { state: 'FAILED', output: { error: 'AndroidManifest.xml not readable in decoded output.' } };
    const permissions = [...manifest.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
    const exported = [...manifest.matchAll(/(activity|service|receiver|provider)[^>]*android:exported="true"/g)].map((m) => m[1]);
    return { state: 'DONE', output: { permissions, exportedComponents: exported.length, manifest: manifest.slice(0, 4000) } };
  },
  dex: async (ctx) => {
    if (!ctx.srcDir) {
      return { state: 'SKIPPED', hint: 'Requires jadx output (jadx missing or failed).', output: null };
    }
    const files = sandbox.listFiles(ctx.srcDir, 5).filter((f) => f.endsWith('.java'));
    const packages = new Set(files.map((f) => path.dirname(f).replace(ctx.srcDir, '').split(path.sep).filter(Boolean).slice(0, 3).join('.')));
    return { state: 'DONE', output: { javaFileCount: files.length, topPackages: [...packages].slice(0, 40) } };
  },
  resource: async (ctx) => {
    if (!ctx.decDir) return { state: 'SKIPPED', hint: 'Requires apktool-decoded resources.', output: null };
    const layoutDir = path.join(ctx.decDir, 'res', 'layout');
    let layouts = [];
    try { layouts = fs.readdirSync(layoutDir).filter((f) => f.endsWith('.xml')).slice(0, 60); } catch { /* none */ }
    const assetsDir = path.join(ctx.decDir, 'assets');
    let assets = [];
    try { assets = fs.readdirSync(assetsDir).slice(0, 60); } catch { /* none */ }
    return { state: 'DONE', output: { layouts, assets } };
  },
  code: async (ctx) => {
    if (!ctx.srcDir) return { state: 'SKIPPED', hint: 'Requires jadx output. Decompiled code is reconstructed, never original.', output: null };
    const entry = sandbox.listFiles(ctx.srcDir, 4).filter((f) => f.endsWith('.java')).slice(0, 40);
    return { state: 'DONE', output: { sampleSourceFiles: entry.map((f) => f.replace(ctx.srcDir + path.sep, '')) } };
  },
  native: async (ctx) => {
    if (sandbox.which('readelf') !== 'INSTALLED') {
      return { state: 'TOOL_NOT_INSTALLED', hint: 'Install binutils (readelf) to enable native library analysis.', output: null };
    }
    const soFiles = ctx.decDir ? sandbox.listFiles(ctx.decDir, 5).filter((f) => f.endsWith('.so')).slice(0, 10) : [];
    if (ctx.file.format === 'so') soFiles.push(ctx.file.storedPath);
    if (soFiles.length === 0) return { state: 'SKIPPED', output: { note: 'No native libraries found.' } };
    const out = [];
    for (const so of soFiles.slice(0, 5)) {
      const r = sandbox.runTool('readelf', ['-h', so]);
      out.push({ file: path.basename(so), header: r.ok ? (r.output || '').slice(0, 1200) : r.error });
    }
    return { state: 'DONE', output: { libraries: out } };
  },
  ui: async (ctx) => {
    if (!ctx.decDir) return { state: 'SKIPPED', hint: 'Requires apktool-decoded resources.', output: null };
    const layoutDir = path.join(ctx.decDir, 'res', 'layout');
    let layouts = [];
    try { layouts = fs.readdirSync(layoutDir).slice(0, 30); } catch { /* none */ }
    const manifest = sandbox.readText(path.join(ctx.decDir, 'AndroidManifest.xml'), 20000) || '';
    const activities = [...manifest.matchAll(/<activity[^>]*android:name="([^"]+)"/g)].map((m) => m[1]).slice(0, 30);
    return { state: 'DONE', output: { activities, layouts } };
  },
  apimapper: async (ctx) => {
    const base = ctx.srcDir || ctx.decDir;
    if (!base) return { state: 'SKIPPED', hint: 'Requires decompiled or decoded content.', output: null };
    const hits = sandbox.grepDir(base, 'https?://[A-Za-z0-9.-]+', 60).slice(0, 60);
    return { state: 'DONE', output: { endpoints: hits } };
  },
  network: async (ctx) => {
    const base = ctx.decDir || ctx.srcDir;
    if (!base) return { state: 'SKIPPED', hint: 'Requires decoded content.', output: null };
    const nsc = sandbox.listFiles(base, 5).find((f) => f.includes('network_security_config'));
    const manifest = sandbox.readText(path.join(ctx.decDir || base, 'AndroidManifest.xml'), 20000) || '';
    const cleartext = /usesCleartextTraffic="true"/.test(manifest);
    return { state: 'DONE', output: { networkSecurityConfig: nsc ? sandbox.readText(nsc, 2000) : null, cleartextTrafficPermitted: cleartext } };
  },
  security: async (ctx) => {
    const findings = [];
    for (const s of ctx.job.steps || []) {
      if (s.agent === 'manifest' && s.output && Array.isArray(s.output.permissions)) {
        const risky = s.output.permissions.filter((p) => /(SMS|CONTACTS|LOCATION|RECORD_AUDIO|CAMERA|READ_PHONE_STATE|MANAGE_EXTERNAL_STORAGE)/.test(p));
        if (risky.length) findings.push({ severity: 'MEDIUM', finding: `Sensitive permissions requested: ${risky.join(', ')}` });
        if (s.output.exportedComponents > 0) findings.push({ severity: 'LOW', finding: `${s.output.exportedComponents} explicitly exported components - verify each is intended.` });
      }
      if (s.agent === 'network' && s.output && s.output.cleartextTrafficPermitted) {
        findings.push({ severity: 'HIGH', finding: 'Cleartext HTTP traffic is permitted by the manifest.' });
      }
    }
    if (findings.length === 0) findings.push({ severity: 'INFO', finding: 'No risky configuration detected by the automated checks.' });
    return { state: 'DONE', output: { findings } };
  },
  dependency: async (ctx) => {
    const base = ctx.srcDir || ctx.decDir;
    if (!base) return { state: 'SKIPPED', hint: 'Requires decompiled or decoded content.', output: null };
    const files = sandbox.listFiles(base, 5).map((f) => f.replace(base, ''));
    const seen = new Set();
    const libs = [];
    for (const f of files) {
      const segs = f.split(path.sep).filter(Boolean);
      if (segs.length >= 3) {
        const pkg = segs.slice(0, 3).join('.');
        if (!seen.has(pkg) && /^(com|org|io|net)\./.test(pkg)) {
          seen.add(pkg);
          libs.push(pkg);
        }
      }
      if (libs.length >= 60) break;
    }
    return { state: 'DONE', output: { probableLibraries: libs } };
  },
  logic: async (ctx) => {
    if (!ctx.srcDir) return { state: 'SKIPPED', hint: 'Requires jadx output.', output: null };
    const files = sandbox.listFiles(ctx.srcDir, 5).filter((f) => f.endsWith('.java'));
    const modules = {};
    for (const f of files) {
      const rel = f.replace(ctx.srcDir + path.sep, '');
      const top = rel.split(path.sep)[0] || 'root';
      modules[top] = (modules[top] || 0) + 1;
    }
    return { state: 'DONE', output: { moduleFileCounts: modules } };
  },
  behavior: async (ctx) => {
    const base = ctx.srcDir || ctx.decDir;
    if (!base) return { state: 'SKIPPED', hint: 'Requires decompiled or decoded content.', output: null };
    const receivers = sandbox.grepDir(base, 'extends (BroadcastReceiver|Service)', 20);
    const schedulers = sandbox.grepDir(base, '(AlarmManager|WorkManager|JobScheduler)', 20);
    return { state: 'DONE', output: { receiversAndServices: receivers.length, schedulerUsage: schedulers.length, samples: receivers.slice(0, 10) } };
  },
  report: async (ctx) => {
    // The report master assembles from previous steps - real inputs only.
    const inputs = (ctx.job.steps || []).filter((s) => s.agent !== 'report' && s.output).map((s) => ({ agent: s.agent, state: s.state, output: s.output }));
    return { state: 'DONE', output: { assembledFrom: inputs.length, steps: inputs } };
  },
};

// ---------------------------------------------------------------------------
async function runJob(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  const project = store.find('projects', (p) => p.id === job.projectId);
  const projectFile = project && job.fileId
    ? ((project.files || []).find((f) => f.id === job.fileId) || null)
    : null;

  job.state = 'RUNNING';
  job.updatedAt = store.now();
  job.startedAt = job.startedAt || store.now();
  saveJob(job);
  emit({ event: 'job:event', jobId, state: 'RUNNING' });
  logLine(job, `Job ${jobId} started (agents: ${job.agents.join(', ')})`);

  if (!projectFile) {
    job.state = 'FAILED';
    job.error = 'Target file not found for this job.';
    saveJob(job);
    logLine(job, job.error);
    emit({ event: 'job:event', jobId, state: 'FAILED' });
    finalize(job);
    return;
  }

  const wsInfo = prepareWorkspace(job, projectFile);
  for (const note of wsInfo.notes) logLine(job, note);
  const ctx = buildContext(job, wsInfo, projectFile);

  let failed = false;
  for (const agentId of job.agents) {
    if (cancelRequested.has(jobId)) {
      cancelRequested.delete(jobId);
      job.state = 'CANCELLED';
      job.updatedAt = store.now();
      saveJob(job);
      logStep(job, { agent: agentId, name: 'execution', state: 'CANCELLED' });
      logLine(job, `Job ${jobId} cancelled by operator.`);
      emit({ event: 'job:event', jobId, state: 'CANCELLED' });
      finalize(job);
      return;
    }

    const agent = agentById[agentId];
    if (!agent) continue;
    ctx.currentAgentId = agentId;
    ctx.job = job;
    logStep(job, { agent: agentId, name: 'start', state: 'RUNNING' });

    try {
      const exec = EXECUTORS[agentId];
      const res = exec ? await exec(ctx) : { state: 'FAILED', output: { error: `No executor for agent ${agentId}.` } };

      if (res.state === 'DONE' || res.state === 'SKIPPED' || res.state === 'TOOL_NOT_INSTALLED') {
        // enrich with AI model routing (per-agent provider/model), honest on failure
        let ai = null;
        if (res.state === 'DONE') {
          const cfg = agentConfigFor(agentId);
          try {
            const r = await gateway.runWithFallback({
              system: agent.systemPrompt,
              user: `Agent: ${agent.name}. Structured findings: ${JSON.stringify(res.output).slice(0, 6000)}`,
              preferredProvider: cfg ? cfg.provider : null,
              preferredModel: cfg ? cfg.model : null,
            });
            ai = { provider: r.provider, summary: (r.text || '').slice(0, 3000) };
          } catch (e) {
            ai = { provider: null, summary: `AI enrichment unavailable: ${e.message}` };
          }
        }
        logStep(job, { agent: agentId, name: 'analysis', state: res.state, output: { ...res.output, hint: res.hint || undefined, ai } });
        if (res.state === 'DONE') logLine(job, `Agent ${agentId} finished (DONE).`);
        else logLine(job, `Agent ${agentId} reported ${res.state}${res.hint ? ' - ' + res.hint : ''}.`);
      } else {
        failed = true;
        logStep(job, { agent: agentId, name: 'analysis', state: 'FAILED', output: res.output });
        logLine(job, `Agent ${agentId} FAILED: ${(res.output && res.output.error) || 'unknown error'}.`);
      }
    } catch (e) {
      failed = true;
      logStep(job, { agent: agentId, name: 'analysis', state: 'FAILED', output: { error: e.message } });
      logLine(job, `Agent ${agentId} threw: ${e.message}.`);
    }
  }

  job.state = failed ? 'DONE_WITH_ERRORS' : 'DONE';
  job.updatedAt = store.now();
  saveJob(job);
  logLine(job, `Job ${jobId} finished with state ${job.state}.`);
  emit({ event: 'job:event', jobId, state: job.state });
  finalize(job);
}

function finalize(job) {
  sandbox.cleanupWorkspace(job.id);
  if (job.projectId) {
    const summary = `${job.type} over ${(job.fileId || '').slice(0, 10)}: ${job.state}`;
    store.addHistory(job.projectId, job.id, job.state, summary);
  }
}

module.exports = {
  CATALOG, PIPELINE_ORDER, agentById,
  createJob, cancelJob, retryJob, getJob, setBroadcaster, prepareWorkspace, buildContext, EXECUTORS,
};
