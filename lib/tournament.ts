import { Match } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TournamentFormat =
  | "round_robin"
  | "single_elim"
  | "double_elim"
  | "beregu"
  | "king_of_court";

export interface RRMatchSlot {
  matchNumber: number;
  t1p1: string;
  t1p2?: string;
  t2p1: string;
  t2p2?: string;
}

export interface RoundRobinConfig {
  _t: "round_robin";
  matchType: "singles" | "doubles";
  schedule: RRMatchSlot[][];
}

export interface ElimSlot {
  slot: string;
  matchNumber: number;
  p1Id: string | null;
  p2Id: string | null;
  p1Source?: { slot: string };
  p2Source?: { slot: string };
  autoWinnerId?: string;
}

export interface SingleElimConfig {
  _t: "single_elim";
  rounds: ElimSlot[][];
}

export interface DoubleElimConfig {
  _t: "double_elim";
  upper: ElimSlot[][];
  lower: ElimSlot[][];
  grandFinal: ElimSlot;
}

export interface BeruguTeam {
  id: string;
  name: string;
  playerIds: string[];
}

export interface BeruguRubber {
  id: string;
  label: string;
  matchNumber: number;
}

export interface BeruguTie {
  id: string;
  teamAId: string;
  teamBId: string;
  rubbers: BeruguRubber[];
}

export interface BeruguConfig {
  _t: "beregu";
  teams: BeruguTeam[];
  ties: BeruguTie[];
}

export interface KingOfCourtConfig {
  _t: "king_of_court";
  courts: number;
}

export type TournamentConfig =
  | RoundRobinConfig
  | SingleElimConfig
  | DoubleElimConfig
  | BeruguConfig
  | KingOfCourtConfig;

export interface RRStanding {
  playerId: string;
  mp: number;
  w: number;
  l: number;
  ps: number;
  pc: number;
  pts: number;
}

export interface ElimSlotState {
  p1Id: string | null;
  p2Id: string | null;
  winnerId: string | null;
  created: boolean;
}

// ── Parse ─────────────────────────────────────────────────────────────────────

export function parseTournamentConfig(notes: string): TournamentConfig | null {
  if (!notes || !notes.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed._t === "string") return parsed as TournamentConfig;
    return null;
  } catch {
    return null;
  }
}

// ── Round Robin ───────────────────────────────────────────────────────────────

/** Round-robin schedule using the circle algorithm.
 *  For singles: each player meets every other player once.
 *  For doubles: players paired into teams each round (4 per match). */
export function generateRRSchedule(
  playerIds: string[],
  matchType: "singles" | "doubles",
  startMatchNumber = 1
): RRMatchSlot[][] {
  if (matchType === "singles") return generateRRSingles(playerIds, startMatchNumber);
  return generateRRDoubles(playerIds, startMatchNumber);
}

function generateRRSingles(ids: string[], startMn: number): RRMatchSlot[][] {
  const players = ids.length % 2 === 0 ? [...ids] : [...ids, "BYE"];
  const half = players.length / 2;
  const rounds: RRMatchSlot[][] = [];
  let mn = startMn;
  for (let r = 0; r < players.length - 1; r++) {
    const round: RRMatchSlot[] = [];
    for (let i = 0; i < half; i++) {
      const p1 = players[i];
      const p2 = players[players.length - 1 - i];
      if (p1 !== "BYE" && p2 !== "BYE") round.push({ matchNumber: mn++, t1p1: p1, t2p1: p2 });
    }
    if (round.length) rounds.push(round);
    players.splice(1, 0, players.pop()!);
  }
  return rounds;
}

