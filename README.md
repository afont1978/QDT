# QDT — Hybrid Quantum–Classical Digital Twin Prototype (TRL4)

This repo scaffolds a deployable TRL4-style prototype for **large & complex infrastructures**, branded as **QDT** for **PlanckTech**.

**Deployment topology**
- **Frontend + API proxy:** Next.js app deployed on **Vercel**
- **Backend runtime:** your **laptop** running Docker Compose (TwinCore + Orchestrator + Quantum Adapter)
- **Secure public ingress:** **Cloudflare Tunnel** at `https://qdt.plancktech.com`

## What’s included (TRL4-ready baseline)
- Twin registry & state sync (TwinCore)
- Hybrid routing + fallback (Orchestrator)
- Provider-agnostic quantum adapter (simulator mode; extend to Qiskit/QPU later)
- Vercel-safe API proxy routes (secrets never exposed to browser)
- One-command local backend (`docker compose up`)
- Minimal Control Room UI (create twin, push state, execute job, view route decision/result)

---

## 1) Run backend on your laptop

### Prerequisites
- Docker Desktop installed
- (Optional) Cloudflared installed for the tunnel

### Start services
```bash
cd infra
cp .env.example .env
# edit .env to set a long random API_AUTH_TOKEN
docker compose up --build
```

Services:
- TwinCore: http://localhost:8001
- Orchestrator: http://localhost:8002
- Quantum Adapter: http://localhost:8003

### Smoke test (Orchestrator entrypoint)
```bash
curl -s http://localhost:8002/healthz
```

---

## 2) Expose your laptop backend via Cloudflare Tunnel (qdt.plancktech.com)

Create tunnel + DNS route (example):
```bash
cloudflared tunnel login
cloudflared tunnel create qdt
cloudflared tunnel route dns qdt qdt.plancktech.com
cloudflared tunnel run qdt
```

Config file template is in: `infra/cloudflared/config.yml.template`

After running, your backend should be reachable at:
- https://qdt.plancktech.com/healthz

---

## 3) Run frontend locally
```bash
cd apps/web
npm install
npm run dev
```
Open: http://localhost:3000

---

## 4) Deploy frontend on Vercel

Import this repo in Vercel.

**Important:** Set the **Root Directory** to `apps/web`.

Add Vercel Environment Variables:
- `BACKEND_BASE_URL` = `https://qdt.plancktech.com`
- `API_AUTH_TOKEN` = (same secret as `infra/.env`)

Deploy.

---

## Folder structure
- `apps/web` — Next.js UI + Vercel API proxy
- `services/twin-core` — Twin registry + state API (FastAPI)
- `services/orchestrator` — Hybrid router + execute + fallback (FastAPI)
- `services/quantum-adapter` — Quantum adapter (simulator now)
- `infra` — docker-compose + tunnel config template

---

## Next upgrades (when you’re ready)
- Persist twins/state in Postgres (Alembic migrations placeholder)
- Async job queue (Redis + RQ/Celery) for longer quantum calls
- OpenTelemetry tracing across services
- Add real solver backends (Qiskit, Braket, Azure Quantum) behind `quantum-adapter`

