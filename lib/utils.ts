import { Match, Player, PlayerRankStats } from "./types";

function extractDatePart(dateStr: string): string {
  // Handles "2026-06-18" (plain) and "2026-06-18T00:00:00.000Z" (Google Sheets serialised Date)
  return String(dateStr ?? "").split("T")[0];
}

export function formatDate(dateStr: string): string {
  const datePart = extractDatePart(dateStr);
  if (!datePart) return "Tanggal tidak diketahui";
  const date = new Date(datePart + "T00:00:00");
  if (isNaN(date.getTime())) return datePart;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const datePart = extractDatePart(dateStr);
  if (!datePart) return "";
  const date = new Date(datePart + "T00:00:00");
  if (isNaN(date.getTime())) return datePart;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Shuffle an array in-place using Fisher-Yates */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate random doubles pairs and build one round of matches.
 * Returns matches as partial Match objects (no id/session_id yet).
 */
export function generateRandomMatches(
  players: Player[],
  numCourts: number,
  startMatchNumber: number = 1
): Omit<Match, "id" | "session_id" | "created_at">[] {
  const shuffled = shuffle(players);
  const matches: Omit<Match, "id" | "session_id" | "created_at">[] = [];
  const maxCourts = Math.min(numCourts, Math.floor(shuffled.length / 4));

  for (let court = 0; court < maxCourts; court++) {
    const base = court * 4;
    matches.push({
      match_number: startMatchNumber + court,
      court: `Court ${court + 1}`,
      status: "pending",
      team1_player1_id: shuffled[base].id,
      team1_player2_id: shuffled[base + 1].id,
      team2_player1_id: shuffled[base + 2].id,
      team2_player2_id: shuffled[base + 3].id,
      team1_score: null,
      team2_score: null,
      winner_team: null,
    });
  }

  return matches;
}

/**
 * Calculate per-player ranking stats for a session.
 * Returns sorted array (best first).
 */
export function calcSessionRankings(
  matches: Match[],
  players: Player[]
): PlayerRankStats[] {
  const map = new Map<string, PlayerRankStats>();

  players.forEach((p) => {
    map.set(p.id, {
      player: p,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      pointsScored: 0,
      pointsConceded: 0,
      rankPoints: 0,
      winRate: 0,
      pointDiff: 0,
    });
  });

  const completed = matches.filter((m) => m.status === "completed");

  completed.forEach((m) => {
    const t1 = [m.team1_player1_id, m.team1_player2_id].filter(Boolean) as string[];
    const t2 = [m.team2_player1_id, m.team2_player2_id].filter(Boolean) as string[];
    const t1Won = m.winner_team === 1;
    const s1 = m.team1_score ?? 0;
    const s2 = m.team2_score ?? 0;

    t1.forEach((id) => {
      const s = map.get(id);
      if (!s) return;
      s.gamesPlayed++;
      s.pointsScored += s1;
      s.pointsConceded += s2;
      if (t1Won) { s.wins++; s.rankPoints += 2; } else { s.losses++; }
    });

    t2.forEach((id) => {
      const s = map.get(id);
      if (!s) return;
      s.gamesPlayed++;
      s.pointsScored += s2;
      s.pointsConceded += s1;
      if (!t1Won) { s.wins++; s.rankPoints += 2; } else { s.losses++; }
    });
  });

  const arr = Array.from(map.values()).map((s) => ({
    ...s,
    winRate: s.gamesPlayed > 0 ? s.wins / s.gamesPlayed : 0,
    pointDiff: s.pointsScored - s.pointsConceded,
  }));

  arr.sort((a, b) => {
    if (b.rankPoints !== a.rankPoints) return b.rankPoints - a.rankPoints;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsScored - a.pointsScored;
  });

  return arr.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function getWinnerLabel(match: Match): string {
  if (match.winner_team === 1) return "Team 1 Menang";
  if (match.winner_team === 2) return "Team 2 Menang";
  return "";
}

export function getPlayerName(
  playerId: string | null | undefined,
  players: Player[]
): string {
  if (!playerId) return "?";
  return players.find((p) => p.id === playerId)?.name ?? "?";
}
