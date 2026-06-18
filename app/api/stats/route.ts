import { NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function GET() {
  try {
    const stats = await appscript.get("getStats");
    return NextResponse.json(stats);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
