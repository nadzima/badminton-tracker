import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/sheets";

export async function GET() {
  try {
    const sessions = await db.sessions.list();
    return NextResponse.json(sessions);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, location, notes, playerIds, newPlayerNames } =
      await req.json();

    // Create new players first
    const createdPlayers = [];
    for (const name of newPlayerNames ?? []) {
      const existing = await db.players.findByName(name);
      const p = existing ?? (await db.players.create(name));
      createdPlayers.push(p);
    }

    // Create session
    const session = await db.sessions.create({ date, location, notes });

    // Add all players to session
    const allIds = [
      ...(playerIds ?? []),
      ...createdPlayers.map((p) => p.id),
    ];
    for (const playerId of allIds) {
      await db.sessionPlayers.add(session.id, playerId);
    }

    // Return session + all players for display
    const allPlayers = await db.players.list();
    const sessionPlayerObjs = allPlayers.filter((p) => allIds.includes(p.id));

    return NextResponse.json(
      { session, players: sessionPlayerObjs },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
