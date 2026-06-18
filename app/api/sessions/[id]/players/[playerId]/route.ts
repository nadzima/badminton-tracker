import { NextRequest, NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    const result = await appscript.post("removeSessionPlayer", {
      sessionId: params.id,
      playerId: params.playerId,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
