// client.ts - real API client for the CIPHERX backend.
// Session token is stored in the device secure store (expo-secure-store).
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const TOKEN_KEY = 'cipherx-session-token';
let gateway: string | null = null;

export async function setGateway(url: string): Promise<void> {
  gateway = url.replace(/\/$/, '');
  await SecureStore.setItemAsync('cipherx-gateway', gateway);
}

export async function initGateway(): Promise<string> {
  if (!gateway) {
    gateway = (await SecureStore.getItemAsync('cipherx-gateway')) || 'http://127.0.0.1:8080';
  }
  return gateway;
}

async function token(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function call<T>(method: string, path: string, body?: any): Promise<T> {
  const base = await initGateway();
  const t = await token();
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { 'x-cipherx-session': t } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).error || `Request failed (${res.status})`);
  }
  return data as T;
}

// System
export const health = () => call<{ status: string; version?: string; uptime?: number }>('GET', '/api/health');
export const getTools = () => call<{ tools: Record<string, string> }>('GET', '/api/tools');
export const auditLog = () => call<{ entries: any[] }>('GET', '/api/audit');

// Auth
export const login = (username: string, password: string) =>
  call<{ token: string }>('POST', '/api/auth/login', { username, password }).then(async (r) => {
    await SecureStore.setItemAsync(TOKEN_KEY, r.token);
    return r;
  });
export const logout = () => call<{ ok: boolean }>('POST', '/api/auth/logout');

// AI providers and keys
export const aiProviders = () => call<{ providers: any[] }>('GET', '/api/ai/providers');
export const storedKeys = () => call<{ keys: string[] }>('GET', '/api/keys');
export const storeProviderKey = (providerId: string, key: string) =>
  call<{ ok: boolean }>('POST', `/api/keys/${providerId}`, { key });
export const deleteProviderKey = (providerId: string) =>
  call<{ ok: boolean }>('DELETE', `/api/keys/${providerId}`);

// Agents
export const agents = () => call<{ agents: any[] }>('GET', '/api/agents');
export const agentConfig = () => call<{ defaults: any; agents: any[] }>('GET', '/api/ai/agent-config');
export const setAgentConfig = (agentId: string, provider: string, model: string) =>
  call<{ ok: boolean }>('PUT', `/api/ai/agent-config/${agentId}`, { provider, model });
export const runAgentTask = (agentId: string, input: string, projectId?: string, fileId?: string) =>
  call<{ jobId: string }>('POST', `/api/agents/${agentId}/task`, {
    input, projectId, fileId, authorized: true,
  });

// Projects
export const projects = () => call<{ projects: any[] }>('GET', '/api/projects');
export const createProject = (name: string) => call<any>('POST', '/api/projects', { name });
export const getProject = (id: string) => call<{ project: any; history: any[] }>('GET', `/api/projects/${id}`);
export const uploadProjectFile = (projectId: string, filename: string, base64: string) =>
  call<{ file: any }>('POST', `/api/projects/${projectId}/files`, { filename, base64, authorized: true });
export const addProjectNote = (projectId: string, text: string) =>
  call<{ ok: boolean }>('POST', `/api/projects/${projectId}/notes`, { text });

// Jobs
export const createAnalyzeJob = (projectId: string, fileId: string) =>
  call<{ jobId: string }>('POST', '/api/jobs', { projectId, fileId, authorized: true });
export const jobs = () => call<{ jobs: any[] }>('GET', '/api/jobs');
export const getJob = (id: string) => call<any>('GET', `/api/jobs/${id}`);
export const cancelJob = (id: string) => call<any>('POST', `/api/jobs/${id}/cancel`);
export const retryJob = (id: string) => call<any>('POST', `/api/jobs/${id}/retry`);
export function reportUrl(jobId: string, format: 'html' | 'pdf'): string {
  // Note: fetch-based download with session header; returns the raw URL for
  // simple cases and falls back to a message if the browser cannot authenticate.
  return `${gateway || ''}/api/jobs/${jobId}/report?format=${format}`;
}

// Wi-Fi
export const wifiAnalyze = (m: { rssi: number; latencyMs: number; packetLoss: number; security: string }) =>
  call<{ summary: string; issues: any[] }>('POST', '/api/wifi/analyze', m);

// PAGER-X
export const pagerxStatus = () => call<{ ssh: string; message?: string }>('GET', '/api/pagerx/status');
export const devices = () => call<{ devices: any[] }>('GET', '/api/devices');
export const enrollDevice = (d: { name: string; host: string; user: string; port: number }) =>
  call<any>('POST', '/api/devices', d);
export const approveDevice = (id: string) => call<any>('POST', `/api/devices/${id}/approve`);
export const revokeDevice = (id: string) => call<any>('POST', `/api/devices/${id}/revoke`);
export const deviceHealth = (id: string) => call<{ healthy: boolean; detail: string }>('GET', `/api/devices/${id}/health`);
export const deviceTasks = (id: string) => call<{ tasks: any[] }>('GET', `/api/devices/${id}/tasks`);
export const pagerxCommand = (deviceId: string, command: string) =>
  call<any>('POST', '/api/pagerx/command', { deviceId, command });
export const pagerxCommanderCapabilities = () =>
  call<any>('GET', '/api/pagerx/commander/capabilities');
export const pagerxCommanderMessage = (deviceId: string, message: string) =>
  call<any>('POST', '/api/pagerx/commander/message', { deviceId, message });

// WebSocket
export function openSocket(onEvent: (evt: any) => void): WebSocket {
  let ws: WebSocket;
  const connect = () => {
    const base = (gateway || 'http://127.0.0.1:8080').replace(/^http/, 'ws');
    ws = new WebSocket(`${base}/ws`);
    ws.onopen = async () => {
      const t = await token();
      ws.send(JSON.stringify({ type: 'auth', token: t }));
    };
    ws.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data as string)); } catch { /* ignore */ }
    };
    ws.onclose = () => { /* reconnection handled by screens via polling */ };
    ws.onerror = () => { /* silent; screens show DISCONNECTED states */ };
  };
  connect();
  return {
    close: () => { try { ws.close(); } catch { /* ignore */ } },
  } as unknown as WebSocket;
}

 // SANTOKI AI Commander
export const santokiMessage = (message: string) =>
  call<{ status: string; domain?: string; agent_id?: string; agent_label_mr?: string; executor_state?: string; summary_mr: string; steps_mr: string[]; needs_approval: boolean; execution: string }>('POST', '/api/santoki/message', { message });
export const santokiCapabilities = () => call<any>('GET', '/api/santoki/capabilities');