function generateRRDoubles(ids: string[], startMn: number): RRMatchSlot[][] {
  if (ids.length < 4) return [];
  const n = ids.length;
  const courtsPerRound = Math.floor(n / 4);
  const playCount = new Map(ids.map((id) => [id, 0]));
  const rounds: RRMatchSlot[][] = [];
  let mn = startMn;
  // Aim for each pair to meet roughly once — generate rounds until match count stable
  const targetRounds = Math.ceil((n - 1) / 3);
  for (let r = 0; r < targetRounds; r++) {
    const usedInRound = new Set<string>();
    const round: RRMatchSlot[] = [];
    const pool = [...ids].sort((a, b) => (playCount.get(a) ?? 0) - (playCount.get(b) ?? 0));
    for (let c = 0; c < courtsPerRound; c++) {
      const avail = pool.filter((id) => !usedInRound.has(id));
      if (avail.length < 4) break;
      const [t1p1, t1p2, t2p1, t2p2] = avail;
      round.push({ matchNumber: mn++, t1p1, t1p2, t2p1, t2p2 });
      [t1p1, t1p2, t2p1, t2p2].forEach((id) => {
        usedInRound.add(id);
        playCount.set(id, (playCount.get(id) ?? 0) + 1);
      });
    }
    if (round.length) rounds.push(round);
  }
  return rounds;
}

export function computeRRStandings(matches: Match[], playerIds: string[]): RRStanding[] {
  const map = new Map<string, RRStanding>(
    playerIds.map((id) => [id, { playerId: id, mp: 0, w: 0, l: 0, ps: 0, pc: 0, pts: 0 }])
  );
  matches
    .filter((m) => m.status === "completed")
    .forEach((m) => {
      const t1 = [m.team1_player1_id, m.team1_player2_id].filter(Boolean) as string[];
      const t2 = [m.team2_player1_id, m.team2_player2_id].filter(Boolean) as string[];
      const s1 = m.team1_score ?? 0, s2 = m.team2_score ?? 0;
      const t1Won = m.winner_team === 1;
      [...t1, ...t2].forEach((id) => {
        const s = map.get(id);
        if (!s) return;
        const inT1 = t1.includes(id);
        s.mp++;
        s.ps += inT1 ? s1 : s2;
        s.pc += inT1 ? s2 : s1;
        if ((inT1 && t1Won) || (!inT1 && !t1Won)) { s.w++; s.pts += 3; }
        else s.l++;
      });
    });
  return Array.from(map.values()).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.w !== a.w ? b.w - a.w : (b.ps - b.pc) - (a.ps - a.pc)
  );
}

// ── Single Elimination ────────────────────────────────────────────────────────

export function generateSingleElimBracket(playerIds: string[], startMn = 1): ElimSlot[][] {
  let size = 1;
  while (size < playerIds.length) size *= 2;
  const seeded: Array<string | null> = [...playerIds];
  while (seeded.length < size) seeded.push(null); // null = BYE

  const rounds: ElimSlot[][] = [];
  let mn = startMn;

  // Round 1
  const r1: ElimSlot[] = [];
  for (let i = 0; i < size / 2; i++) {
    const p1 = seeded[i * 2];
    const p2 = seeded[i * 2 + 1];
    const hasBye = !p1 || !p2;
    r1.push({
      slot: `R1-${i + 1}`,
      matchNumber: hasBye ? mn : mn,
      p1Id: p1,
      p2Id: p2,
      autoWinnerId: hasBye ? (p1 ?? p2 ?? undefined) : undefined,
    });
    mn++;
  }
  rounds.push(r1);

  // Subsequent rounds
  const numRounds = Math.log2(size);
  for (let r = 1; r < numRounds; r++) {
    const prev = rounds[r - 1];
    const round: ElimSlot[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      round.push({
        slot: r === numRounds - 1 ? "F" : r === numRounds - 2 ? `SF-${i + 1}` : `R${r + 1}-${i + 1}`,
        matchNumber: mn++,
        p1Id: null,
        p2Id: null,
        p1Source: { slot: prev[i * 2].slot },
        p2Source: { slot: prev[i * 2 + 1].slot },
      });
    }
    rounds.push(round);
  }
  return rounds;
}

