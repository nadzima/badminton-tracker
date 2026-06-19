import { Player, Session, Match } from "./types";

export interface SessionDetail {
  session: Session;
  players: Player[];
  allPlayers: Player[];
  matches: Match[];
}

export interface DashStats {
  totalSessions: number;
  totalPlayers: number;
  totalMatches: number;
  recentSessions: Session[];
  topPlayer: Player | null;
}

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  players: {
    list: () => req<Player[]>("/api/players"),
  },

  sessions: {
    list: () => req<Session[]>("/api/sessions"),

    create: (data: {
      date: string;
      location: string;
      notes: string;
      playerIds: string[];
      newPlayerNames: string[];
    }) =>
      req<{ session: Session; players: Player[] }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (id: string) => req<SessionDetail>(`/api/sessions/${id}`),

    update: (id: string, data: Partial<Pick<Session, "status">>) =>
      req<{ ok: boolean }>(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      req<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

    addPlayer: (
      sessionId: string,
      data: { playerId?: string; playerName?: string }
    ) =>
      req<Player>(`/api/sessions/${sessionId}/players`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    removePlayer: (sessionId: string, playerId: string) =>
      req<{ ok: boolean }>(
        `/api/sessions/${sessionId}/players/${playerId}`,
        { method: "DELETE" }
      ),

    addMatches: (
      sessionId: string,
      matches: Array<{
        match_number: number;
        court: string;
        status: string;
        team1_player1_id: string;
        team1_player2_id: string;
        team2_player1_id: string;
        team2_player2_id: string;
        team1_score: null;
        team2_score: null;
        winner_team: null;
      }>
    ) =>
      req<{ count: number }>(`/api/sessions/${sessionId}/matches`, {
        method: "POST",
        body: JSON.stringify({ matches }),
      }),
  },

  matches: {
    update: (
      id: string,
      data: {
        team1_score?: number | null;
        team2_score?: number | null;
        winner_team?: number | null;
        status?: string;
      }
    ) =>
      req<{ ok: boolean }>(`/api/matches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      req<{ ok: boolean }>(`/api/matches/${id}`, { method: "DELETE" }),
  },

  stats: {
    get: () => req<DashStats>("/api/stats"),
  },
};
