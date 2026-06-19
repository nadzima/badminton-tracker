"use client";

import { useState } from "react";
import { computeRRStandings } from "@/lib/tournament";
import { Player, Match } from "@/lib/types";
import MatchCard from "@/components/MatchCard";
import { RoundRobinConfig } from "@/lib/tournament";

interface Props {
  config: RoundRobinConfig;
  players: Player[];
  matches: Match[];
  isReadOnly: boolean;
  onScoreSubmit: (matchId: string, s1: number, s2: number) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
}

type Tab = "standings" | "schedule";

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-500 font-bold",
  2: "text-slate-400 font-bold",
  3: "text-amber-600 font-bold",
};

export default function RoundRobinView({
  config,
  players,
  matches,
  isReadOnly,
  onScoreSubmit,
  onDeleteMatch,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("standings");

  const standings = computeRRStandings(matches, players.map((p) => p.id));

  const getPlayer = (id: string) => players.find((p) => p.id === id);

  const getMatchByNumber = (matchNumber: number) =>
    matches.find((m) => m.match_number === matchNumber) ?? null;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-1 flex gap-1 w-fit">
        {(["standings", "schedule"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab === "standings" ? "Klasemen" : "Jadwal"}
          </button>
        ))}
      </div>

      {/* Standings Tab */}
      {activeTab === "standings" && (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
          {standings.length === 0 ? (
            <p className="text-slate-400 text-sm p-4 text-center">
              Belum ada data klasemen.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Pemain
                  </th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    M
                  </th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    W
                  </th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    L
                  </th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    +/-
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Poin
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings
                  .slice()
                  .sort((a, b) => b.pts - a.pts)
                  .map((row, idx) => {
                    const rank = idx + 1;
                    const player = getPlayer(row.playerId);
                    const pointDiff = row.ps - row.pc;
                    return (
                      <tr
                        key={row.playerId}
                        className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={
                              RANK_COLORS[rank] ??
                              "text-slate-500 dark:text-slate-400"
                            }
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-100 font-medium">
                          {player?.name ?? row.playerId}
                        </td>
                        <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                          {row.mp}
                        </td>
                        <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                          {row.w}
                        </td>
                        <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                          {row.l}
                        </td>
                        <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-300">
                          {pointDiff > 0 ? `+${pointDiff}` : pointDiff}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-100">
                          {row.pts}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {config.schedule.length === 0 ? (
            <p className="text-slate-400 text-sm text-center">
              Belum ada jadwal.
            </p>
          ) : (
            config.schedule.map((round, roundIdx) => (
              <div key={roundIdx}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Babak {roundIdx + 1}
                </p>
                <div className="space-y-2">
                  {round.map((slot) => {
                    const match = getMatchByNumber(slot.matchNumber);
                    if (match) {
                      return (
                        <MatchCard
                          key={slot.matchNumber}
                          match={match}
                          players={players}
                          sessionStatus={isReadOnly ? "completed" : "active"}
                          onScoreSubmit={isReadOnly ? async () => {} : onScoreSubmit}
                          onDelete={isReadOnly ? undefined : onDeleteMatch}
                        />
                      );
                    }
                    return (
                      <div
                        key={slot.matchNumber}
                        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          Match #{slot.matchNumber} —{" "}
                          {getPlayer(slot.t1p1)?.name ?? slot.t1p1}
                          {slot.t1p2
                            ? ` / ${getPlayer(slot.t1p2)?.name ?? slot.t1p2}`
                            : ""}{" "}
                          vs {getPlayer(slot.t2p1)?.name ?? slot.t2p1}
                          {slot.t2p2
                            ? ` / ${getPlayer(slot.t2p2)?.name ?? slot.t2p2}`
                            : ""}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Menunggu...
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
