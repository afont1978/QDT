from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
import os, time, uuid

AUTH = os.getenv("API_AUTH_TOKEN", "")

app = FastAPI(title="QDT TwinCore", version="0.1.0")

def check_auth(x_api_token: Optional[str]):
    if AUTH and x_api_token != AUTH:
        raise HTTPException(status_code=401, detail="Unauthorized")

class TwinCreate(BaseModel):
    name: str
    kind: str = Field(..., description="e.g., district, grid, rail, water, airport")
    metadata: Dict[str, Any] = {}

class Twin(BaseModel):
    id: str
    name: str
    kind: str
    metadata: Dict[str, Any]

class StatePatch(BaseModel):
    ts: float = 0.0
    payload: Dict[str, Any]

# TRL4 NOTE:
# Start with in-memory stores for rapid demo.
# Upgrade to Postgres tables when you harden.
TWINS: Dict[str, Dict[str, Any]] = {}
STATE: Dict[str, Dict[str, Any]] = {}

@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "twin-core"}

@app.post("/api/twins", response_model=Twin)
def create_twin(req: TwinCreate, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    twin_id = f"twin_{uuid.uuid4().hex[:12]}"
    TWINS[twin_id] = {"id": twin_id, **req.model_dump()}
    STATE[twin_id] = {"id": twin_id, "ts": time.time(), "payload": {}}
    return TWINS[twin_id]

@app.get("/api/twins/{twin_id}", response_model=Twin)
def get_twin(twin_id: str, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    if twin_id not in TWINS:
        raise HTTPException(status_code=404, detail="Twin not found")
    return TWINS[twin_id]

@app.get("/api/twins")
def list_twins(x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    return {"twins": list(TWINS.values())}

@app.post("/api/state/{twin_id}")
def patch_state(twin_id: str, req: StatePatch, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    if twin_id not in TWINS:
        raise HTTPException(status_code=404, detail="Twin not found")
    ts = req.ts or time.time()
    STATE[twin_id] = {"id": twin_id, "ts": ts, "payload": req.payload}
    return STATE[twin_id]

@app.get("/api/state/{twin_id}")
def get_state(twin_id: str, x_api_token: Optional[str] = Header(default=None)):
    check_auth(x_api_token)
    if twin_id not in STATE:
        raise HTTPException(status_code=404, detail="State not found")
    return STATE[twin_id]
