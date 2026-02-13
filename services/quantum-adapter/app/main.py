from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import os, time, random

AUTH = os.getenv("API_AUTH_TOKEN", "")
MODE = os.getenv("MODE", "SIMULATOR")

app = FastAPI(title="QDT Quantum Adapter", version="0.1.0")

def check_auth(x_api_token: Optional[str]):
    if AUTH and x_api_token != AUTH:
        raise HTTPException(status_code=401, detail="Unauthorized")

class Job(BaseModel):
    twin_id: str
    problem_type: str
    size: int
    deadline_ms: int
    risk: str = "LOW"
    payload: Dict[str, Any] = {}

@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "quantum-adapter", "mode": MODE}

@app.post("/api/quantum/solve")
def solve(job: Job, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)

    seed = (job.size * 1315423911) ^ (hash(job.problem_type) & 0xFFFFFFFF)
    random.seed(seed)

    n = min(max(job.size, 1), 64)
    x = [random.randint(0, 1) for _ in range(n)]
    objective = sum(x) / n + random.random() * 0.01

    return {
        "mode": MODE,
        "objective": objective,
        "solution": {"x": x},
        "meta": {"n_vars": n, "note": "simulated quantum solve"},
        "ts": time.time(),
    }
