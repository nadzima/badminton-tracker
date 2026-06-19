export interface Player {
  id: string;
  name: string;
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  location: string;
  notes: string;
  status: "active" | "completed";
  created_at: string;
  player_count?: number;
  match_count?: number;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  player_id: string;
  created_at: string;
  player?: Player;
}

export interface Match {
  id: string;
  session_id: string;
  match_number: number;
  court: string;
  status: "pending" | "in_progress" | "completed";
  team1_player1_id: string | null;
  team1_player2_id: string | null;
  team2_player1_id: string | null;
  team2_player2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team: 1 | 2 | null;
  created_at: string;
  team1_player1?: Player;
  team1_player2?: Player;
  team2_player1?: Player;
  team2_player2?: Player;
}

export interface PlayerRankStats {
  player: Player;
  wins: number;
  losses: number;
  gamesPlayed: number;
  pointsScored: number;
  pointsConceded: number;
  rankPoints: number;
  winRate: number;
  pointDiff: number;
  rankScore: number;
  rank?: number;
  sessionsPlayed?: number;
  streak?: number;
}

export interface OverallPlayerStats extends PlayerRankStats {
  sessionsPlayed: number;
  totalSessionPoints: number;
}

export interface NewMatchForm {
  court: string;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
}

export interface PartnershipStats {
  player1: Player;
  player2: Player;
  matches: number;
  wins: number;
  winRate: number;
}

export interface H2HStats {
  player1Wins: number;
  player2Wins: number;
  totalMatches: number;
}

export interface SessionSummaryData {
  mvp: Player | null;
  hottestMatch: Match | null;
  mostConsistent: Player | null;
}

export interface WinRatePoint {
  date: string;
  winRate: number;
  sessionId: string;
}

// Tournament re-exports (actual types live in lib/tournament.ts)
export type { TournamentFormat, TournamentConfig, RoundRobinConfig, SingleElimConfig, DoubleElimConfig, BeruguConfig, BeruguTeam, BeruguTie, BeruguRubber, KingOfCourtConfig, RRMatchSlot, ElimSlot, RRStanding, ElimSlotState } from "./tournament";
