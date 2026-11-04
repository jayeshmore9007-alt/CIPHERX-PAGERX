# Deep Reverse Engineering Lab - v0.7.0

Authorized analysis of APK, AAB, DEX, JAR, ZIP and SO files.

## Intake validation (real, not simulated)
Every upload is checked by magic bytes before anything else happens:
- APK / AAB / JAR / ZIP: ZIP signature `50 4B 03 04`
- DEX: `dex\n035\0` (DEX format 035/037/038/039)
- SO: ELF signature `7F 45 4C 46`

Mismatched extensions, unknown formats and oversized files are rejected with
an error and the stored bytes are deleted. Nothing is kept unvalidated.

## Workspace preparation (per job, isolated)
Under `DATA_DIR/jobs/<jobId>/`:
1. **JADX** (if installed): decompile DEX to `src/` for code agents.
2. **APKTool** (if installed): decode resources and manifest to `decoded/`.
3. **unzip** (if installed): extract archives for direct inspection.
4. **readelf** (if installed): native `.so` metadata.

If a tool is missing, the step reports `TOOL_NOT_INSTALLED` with an install
hint; the rest of the pipeline still runs on whatever is available. No step
ever fabricates tool output.

## Agent analysis pipeline (execution order)
1. **apk** - APK Analyzer: package identity, signing, manifest basics
2. **manifest** - Manifest Agent: permissions, exported components
3. **dex** - DEX Analyzer: DEX classes, packages, counts
4. **resource** - Resource Analyzer: layouts, assets, strings
5. **code** - Code Intelligence: reconstructed Java/Kotlin structure
6. **native** - Native Analyzer: `.so` libraries, ELF metadata
7. **ui** - UI Reconstruction: screens and navigation structure
8. **apimapper** - API Mapper: endpoint discovery in code
9. **network** - Network Analyzer: cleartext policy, endpoints, config
10. **security** - Security Auditor: permissions, components, config risks
11. **dependency** - Dependency Agent: third-party library identification
12. **logic** - Logic Mapper: architectural mapping
13. **behavior** - Behavior Analyzer: runtime behavior indicators
14. **report** - Report Generator: HTML and PDF report

Each agent produces structured JSON output. If an AI provider is configured
for that agent, the model enriches the raw findings; if not, the raw
tool-based findings are returned with `ai: NOT_CONFIGURED` - never a fake
summary.

## Reports
`GET /api/jobs/:id/report?format=html|pdf`. Reports are only produced for
jobs that reached `DONE` or `DONE_WITH_ERRORS`, and clearly list per-agent
results, skipped steps and tool availability.

## Honest limitations
- Decompiled code is reconstructed output, never the original source.
- Reconstruction quality depends entirely on the installed tools.
- Analysis is capped by `MAX_FILE_MB`, `STEP_TIMEOUT_MS` and
  `MAX_OUTPUT_CHARS` (see `backend/.env.example`).
