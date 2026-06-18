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

export type MatchDraft = Omit<Match, "id" | "session_id" | "created_at">;

/**
 * Generate a fair multi-round schedule.
 *
 * Rules:
 * - Matches are grouped into rounds; each round runs `numCourts` matches in parallel.
 * - Players are selected each round by priority: fewest total matches played first,
 *   then those who rested last round (avoiding back-to-back play when possible).
 * - Pair assignments within a round are random.
 */
export function generateFairSchedule(
  players: Player[],
  totalMatches: number,
  numCourts: number,
  startMatchNumber: number = 1
): MatchDraft[] {
  if (players.length < 4 || totalMatches < 1) return [];

  const maxCourtsPerRound = Math.floor(players.length / 4);
  const courts = Math.min(numCourts, maxCourtsPerRound);
  if (courts === 0) return [];

  const rounds = Math.ceil(totalMatches / courts);
  const playCount = new Map<string, number>(players.map((p) => [p.id, 0]));
  let lastRoundIds = new Set<string>();

  const result: MatchDraft[] = [];
  let matchNumber = startMatchNumber;
  let generated = 0;

  for (let round = 0; round < rounds && generated < totalMatches; round++) {
    const matchesThisRound = Math.min(courts, totalMatches - generated);
    const spotsNeeded = matchesThisRound * 4;

    // Shuffle first so equal-score players are ordered randomly
    const pool = shuffle([...players]);

    // Sort: lower score = higher priority
    // score = playCount * 2 + (playedLastRound ? 1 : 0)
    // This ensures fairness (play count) dominates, rest is a tiebreaker
    pool.sort((a, b) => {
      const sa = (playCount.get(a.id) ?? 0) * 2 + (lastRoundIds.has(a.id) ? 1 : 0);
      const sb = (playCount.get(b.id) ?? 0) * 2 + (lastRoundIds.has(b.id) ? 1 : 0);
      return sa - sb;
    });

    const take = Math.min(spotsNeeded, Math.floor(pool.length / 4) * 4);
    if (take === 0) break;

    // Re-shuffle the selected slice to randomise team/pair assignments
    const selected = shuffle(pool.slice(0, take));
    const actualCourts = Math.floor(selected.length / 4);
    const thisRound = new Set<string>();

    for (let c = 0; c < actualCourts; c++) {
      const b = c * 4;
      result.push({
        match_number: matchNumber++,
        court: `Court ${c + 1}`,
        status: "pending",
        team1_player1_id: selected[b].id,
        team1_player2_id: selected[b + 1].id,
        team2_player1_id: selected[b + 2].id,
        team2_player2_id: selected[b + 3].id,
        team1_score: null,
        team2_score: null,
        winner_team: null,
      });
      thisRound.add(selected[b].id);
      thisRound.add(selected[b + 1].id);
      thisRound.add(selected[b + 2].id);
      thisRound.add(selected[b + 3].id);
    }

    thisRound.forEach((id) => playCount.set(id, (playCount.get(id) ?? 0) + 1));
    lastRoundIds = thisRound;
    generated += actualCourts;
  }

  return result;
}

/** Preview stats for the schedule UI — no side effects. */
export function calcSchedulePreview(
  playerCount: number,
  totalMatches: number,
  numCourts: number
): {
  courtsUsed: number;
  rounds: number;
  avgMatchesPerPlayer: number;
  restingPerRound: number;
  canRest: boolean;
} {
  if (playerCount < 4) return { courtsUsed: 0, rounds: 0, avgMatchesPerPlayer: 0, restingPerRound: 0, canRest: false };
  const courtsUsed = Math.min(numCourts, Math.floor(playerCount / 4));
  const rounds = courtsUsed > 0 ? Math.ceil(totalMatches / courtsUsed) : 0;
  const playingPerRound = courtsUsed * 4;
  const restingPerRound = Math.max(0, playerCount - playingPerRound);
  const avgMatchesPerPlayer = playerCount > 0 ? (totalMatches * 4) / playerCount : 0;
  return {
    courtsUsed,
    rounds,
    avgMatchesPerPlayer,
    restingPerRound,
    canRest: restingPerRound > 0,
  };
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
