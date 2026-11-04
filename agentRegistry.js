// agentRegistry.js - thin re-export of the agent catalog + intent routing.
const orchestrator = require('./agentOrchestrator');

/** Route a free-text task to the best-matching agent id. */
function routeIntent(text) {
  const t = String(text || '').toLowerCase();
  const rules = [
    ['manifest|permission', 'manifest'],
    ['native|\.so|elf', 'native'],
    ['layout|ui|screen', 'ui'],
    ['endpoint|api|url|domain', 'apimapper'],
    ['network|ssl|tls|certificate', 'network'],
    ['secur|vulnerab|risk', 'security'],
    ['librar|sdk|depend', 'dependency'],
    ['architect|module|logic', 'logic'],
    ['behavior|receiver|service|scheduler', 'behavior'],
    ['resource|asset', 'resource'],
    ['dex|class|package', 'dex'],
    ['decompil|source|java|kotlin', 'code'],
    ['report|summary', 'report'],
    ['apk|package|archive', 'apk'],
  ];
  for (const [rx, agent] of rules) {
    if (new RegExp(rx).test(t)) return agent;
  }
  return 'report';
}

module.exports = {
  CATALOG: orchestrator.CATALOG,
  PIPELINE_ORDER: orchestrator.PIPELINE_ORDER,
  agentById: orchestrator.agentById,
  routeIntent,
};
