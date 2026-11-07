# SANTOKI AI COMMANDER

## Purpose
SANTOKI is the Marathi-first central assistant for CIPHERX. The operator can describe a task in Marathi, Hindi, or English. SANTOKI classifies the request, selects a bounded agent domain, prepares a short plan in Marathi, and reports whether an approved executor is actually connected.

## Current implementation
- React Native screen: `src/screens/SantokiScreen.tsx`
- Dashboard entry: `src/screens/DashboardScreen.tsx`
- Navigation route: `src/nav/RootNavigator.tsx`
- API client: `src/api/client.ts`
- Authenticated backend routes: `POST /api/santoki/message` and `GET /api/santoki/capabilities`
- Planner and agent map: `backend/src/services/santokiCommander.js`
- Tests: `backend/test/santokiCommander.test.js`

## Agent domains
| Agent | Responsibility | Current executor state |
|---|---|---|
| Android Controller AI | Android app functions allowed by Android permissions | NOT_CONNECTED |
| PAGER-X Device Agent | Fixed, read-only diagnostics on an approved Pager | LIMITED_READ_ONLY |
| CIPHERX Project Agent | Project analysis, code changes, tests, build workflow | NOT_CONNECTED in mobile runtime |
| Backend Admin Agent | Authenticated health/configuration and approved maintenance | NOT_CONNECTED |
| Authorized Computer Agent | Allowlisted local files and developer workflows | NOT_CONNECTED |
| General Assistant | Explanation and task planning | PLAN_ONLY |

The central planner returns an agent ID, Marathi agent label, domain, executor state, and plan. It does not claim execution.

## Safety and execution contract
1. Do not expose arbitrary shell execution to chat input.
2. Every executor uses a fixed allowlist of action IDs and validates arguments independently.
3. Require explicit operator approval for consequential actions; show a preview first.
4. Bind device access to enrolled and approved devices. Never expose SSH publicly.
5. Keep audit records for approvals, denials, executor start, result, and errors.
6. Report NOT_CONNECTED when an integration is not installed or verified. Never simulate successful device control.

## Rollout phases
### Phase 1 — Central brain and routing (implemented foundation)
Marathi-first chat, authenticated API, bounded domain selection, agent labels, executor-state disclosure, safe planning, and unit tests.

### Phase 2 — Real CIPHERX and backend executors
Connect approved project operations (inspect files, run tests, generate reports) and backend diagnostics through fixed action IDs. Add preview, confirmation, audit, and result verification.

### Phase 3 — PAGER-X executor
Use the existing enrolled-device flow and strict SSH known-host verification. Start with health/status/uptime/interfaces/storage/log diagnostics only. Test against the owner's physical Pager before claiming live control.

### Phase 4 — Android and authorized computer integrations
Implement Android features only through supported Android APIs and granted permissions. Computer access must use a separately installed, authenticated local agent with pairing, per-action consent, fixed allowlists, and revocation. A phone app alone cannot silently control arbitrary desktop software.

### Phase 5 — Voice and persistent task context
Add speech-to-text and Marathi text-to-speech after selecting compatible providers and Android permissions. Add explicit user-visible task history and opt-in memory.

## Verification still required
- Run backend test suite and app TypeScript check in CI after these changes.
- Configure an AI provider key in the encrypted backend vault to enable provider-backed planning.
- Test API authentication and SANTOKI screen against a running backend.
- Physically test the PAGER-X executor on the owner's device.
- Build and install an APK only after CI and EAS configuration pass.
