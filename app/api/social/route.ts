import { NextResponse, NextRequest } from "next/server";

const KEY = process.env.AYRSHARE_API_KEY;
const BASE = "https://app.ayrshare.com/api";

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get("action");
  if (!KEY) return NextResponse.json({ configured: false });
  if (action === "profiles") {
    try {
      const r = await fetch(BASE + "/profiles", { headers: { Authorization: "Bearer " + KEY } });
      return NextResponse.json(await r.json());
    } catch { return NextResponse.json({ error: "fetch failed" }, { status: 500 }); }
  }
  return NextResponse.json({ configured: true });
}

export async function POST(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: "Ayrshare non configure - ajoutez AYRSHARE_API_KEY dans .env.local" }, { status: 503 });
  const body = await req.json();
  const { platforms, post, mediaUrls, scheduleDate } = body;
  const payload: Record<string, unknown> = { post, platforms };
  if (mediaUrls?.length) payload.mediaUrls = mediaUrls;
  if (scheduleDate) payload.scheduleDate = scheduleDate;
  try {
    const r = await fetch(BASE + "/post", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch { return NextResponse.json({ error: "Erreur reseau Ayrshare" }, { status: 500 }); }
}
