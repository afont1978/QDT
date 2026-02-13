from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional, Literal
import os, time, yaml, httpx, uuid

AUTH = os.getenv("API_AUTH_TOKEN", "")
TWINCORE_URL = os.getenv("TWINCORE_URL", "http://localhost:8001").rstrip("/")
QADAPTER_URL = os.getenv("QADAPTER_URL", "http://localhost:8003").rstrip("/")
POLICY_PATH = os.getenv("ROUTING_POLICY_PATH", "policy/policy.yaml")

app = FastAPI(title="QDT Hybrid Orchestrator", version="0.1.0")

def check_auth(x_api_token: Optional[str]):
    if AUTH and x_api_token != AUTH:
        raise HTTPException(status_code=401, detail="Unauthorized")

def load_policy() -> Dict[str, Any]:
    with open(POLICY_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

Risk = Literal["LOW", "MED", "HIGH", "CRITICAL"]

class Job(BaseModel):
    twin_id: str
    problem_type: str  # dispatch | routing | restoration | ...
    size: int          # proxy for problem size/complexity
    deadline_ms: int
    risk: Risk = "LOW"
    payload: Dict[str, Any] = {}

@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "orchestrator"}

@app.post("/api/route")
def route(job: Job, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    policy = load_policy()
    thresholds = policy.get("thresholds", {})
    blocked = set(policy.get("risk_blocks_quantum", []))

    if job.risk in blocked:
        return {"route": "CLASSICAL", "why": f"risk={job.risk} blocks quantum"}

    min_size = int(thresholds.get("min_size_for_quantum", 200))
    min_deadline = int(thresholds.get("min_deadline_ms_for_quantum", 15000))

    if job.problem_type in ("dispatch", "routing", "restoration") and job.size >= min_size:
        if job.deadline_ms >= min_deadline:
            return {"route": "QUANTUM", "why": "combinatorial & time allows"}
        return {"route": "CLASSICAL", "why": "deadline too tight for quantum"}
    return {"route": "CLASSICAL", "why": "below quantum thresholds"}

@app.post("/api/execute")
async def execute(job: Job, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    decision = route(job, x_api_token)

    headers = {"x-api-token": x_api_token} if x_api_token else {}
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            # Ensure twin exists
            tr = await client.get(f"{TWINCORE_URL}/api/twins/{job.twin_id}", headers=headers)
            tr.raise_for_status()

            if decision["route"] == "QUANTUM":
                r = await client.post(f"{QADAPTER_URL}/api/quantum/solve", json=job.model_dump(), headers=headers)
                r.raise_for_status()
                return {
                    "request_id": request_id,
                    "route": "QUANTUM",
                    "why": decision["why"],
                    "fallback_used": False,
                    "result": r.json(),
                    "ts": time.time(),
                }

            return {
                "request_id": request_id,
                "route": "CLASSICAL",
                "why": decision["why"],
                "fallback_used": False,
                "result": {"status": "ok", "note": "classical placeholder", "ts": time.time()},
                "ts": time.time(),
            }

        except Exception as e:
            return {
                "request_id": request_id,
                "route": "CLASSICAL",
                "why": f"fallback after error: {type(e).__name__}",
                "fallback_used": True,
                "result": {"status": "fallback", "error": str(e), "ts": time.time()},
                "ts": time.time(),
            }
