"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Player, Match } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import { KingOfCourtConfig } from "@/lib/tournament";

interface Props {
  config: KingOfCourtConfig;
  players: Player[];
  matches: Match[];
  sessionId: string;
  isReadOnly: boolean;
  onScoreSubmit: (matchId: string, s1: number, s2: number) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
  onReload: () => Promise<void>;
}

export default function KingOfCourtView({
  config,
  players,
  matches,
  sessionId,
  isReadOnly,
  onScoreSubmit,
  onDeleteMatch,
  onReload,
}: Props) {
  const [queue, setQueue] = useState<string[]>(players.map((p) => p.id));
  const [starting, setStarting] = useState<Record<number, boolean>>({});

  const courts = config.courts;

  const activeMatches = matches.filter((m) => m.status !== "completed");
  const completedMatches = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.match_number - a.match_number);

  const getCourtLabel = (n: number) => `Lapangan ${n}`;

  const getActiveMatchForCourt = (courtNum: number) =>
    activeMatches.find((m) => m.court === getCourtLabel(courtNum)) ?? null;

  /** IDs of all players currently in an active match */
  const activePlaying = new Set<string>(
    activeMatches.flatMap((m) =>
      [
        m.team1_player1_id,
        m.team1_player2_id,
        m.team2_player1_id,
        m.team2_player2_id,
      ].filter(Boolean) as string[]
    )
  );

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const nextMatchNumber = () =>
    Math.max(...matches.map((m) => m.match_number), 0) + 1;

  const handleStartMatch = async (courtNum: number) => {
    const available = queue.filter((id) => !activePlaying.has(id));
    if (available.length < 4) return;
    const chosen = available.slice(0, 4);

    setStarting((s) => ({ ...s, [courtNum]: true }));
    try {
      await api.sessions.addMatches(sessionId, [
        {
          match_number: nextMatchNumber(),
          court: getCourtLabel(courtNum),
          status: "pending" as const,
          team1_player1_id: chosen[0],
          team1_player2_id: chosen[1],
          team2_player1_id: chosen[2],
          team2_player2_id: chosen[3],
          team1_score: null as null,
          team2_score: null as null,
          winner_team: null as null,
        },
      ]);
      // Remove chosen players from queue
      setQueue((q) => q.filter((id) => !chosen.includes(id)));
      await onReload();
    } finally {
      setStarting((s) => ({ ...s, [courtNum]: false }));
    }
  };

  /** Called after a score is submitted — put losers at back of queue */
  const handleScoreSubmit = async (
    matchId: string,
    s1: number,
    s2: number
  ) => {
    await onScoreSubmit(matchId, s1, s2);
    // Find the match to determine winners/losers
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const winnerTeam = s1 > s2 ? 1 : 2;
      const loserIds = (
        winnerTeam === 1
          ? [match.team2_player1_id, match.team2_player2_id]
          : [match.team1_player1_id, match.team1_player2_id]
      ).filter(Boolean) as string[];

      setQueue((q) => {
        const filtered = q.filter((id) => !loserIds.includes(id));
        return [...filtered, ...loserIds];
      });
    }
    await onReload();
  };

  const toggleQueue = (playerId: string) => {
    if (activePlaying.has(playerId)) return; // can't toggle active players
    setQueue((q) =>
      q.includes(playerId)
        ? q.filter((id) => id !== playerId)
        : [...q, playerId]
    );
  };

  const queuedPlayers = queue.filter((id) => !activePlaying.has(id));

  return (
    <div className="space-y-6">
      {/* Courts */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Lapangan
        </p>
        <div className="space-y-3">
          {Array.from({ length: courts }, (_, i) => i + 1).map((courtNum) => {
            const activeMatch = getActiveMatchForCourt(courtNum);
            const available = queue.filter((id) => !activePlaying.has(id));
            const canStart = !isReadOnly && !activeMatch && available.length >= 4;

            return (
              <div
                key={courtNum}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {getCourtLabel(courtNum)}
                  </p>
                </div>
                <div className="p-3">
                  {activeMatch ? (
                    <MatchCard
                      match={activeMatch}
                      players={players}
                      isReadOnly={isReadOnly}
                      onScoreSubmit={handleScoreSubmit}
                      onDelete={onDeleteMatch}
                    />
                  ) : canStart ? (
                    <button
                      onClick={() => handleStartMatch(courtNum)}
                      disabled={starting[courtNum]}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {starting[courtNum] ? "Memulai..." : "Mulai Match"}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-1">
                      {isReadOnly
                        ? "Lapangan kosong"
                        : available.length < 4
                        ? "Antrean tidak cukup"
                        : "Lapangan kosong"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Queue */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Antrean
        </p>
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
          {players.length === 0 ? (
            <p className="text-slate-400 text-sm p-4 text-center">
              Belum ada pemain.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {players.map((player) => {
                const isPlaying = activePlaying.has(player.id);
                const inQueue = queue.includes(player.id);
                const position = queuedPlayers.indexOf(player.id);

                return (
                  <li
                    key={player.id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      {isPlaying ? (
                        <span className="w-5 h-5 flex items-center justify-center text-xs">
                          -
                        </span>
                      ) : inQueue ? (
                        <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                          {position + 1}
                        </span>
                      ) : (
                        <span className="w-5 h-5 flex items-center justify-center text-xs text-slate-300 dark:text-slate-600">
                          -
                        </span>
                      )}
                      <span className="text-sm text-slate-800 dark:text-slate-100 font-medium">
                        {player.name}
                      </span>
                      {isPlaying && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Sedang bermain
                        </span>
                      )}
                    </div>
                    {!isReadOnly && !isPlaying && (
                      <button
                        onClick={() => toggleQueue(player.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          inQueue
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {inQueue ? "Keluarkan" : "Masukkan"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Riwayat
        </p>
        {completedMatches.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Belum ada match selesai.
          </p>
        ) : (
          <div className="space-y-2">
            {completedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                players={players}
                isReadOnly={true}
                onScoreSubmit={onScoreSubmit}
                onDelete={onDeleteMatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
