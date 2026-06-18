import { NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function GET() {
  try {
    await db.setup();
    return NextResponse.json({ ok: true, message: "Spreadsheet initialized!" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
