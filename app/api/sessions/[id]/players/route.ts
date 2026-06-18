import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { playerId, playerName } = await req.json();

    let pid = playerId as string | undefined;

    if (!pid && playerName) {
      const existing = await db.players.findByName(playerName);
      const p = existing ?? (await db.players.create(playerName));
      pid = p.id;
    }

    if (!pid) {
      return NextResponse.json({ error: "No player specified" }, { status: 400 });
    }

    await db.sessionPlayers.add(params.id, pid);

    const allPlayers = await db.players.list();
    const player = allPlayers.find((p) => p.id === pid);
    return NextResponse.json(player ?? { id: pid });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
