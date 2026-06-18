import { NextRequest, NextResponse } from "next/server";
import { appscript } from "@/lib/appscript";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const result = await appscript.post("addSessionPlayer", {
      sessionId: params.id,
      playerId: body.playerId,
      playerName: body.playerName,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
