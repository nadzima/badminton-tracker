"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Player, Match } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import { BeruguConfig } from "@/lib/tournament";

interface Props {
  config: BeruguConfig;
  players: Player[];
  matches: Match[];
  sessionId: string;
  isReadOnly: boolean;
  onScoreSubmit: (matchId: string, s1: number, s2: number) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
  onReload: () => Promise<void>;
}

interface SetupState {
  tieId: string;
  rubberId: string;
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
}

export default function BeruguView({
  config,
  players,
  matches,
  sessionId,
  isReadOnly,
  onScoreSubmit,
  onDeleteMatch,
  onReload,
}: Props) {
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getPlayer = (id: string) => players.find((p) => p.id === id);
  const getTeam = (teamId: string) =>
    config.teams.find((t) => t.id === teamId);
  const getMatchByNumber = (matchNumber: number) =>
    matches.find((m) => m.match_number === matchNumber) ?? null;

  const getTieScore = (tieId: string) => {
    const tie = config.ties.find((t) => t.id === tieId);
    if (!tie) return { a: 0, b: 0 };
    let a = 0;
    let b = 0;
    for (const rubber of tie.rubbers) {
      const match = getMatchByNumber(rubber.matchNumber);
      if (match?.winner_team === 1) a++;
      else if (match?.winner_team === 2) b++;
    }
    return { a, b };
  };

  const openSetup = (tieId: string, rubberId: string) => {
    const tie = config.ties.find((t) => t.id === tieId);
    if (!tie) return;
    const teamA = getTeam(tie.teamAId);
    const teamB = getTeam(tie.teamBId);
    setSetup({
      tieId,
      rubberId,
      teamAP1: teamA?.playerIds[0] ?? "",
      teamAP2: teamA?.playerIds[1] ?? "",
      teamBP1: teamB?.playerIds[0] ?? "",
      teamBP2: teamB?.playerIds[1] ?? "",
    });
  };

  const handleStartRubber = async () => {
    if (!setup) return;
    const tie = config.ties.find((t) => t.id === setup.tieId);
    const rubber = tie?.rubbers.find((r) => r.id === setup.rubberId);
    if (!tie || !rubber) return;

    setSubmitting(true);
    try {
      await api.sessions.addMatches(sessionId, [
        {
          match_number: rubber.matchNumber,
          court: rubber.label,
          status: "pending" as const,
          team1_player1_id: setup.teamAP1,
          team1_player2_id: setup.teamAP2 || "",
          team2_player1_id: setup.teamBP1,
          team2_player2_id: setup.teamBP2 || "",
          team1_score: null as null,
          team2_score: null as null,
          winner_team: null as null,
        },
      ]);
      setSetup(null);
      await onReload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {config.ties.length === 0 ? (
        <p className="text-slate-400 text-sm text-center">
          Belum ada pertandingan beregu.
        </p>
      ) : (
        config.ties.map((tie) => {
          const teamA = getTeam(tie.teamAId);
          const teamB = getTeam(tie.teamBId);
          const score = getTieScore(tie.id);

          return (
            <div
              key={tie.id}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden"
            >
              {/* Tie header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {teamA?.name ?? tie.teamAId}
                  </span>
                  <span className="text-slate-400 text-xs">vs</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {teamB?.name ?? tie.teamBId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {score.a}
                  </span>
                  <span className="text-slate-400 text-sm">-</span>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {score.b}
                  </span>
                </div>
              </div>

              {/* Rubbers */}
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {tie.rubbers.map((rubber) => {
                  const match = getMatchByNumber(rubber.matchNumber);
                  const isSetupOpen =
                    setup?.tieId === tie.id && setup?.rubberId === rubber.id;

                  return (
                    <div key={rubber.id} className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        {rubber.label}
                      </p>

                      {match ? (
                        <MatchCard
                          match={match}
                          players={players}
                          sessionStatus={isReadOnly ? "completed" : "active"}
                          onScoreSubmit={isReadOnly ? async () => {} : onScoreSubmit}
                          onDelete={isReadOnly ? undefined : onDeleteMatch}
                        />
                      ) : isReadOnly ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                          Belum dimulai
                        </p>
                      ) : isSetupOpen ? (
                        /* Inline player setup form */
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                          {/* Team A selects */}
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Tim {teamA?.name ?? tie.teamAId}
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={setup.teamAP1}
                                onChange={(e) =>
                                  setSetup((s) =>
                                    s ? { ...s, teamAP1: e.target.value } : s
                                  )
                                }
                                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="">Pemain 1</option>
                                {teamA?.playerIds.map((pid) => (
                                  <option key={pid} value={pid}>
                                    {getPlayer(pid)?.name ?? pid}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={setup.teamAP2}
                                onChange={(e) =>
                                  setSetup((s) =>
                                    s ? { ...s, teamAP2: e.target.value } : s
                                  )
                                }
                                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="">Pemain 2</option>
                                {teamA?.playerIds.map((pid) => (
                                  <option key={pid} value={pid}>
                                    {getPlayer(pid)?.name ?? pid}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Team B selects */}
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Tim {teamB?.name ?? tie.teamBId}
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={setup.teamBP1}
                                onChange={(e) =>
                                  setSetup((s) =>
                                    s ? { ...s, teamBP1: e.target.value } : s
                                  )
                                }
                                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="">Pemain 1</option>
                                {teamB?.playerIds.map((pid) => (
                                  <option key={pid} value={pid}>
                                    {getPlayer(pid)?.name ?? pid}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={setup.teamBP2}
                                onChange={(e) =>
                                  setSetup((s) =>
                                    s ? { ...s, teamBP2: e.target.value } : s
                                  )
                                }
                                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-100"
                              >
                                <option value="">Pemain 2</option>
                                {teamB?.playerIds.map((pid) => (
                                  <option key={pid} value={pid}>
                                    {getPlayer(pid)?.name ?? pid}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={handleStartRubber}
                              disabled={submitting}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {submitting ? "Menyimpan..." : "Mulai Rubber"}
                            </button>
                            <button
                              onClick={() => setSetup(null)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openSetup(tie.id, rubber.id)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Setup Pemain
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
