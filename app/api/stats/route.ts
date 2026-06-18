import { NextResponse } from "next/server";
import { db } from "@/lib/sheets";
import { Match } from "@/lib/types";

export async function GET() {
  try {
    const [sessions, players, allMatches] = await Promise.all([
      db.sessions.list(),
      db.players.list(),
      db.matches.getForSession("__all__").catch(() => [] as Match[]),
    ]);

    // getForSession only works per session — fetch all matches differently
    // We'll load session by session (small dataset for a club)
    const completedSessions = sessions.filter((s) => s.status === "completed" || s.status === "active");
    let matches: Match[] = [];
    for (const s of completedSessions) {
      const m = await db.matches.getForSession(s.id);
      matches = matches.concat(m);
    }

    const completedMatches = matches.filter((m) => m.status === "completed");

    // Compute top player by wins
    const winMap = new Map<string, number>();
    completedMatches.forEach((m) => {
      const t1 = [m.team1_player1_id, m.team1_player2_id].filter(Boolean) as string[];
      const t2 = [m.team2_player1_id, m.team2_player2_id].filter(Boolean) as string[];
      if (m.winner_team === 1) t1.forEach((id) => winMap.set(id, (winMap.get(id) ?? 0) + 1));
      if (m.winner_team === 2) t2.forEach((id) => winMap.set(id, (winMap.get(id) ?? 0) + 1));
    });

    let topPlayerId: string | null = null;
    let maxWins = 0;
    winMap.forEach((wins, id) => {
      if (wins > maxWins) { maxWins = wins; topPlayerId = id; }
    });
    const topPlayer = players.find((p) => p.id === topPlayerId) ?? null;

    return NextResponse.json({
      totalSessions: sessions.length,
      totalPlayers: players.length,
      totalMatches: completedMatches.length,
      recentSessions: sessions.slice(0, 5),
      topPlayer,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
