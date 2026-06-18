import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    await db.sessionPlayers.remove(params.id, params.playerId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
