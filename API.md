# CIPHERX AI API - v0.7.0

Base URL: `http://<host>:8080`. WebSocket: `ws://<host>:8080/ws`.
All `/api/*` routes except `/api/health` and `/api/auth/login` require the
session header `x-cipherx-session: <token>`.

## Health and audit
| Method | Route | Description |
|---|---|---|
| GET | /api/health | Service status and version |
| GET | /api/audit | Structured audit log (denials, enrollment, commands) |

## Authentication
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/login | Body `{username, password}` -> session token |
| POST | /api/auth/logout | Invalidate session |

## AI providers and keys
| Method | Route | Description |
|---|---|---|
| GET | /api/ai/providers | 6 providers with honest CONFIGURED/NOT_CONFIGURED status |
| GET | /api/keys | List provider ids with a stored (encrypted) key |
| POST | /api/keys | Body `{provider, key}` - store AES-256-GCM encrypted key |
| DELETE | /api/keys/:provider | Delete stored key |

## Agents
| Method | Route | Description |
|---|---|---|
| GET | /api/agents | Full 14-agent catalog (id, name, role, inputs, outputs) |
| GET | /api/ai/agent-config | Default and per-agent model assignments |
| PUT | /api/ai/agent-config/:agentId | Body `{provider, model}` per-agent routing |
| POST | /api/agents/:agentId/task | Body `{input, projectId?, fileId?}` - run one agent |

## Projects and files
| Method | Route | Description |
|---|---|---|
| GET | /api/projects | List projects |
| POST | /api/projects | Body `{name}` - create project |
| GET | /api/projects/:id | Project detail + analysis history + notes |
| POST | /api/projects/:id/files | Multipart `file` + `authorized=true`; magic-byte validated |
| POST | /api/projects/:id/notes | Body `{text}` - operator note |

## Jobs
| Method | Route | Description |
|---|---|---|
| GET | /api/jobs | Queue overview |
| GET | /api/jobs/:id | Job detail: steps, logs, state |
| POST | /api/jobs | Body `{projectId, fileId, type?, authorized:true}` - full pipeline |
| POST | /api/jobs/:id/cancel | Cancel a QUEUED/RUNNING job |
| POST | /api/jobs/:id/retry | Retry a FAILED/CANCELLED job (max 2 retries) |
| GET | /api/jobs/:id/report?format=html|pdf | Report export |

## Tools
| Method | Route | Description |
|---|---|---|
| GET | /api/tools | Real `which`-based tool status (INSTALLED/TOOL_NOT_INSTALLED) |
| GET | /api/relab/tools | Legacy alias of /api/tools |

## Wi-Fi
| Method | Route | Description |
|---|---|---|
| POST | /api/wifi/analyze | Body `{rssi, latencyMs, packetLoss, security}` -> rating, findings |

## PAGER-X (authorized devices)
| Method | Route | Description |
|---|---|---|
| GET | /api/pagerx/status | SSH availability and allowlist message |
| GET | /api/devices | Enrolled devices with status (PENDING/APPROVED/REVOKED) |
| POST | /api/devices | Body `{name, host, user, port}` - enroll as PENDING |
| POST | /api/devices/:id/approve | Approve enrollment |
| POST | /api/devices/:id/revoke | Revoke access |
| GET | /api/devices/:id/health | TCP health check with detail |
| GET | /api/devices/:id/tasks | Command task history |
| POST | /api/pagerx/command | Body `{deviceId, command}` - hard allowlist only; 403 + audit otherwise |

## WebSocket events (/ws)
`job:created`, `job:event` (state changes), `job:step` (per-step progress with
agent, name, state, output). Payloads include `jobId`.
