import { NextResponse } from "next/server";

const base = process.env.BACKEND_BASE_URL;
const token = process.env.API_AUTH_TOKEN;

export async function POST(req: Request) {
  if (!base) return NextResponse.json({ detail: "BACKEND_BASE_URL not set" }, { status: 500 });
  const body = await req.json();
  const r = await fetch(`${base}/api/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-token": token || "",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
