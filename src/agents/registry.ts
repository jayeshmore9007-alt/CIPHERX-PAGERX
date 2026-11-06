// Mobile-only catalog constants. The executable agent implementations live in the backend.
export const PIPELINE_ORDER = [
  'apk', 'manifest', 'dex', 'resource', 'code', 'native', 'ui',
  'apimapper', 'network', 'security', 'dependency', 'logic', 'behavior', 'report',
];

export const AGENT_NAMES: Record<string, string> = {
  apk: 'APK Analyzer',
  manifest: 'Manifest Agent',
  dex: 'DEX Analyzer',
  resource: 'Resource Analyzer',
  code: 'Code Intelligence Agent',
  native: 'Native Analyzer',
  ui: 'UI Reconstruction Agent',
  apimapper: 'API Mapper',
  network: 'Network Analyzer',
  security: 'Security Auditor',
  dependency: 'Dependency Agent',
  logic: 'Logic Mapper',
  behavior: 'Behavior Analyzer',
  report: 'Report Generator',
};

export const SUPPORTED_FORMATS = [
  'apk', 'aab', 'zip', 'dex', 'jar', 'so',
];

export const DEVICE_ALLOWLIST = [
  'status', 'uptime', 'ifconfig', 'df -h', 'log tail',
];
