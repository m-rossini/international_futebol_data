/**
 * Proxy browser tracking events to OpenObserve.
 *
 * Avoids CORS: browser → same-origin Next.js → OpenObserve.
 * Server-side: uses Docker service name (not localhost).
 */
import { NextRequest, NextResponse } from "next/server";

// Docker service name — reachable from server-side API routes.
// NEXT_PUBLIC_ vars are available server-side in Next.js API routes.
const OO_HOST = "http://openobserve:5080";
const OO_BASIC_AUTH = process.env.NEXT_PUBLIC_OO_BASIC_AUTH || "";
const OO_ORG = process.env.NEXT_PUBLIC_OO_ORG || "default";
const OO_STREAM = process.env.NEXT_PUBLIC_OO_STREAM || "web_events";

const INGEST_URL = `${OO_HOST}/api/${OO_ORG}/${OO_STREAM}/_json`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text(); // passthrough — don't parse

    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OO_BASIC_AUTH ? { Authorization: `Basic ${OO_BASIC_AUTH}` } : {}),
      },
      body,
    });

    return NextResponse.json(await res.json().catch(() => ({ status: res.status })), {
      status: res.status,
    });
  } catch {
    return NextResponse.json({ code: 502, message: "ingest proxy failed" }, { status: 502 });
  }
}
