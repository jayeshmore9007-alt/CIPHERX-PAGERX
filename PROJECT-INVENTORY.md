# PROJECT-INVENTORY.md - CIPHERX AI + PAGER-X v0.7.0

Complete file inventory of `CIPHERX-AI-PAGER-X-v0.7.0.zip`.
**Total files: 56** (54 source/configuration files + this inventory + the export report).

## Root
| File | Bytes | Description |
|---|---|---|
| README.md | 3754 | Project overview, quick start, scope, honesty notice |
| docker-compose.yml | 600 | Local cloud stack (backend service + data volume + healthcheck) |
| .gitignore | 344 | Excludes secrets, node_modules, data, analysis artifacts |
| PROJECT-INVENTORY.md | - | This file |
| EXPORT-REPORT.md | - | Export verification report |

## .github (CI)
| File | Bytes | Description |
|---|---|---|
| .github/workflows/android-apk.yml | 1072 | Backend tests job + EAS production APK job (EXPO_TOKEN secret) |

## app/ (Android - React Native + Expo + TypeScript)
| File | Bytes | Description |
|---|---|---|
| app/app.json | 805 | Expo config, v0.7.0, versionCode 7, com.jayeshmore.cipherxai |
| app/App.tsx | 980 | Boot component |
| app/assets/README.md | 840 | Required icon/splash images (must be supplied before build) |
| app/eas.json | 508 | 3 EAS profiles, all android.buildType "apk" (dev/preview/production) |
| app/package.json | 1082 | Dependencies + build scripts |
| app/tsconfig.json | 181 | TypeScript config |
| app/src/theme.ts | 880 | Ultra cyberpunk theme (#000000, #00FF9C, #38E8FF) |
| app/src/components/cyber.tsx | 3993 | Shared UI components (Panel, GlowButton, StatusDot, Chip, Mono) |
| app/src/components/HoloCore.tsx | 2179 | Animated core visual |
| app/src/api/client.ts | 6315 | Full API client: auth, providers, keys, agents, projects, jobs, reports, WS |
| app/src/agents/registry.ts | 1017 | 14 agent names, pipeline order, formats, PAGER-X allowlist |
| app/src/nav/RootNavigator.tsx | 2574 | Navigation for all 11 screens |
| app/src/screens/DashboardScreen.tsx | 3622 | Live health, tools, jobs, WebSocket feed |
| app/src/screens/AgentsScreen.tsx | 5118 | Agent catalog, per-agent model config, single-agent execution |
| app/src/screens/ProjectsScreen.tsx | 6659 | Projects, authorized upload, pipeline launch, history, reports |
| app/src/screens/RelabScreen.tsx | 3204 | Deep RE Lab: tool status, formats, pipeline, honesty notice |
| app/src/screens/JobsScreen.tsx | 3906 | Job queue, live WS steps, cancel/retry |
| app/src/screens/WifiScreen.tsx | 3461 | Wi-Fi diagnostics (NetInfo + backend analysis) |
| app/src/screens/PagerXScreen.tsx | 6010 | Device enroll/approve/revoke, allowlisted commands, task history |
| app/src/screens/MonitorScreen.tsx | 2827 | Health, tools, WS feed, audit log |
| app/src/screens/SecurityScreen.tsx | 3426 | Policy, key handling, hardening, real status |
| app/src/screens/AutomationStudio.tsx | 5206 | Workflow composer, real job launching |
| app/src/screens/SettingsScreen.tsx | 5370 | Gateway, login, encrypted key management, build facts |

## backend/ (Node.js + Express)
| File | Bytes | Description |
|---|---|---|
| backend/package.json | 521 | v0.7.0, express/ws/dotenv, node --test runner |
| backend/.env.example | 868 | All environment variables, no real secrets |
| backend/Dockerfile | 815 | node:20-alpine + unzip/binutils/openssh/JDK, data volume, healthcheck |
| backend/.dockerignore | 72 | Build exclusions |
| backend/src/index.js | 14539 | 34 API routes, session auth, audit, upload, WS /ws |
| backend/src/services/persistence.js | 3449 | JSON store, schema v2, 9 collections |
| backend/src/services/fileIntake.js | 2585 | Real magic-byte validation (ZIP/DEX/ELF), size limits |
| backend/src/services/sandbox.js | 4186 | Per-job workspace, timeouts, output caps, tool checks |
| backend/src/services/keyVault.js | 1762 | AES-256-GCM encrypted API key storage |
| backend/src/services/modelGateway.js | 7727 | 6 providers, fallback, honest NOT_CONFIGURED |
| backend/src/services/agentOrchestrator.js | 23657 | 14 real agents, queue, cancel/retry, steps/logs, workspace prep |
| backend/src/services/agentRegistry.js | 1119 | Catalog re-export + intent routing |
| backend/src/services/deviceManager.js | 4118 | PAGER-X enrollment, approval, allowlisted SSH, health, tasks |
| backend/src/services/networkDiag.js | 3018 | Wi-Fi link-quality analysis |
| backend/src/services/reportService.js | 2077 | HTML + PDF report generation |
| backend/test/fileIntake.test.js | 2117 | Magic-byte validation tests |
| backend/test/networkDiag.test.js | 1622 | Wi-Fi analysis tests |
| backend/test/agents.test.js | 2885 | 14-agent catalog, routing, cancel/retry tests |
| backend/test/persistence.test.js | 2382 | Store CRUD tests |
| backend/test/keyVault.test.js | 1355 | Encryption round-trip tests |
| backend/test/deviceManager.test.js | 2140 | Enrollment/allowlist tests |
| backend/test/reportService.test.js | 1801 | Report generation tests |

## docs/
| File | Bytes | Description |
|---|---|---|
| docs/API.md | 3350 | All 34 endpoints documented |
| docs/RELAB.md | 2685 | Reverse engineering lab: intake, tools, 14-step pipeline |
| docs/BUILD.md | 2235 | EAS APK build guide, verification checklist |
| docs/DEPLOYMENT.md | 3278 | Railway / Render / VPS deployment, free-tier limits |
| docs/INSTALL-ANDROID.md | 2167 | Beginner APK installation guide |

## Deliberately excluded
- `node_modules/` (never installed in the packaging environment; no lockfiles exist)
- `backend/.env` (does not exist; only `.env.example` is exported)
- `backend/data/` runtime data, analysis artifacts (`*.apk` etc.)
- App icon images (not authored; `app/assets/README.md` explains requirements)
