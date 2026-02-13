"use client";

import { useEffect, useState } from "react";

type Twin = { id: string; name: string; kind: string; metadata: any };

function jsonPretty(x: any) {
  try { return JSON.stringify(x, null, 2); } catch { return String(x); }
}

export default function Page() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<string>("");
  const [createName, setCreateName] = useState("Uptown District");
  const [createKind, setCreateKind] = useState("district");
  const [telemetry, setTelemetry] = useState('{\n  "load_mw": 120.5,\n  "pv_mw": 35.2,\n  "temp_c": 12.4\n}');
  const [job, setJob] = useState('{\n  "problem_type": "dispatch",\n  "size": 400,\n  "deadline_ms": 20000,\n  "risk": "LOW",\n  "payload": {\n    "horizon_steps": 24,\n    "assets": ["hp1","tes1","pv","grid"]\n  }\n}');
  const [stateResp, setStateResp] = useState<any>(null);
  const [execResp, setExecResp] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function refreshTwins() {
    setErr("");
    const r = await fetch("/api/twins", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) { setErr(data?.detail || "Failed to list twins"); return; }
    setTwins(data.twins || []);
    if (!selectedTwin && data.twins?.length) setSelectedTwin(data.twins[0].id);
  }

  useEffect(() => { refreshTwins(); }, []);

  async function createTwin() {
    setErr(""); setExecResp(null); setStateResp(null);
    const r = await fetch("/api/twins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: createName, kind: createKind, metadata: { owner: "PlanckTech", label: "QDT" } }),
    });
    const data = await r.json();
    if (!r.ok) { setErr(data?.detail || "Create failed"); return; }
    await refreshTwins();
    setSelectedTwin(data.id);
  }

  async function pushState() {
    setErr(""); setStateResp(null);
    if (!selectedTwin) { setErr("Select a twin first"); return; }
    let payload: any;
    try { payload = JSON.parse(telemetry); } catch { setErr("Telemetry must be valid JSON"); return; }

    const r = await fetch(`/api/state/${selectedTwin}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const data = await r.json();
    if (!r.ok) { setErr(data?.detail || "State update failed"); return; }
    setStateResp(data);
  }

  async function loadState() {
    setErr(""); setStateResp(null);
    if (!selectedTwin) { setErr("Select a twin first"); return; }
    const r = await fetch(`/api/state/${selectedTwin}`, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) { setErr(data?.detail || "Get state failed"); return; }
    setStateResp(data);
  }

  async function executeJob() {
    setErr(""); setExecResp(null);
    if (!selectedTwin) { setErr("Select a twin first"); return; }
    let j: any;
    try { j = JSON.parse(job); } catch { setErr("Job must be valid JSON"); return; }
    j.twin_id = selectedTwin;

    const r = await fetch(`/api/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(j),
    });
    const data = await r.json();
    if (!r.ok) { setErr(data?.detail || "Execute failed"); return; }
    setExecResp(data);
  }

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>QDT Control Room</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        Hybrid quantum–classical digital twin TRL4 prototype. UI on Vercel; backend on your laptop via Cloudflare Tunnel.
      </p>

      {err ? (
        <div style={{ padding: 12, border: "1px solid #c00", marginBottom: 16 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Twins</h2>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={refreshTwins}>Refresh</button>
            <select value={selectedTwin} onChange={(e) => setSelectedTwin(e.target.value)} style={{ flex: 1 }}>
              <option value="">(none)</option>
              {twins.map(t => <option key={t.id} value={t.id}>{t.name} — {t.kind} — {t.id}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Twin name" />
            <input value={createKind} onChange={(e) => setCreateKind(e.target.value)} placeholder="kind (district/grid/...)" />
          </div>
          <button onClick={createTwin} style={{ marginTop: 8 }}>Create twin</button>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>State</h2>
          <textarea
            value={telemetry}
            onChange={(e) => setTelemetry(e.target.value)}
            rows={10}
            style={{ width: "100%", fontFamily: "ui-monospace, monospace" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={pushState}>Push state</button>
            <button onClick={loadState}>Load state</button>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Execute job</h2>
          <textarea
            value={job}
            onChange={(e) => setJob(e.target.value)}
            rows={12}
            style={{ width: "100%", fontFamily: "ui-monospace, monospace" }}
          />
          <button onClick={executeJob} style={{ marginTop: 8 }}>Execute</button>
          <p style={{ opacity: 0.7, marginBottom: 0 }}>
            Orchestrator returns route decision (CLASSICAL/QUANTUM), rationale, and whether fallback was used.
          </p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Outputs</h2>
          <h3>State</h3>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {stateResp ? jsonPretty(stateResp) : "(none)"}
          </pre>
          <h3>Execution</h3>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {execResp ? jsonPretty(execResp) : "(none)"}
          </pre>
        </div>
      </section>

      <footer style={{ marginTop: 24, opacity: 0.7 }}>
        <small>PlanckTech — QDT — TRL4 prototype scaffold</small>
      </footer>
    </main>
  );
}
