import { NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function GET() {
  try {
    const players = await appscript.get("getPlayers");
    return NextResponse.json(players);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