/** Compute current player occupancy & winners for each slot given match results. */
export function computeElimState(
  rounds: ElimSlot[][],
  matches: Match[]
): Map<string, ElimSlotState> {
  const slotMap = new Map<string, ElimSlot>();
  rounds.flat().forEach((s) => slotMap.set(s.slot, s));
  const state = new Map<string, ElimSlotState>();

  for (let r = 0; r < rounds.length; r++) {
    for (const slot of rounds[r]) {
      let p1Id = slot.p1Id;
      let p2Id = slot.p2Id;
      if (slot.p1Source) p1Id = state.get(slot.p1Source.slot)?.winnerId ?? null;
      if (slot.p2Source) p2Id = state.get(slot.p2Source.slot)?.winnerId ?? null;
      if (slot.autoWinnerId) {
        state.set(slot.slot, { p1Id, p2Id, winnerId: slot.autoWinnerId, created: false });
        continue;
      }
      const match = matches.find((m) => m.match_number === slot.matchNumber);
      let winnerId: string | null = null;
      if (match?.winner_team === 1) {
        winnerId = match.team1_player1_id ?? match.team1_player2_id ?? null;
      } else if (match?.winner_team === 2) {
        winnerId = match.team2_player1_id ?? match.team2_player2_id ?? null;
      }
      state.set(slot.slot, { p1Id, p2Id, winnerId, created: !!match });
    }
  }
  return state;
}

/** Get slots that are ready to create matches for (both players known, no match yet). */
export function getSlotsReadyToCreate(
  rounds: ElimSlot[][],
  state: Map<string, ElimSlotState>
): Array<{ slot: ElimSlot; round: number }> {
  const ready: Array<{ slot: ElimSlot; round: number }> = [];
  rounds.forEach((round, r) => {
    round.forEach((slot) => {
      const s = state.get(slot.slot);
      if (s && s.p1Id && s.p2Id && !s.created && !slot.autoWinnerId) {
        ready.push({ slot, round: r });
      }
    });
  });
  return ready;
}

// ── Double Elimination ────────────────────────────────────────────────────────

export function generateDoubleElimBracket(
  playerIds: string[],
  startMn = 1
): { upper: ElimSlot[][]; lower: ElimSlot[][]; grandFinal: ElimSlot } {
  let size = 1;
  while (size < playerIds.length) size *= 2;
  const seeded: Array<string | null> = [...playerIds];
  while (seeded.length < size) seeded.push(null);

  let mn = startMn;
  const upper: ElimSlot[][] = [];
  const lower: ElimSlot[][] = [];

  // Upper bracket (standard single elim)
  const ur1: ElimSlot[] = [];
  for (let i = 0; i < size / 2; i++) {
    const p1 = seeded[i * 2], p2 = seeded[i * 2 + 1];
    const hasBye = !p1 || !p2;
    ur1.push({ slot: `U-R1-${i + 1}`, matchNumber: mn++, p1Id: p1, p2Id: p2, autoWinnerId: hasBye ? (p1 ?? p2 ?? undefined) : undefined });
  }
  upper.push(ur1);

  const uRounds = Math.log2(size);
  for (let r = 1; r < uRounds; r++) {
    const prev = upper[r - 1];
    const round: ElimSlot[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      round.push({ slot: r === uRounds - 1 ? "U-F" : `U-R${r + 1}-${i + 1}`, matchNumber: mn++, p1Id: null, p2Id: null, p1Source: { slot: prev[i * 2].slot }, p2Source: { slot: prev[i * 2 + 1].slot } });
    }
    upper.push(round);
  }

  // Lower bracket
  // LR1: losers from upper R1 (size/4 matches)
  const lr1: ElimSlot[] = [];
  for (let i = 0; i < ur1.length / 2; i++) {
    lr1.push({ slot: `L-R1-${i + 1}`, matchNumber: mn++, p1Id: null, p2Id: null, p1Source: { slot: ur1[i * 2].slot + ":L" }, p2Source: { slot: ur1[i * 2 + 1].slot + ":L" } });
  }
  lower.push(lr1);

  // Subsequent lower rounds
  let lPrev = lr1;
  for (let r = 1; r < (uRounds - 1) * 2 - 1; r++) {
    const round: ElimSlot[] = [];
    // Alternate: face upper losers vs play among selves
    if (r % 2 === 1) {
      const uRoundLosers = upper[Math.floor(r / 2) + 1] || [];
      for (let i = 0; i < lPrev.length; i++) {
        const uLosSource = uRoundLosers[i] ? uRoundLosers[i].slot + ":L" : undefined;
        round.push({ slot: `L-R${r + 1}-${i + 1}`, matchNumber: mn++, p1Id: null, p2Id: null, p1Source: { slot: lPrev[i].slot }, p2Source: uLosSource ? { slot: uLosSource } : undefined });
      }
    } else {
      for (let i = 0; i < lPrev.length / 2; i++) {
        round.push({ slot: `L-R${r + 1}-${i + 1}`, matchNumber: mn++, p1Id: null, p2Id: null, p1Source: { slot: lPrev[i * 2].slot }, p2Source: { slot: lPrev[i * 2 + 1].slot } });
      }
    }
    if (round.length) { lower.push(round); lPrev = round; }
  }

  const grandFinal: ElimSlot = { slot: "GF", matchNumber: mn, p1Id: null, p2Id: null, p1Source: { slot: "U-F" }, p2Source: { slot: lPrev[0]?.slot ?? "L-F" } };
  return { upper, lower, grandFinal };
}

