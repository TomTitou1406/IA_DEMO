// /app/api/get-session-token/route.ts
import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from .env");
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: "session_id requis" }, { status: 400 });
    }

    const heygenRes = await fetch("https://api.heygen.com/v1/streaming.session_token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HEYGEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id }),
    });

    if (!heygenRes.ok) {
      const errText = await heygenRes.text();
      return NextResponse.json({ error: "HeyGen error: " + errText }, { status: heygenRes.status });
    }

    const data = await heygenRes.json(); // { token: ... }
    return NextResponse.json({ token: data.token });
  } catch (error: any) {
    console.error("Error retrieving session token:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve session token" }, { status: 500 });
  }
}
