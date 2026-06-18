import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const [session, allPlayers, playerIds, rawMatches] = await Promise.all([
      db.sessions.get(id),
      db.players.list(),
      db.sessionPlayers.getPlayerIds(id),
      db.matches.getForSession(id),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
    const players = playerIds
      .map((pid) => playerMap.get(pid))
      .filter(Boolean);

    // Attach nested player objects to each match
    const matches = rawMatches.map((m) => ({
      ...m,
      team1_player1: playerMap.get(m.team1_player1_id ?? "") ?? null,
      team1_player2: playerMap.get(m.team1_player2_id ?? "") ?? null,
      team2_player1: playerMap.get(m.team2_player1_id ?? "") ?? null,
      team2_player2: playerMap.get(m.team2_player2_id ?? "") ?? null,
    }));

    return NextResponse.json({ session, players, allPlayers, matches });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    await db.sessions.update(params.id, data);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.sessions.delete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