/** Compute state for double elim: includes losers. */
export function computeDoubleElimState(
  upper: ElimSlot[][],
  lower: ElimSlot[][],
  grandFinal: ElimSlot,
  matches: Match[]
): Map<string, ElimSlotState> {
  const allSlots = [...upper.flat(), ...lower.flat(), grandFinal];
  const slotMap = new Map<string, ElimSlot>();
  allSlots.forEach((s) => slotMap.set(s.slot, s));

  const state = new Map<string, ElimSlotState>();

  function getWinner(slot: string): string | null { return state.get(slot)?.winnerId ?? null; }
  function getLoser(slot: string): string | null {
    const s = state.get(slot);
    if (!s || !s.winnerId) return null;
    const match = matches.find((m) => {
      const sl = slotMap.get(slot);
      return sl && m.match_number === sl.matchNumber;
    });
    if (!match) return null;
    if (match.winner_team === 1) return match.team2_player1_id ?? match.team2_player2_id ?? null;
    return match.team1_player1_id ?? match.team1_player2_id ?? null;
  }

  function processSlot(slot: ElimSlot) {
    let p1 = slot.p1Id, p2 = slot.p2Id;
    if (slot.p1Source) {
      const src = slot.p1Source.slot;
      p1 = src.endsWith(":L") ? getLoser(src.slice(0, -2)) : getWinner(src);
    }
    if (slot.p2Source) {
      const src = slot.p2Source.slot;
      p2 = src.endsWith(":L") ? getLoser(src.slice(0, -2)) : getWinner(src);
    }
    if (slot.autoWinnerId) { state.set(slot.slot, { p1Id: p1, p2Id: p2, winnerId: slot.autoWinnerId, created: false }); return; }
    const match = matches.find((m) => m.match_number === slot.matchNumber);
    let winnerId: string | null = null;
    if (match?.winner_team === 1) winnerId = match.team1_player1_id ?? match.team1_player2_id ?? null;
    else if (match?.winner_team === 2) winnerId = match.team2_player1_id ?? match.team2_player2_id ?? null;
    state.set(slot.slot, { p1Id: p1, p2Id: p2, winnerId, created: !!match });
  }

  upper.flat().forEach(processSlot);
  lower.flat().forEach(processSlot);
  processSlot(grandFinal);
  return state;
}

// ── Labels ────────────────────────────────────────────────────────────────────

export function getRoundLabel(roundIndex: number, totalRounds: number): string {
  const rem = totalRounds - roundIndex;
  if (rem === 1) return "Final";
  if (rem === 2) return "Semi Final";
  if (rem === 3) return "Perempat Final";
  if (rem === 4) return "16 Besar";
  if (rem === 5) return "32 Besar";
  return `Babak ${roundIndex + 1}`;
}

export function getFormatLabel(fmt: TournamentFormat): string {
  const map: Record<TournamentFormat, string> = {
    round_robin: "Liga",
    single_elim: "Gugur",
    double_elim: "Gugur Ganda",
    beregu: "Beregu",
    king_of_court: "Raja Lapangan",
  };
  return map[fmt] ?? fmt;
}
