# Cloud Deployment Guide (beginner-friendly) - v0.7.0

The backend is a single Node.js service with a JSON-file datastore. This
makes it perfect for free tiers. Recommended order: Railway -> Render -> VPS.

## Option A: Railway (easiest)
1. Create a free account at https://railway.app (no credit card needed to
   start).
2. Push this repository to GitHub.
3. In Railway: **New Project -> Deploy from GitHub repo** and select the repo.
4. Set the **Root Directory** to `backend`.
5. In **Variables**, add every variable from `backend/.env.example` with your
   real values (see the table below).
6. Railway builds the Dockerfile automatically and gives you a public URL
   like `https://<name>.up.railway.app`. The app's Settings screen accepts
   that URL directly.
7. Enable the included volume (`/app/data`) so projects, uploads, reports and
   the store persist across restarts.

## Option B: Render (free web service)
1. Free account at https://render.com.
2. **New -> Web Service**, connect the GitHub repo.
3. Root Directory: `backend`. Environment: Docker (uses `backend/Dockerfile`).
4. Add the environment variables from `backend/.env.example`.
5. Free-tier notes: the service sleeps after inactivity (first request is
   slow) and has 512 MB RAM. Add a persistent disk mounted at `/app/data`
   (paid feature) or accept that data resets on redeploy.

## Option C: VPS (full control, e.g. a cheap Ubuntu box)
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Copy the project to the server, then:
cd CIPHERX-AI-PAGER-X-v0.7.0
cp backend/.env.example backend/.env
nano backend/.env            # fill in real secrets

# 3. Start
docker compose up -d

# 4. Check
curl http://localhost:8080/api/health
```
Put an HTTPS reverse proxy (Caddy or nginx + Let's Encrypt) in front for
production, since session tokens travel in headers.

## Required environment variables
| Variable | Meaning |
|---|---|
| PORT | HTTP port (default 8080) |
| DATA_DIR | Persistent data directory (default ./data) |
| AUTH_USERNAME / AUTH_PASSWORD | Operator login (default operator / change it!) |
| SESSION_SECRET | Random long string for session tokens |
| VAULT_MASTER_KEY | 32-byte secret for AES-256-GCM key vault (generate once, keep safe) |
| MAX_FILE_MB / STEP_TIMEOUT_MS / MAX_OUTPUT_CHARS | Intake and worker limits |
| OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY | Optional - any subset. Ollama needs OLLAMA_BASE_URL. |

**Never commit `.env`. Only `.env.example` is exported and it contains no
secrets.**

## Analysis tools on the server
The Docker image installs `unzip`, `binutils` and `openssh-client`, plus a
JRE so JADX can run. For full APKTool support, add it inside the image or a
custom Dockerfile layer (see docs/RELAB.md for what each tool unlocks). The
`GET /api/tools` endpoint always tells you the truth about what is installed.

## Free-tier limits and when to upgrade
| Limit | Free tier impact | Upgrade trigger |
|---|---|---|
| RAM (512 MB - 1 GB) | JADX may fail on very large APKs | Analyzing 100+ MB APKs |
| Ephemeral disk | Uploads/history lost on restart | Add a volume |
| Sleep on idle | First request slow | Always-on plan |
| CPU | Pipeline runs sequentially | Many concurrent users |
