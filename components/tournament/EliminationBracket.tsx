"use client";

import { useState } from "react";
import {
  computeElimState,
  computeDoubleElimState,
  getSlotsReadyToCreate,
  getRoundLabel,
  SingleElimConfig,
  DoubleElimConfig,
  ElimSlot,
  ElimSlotState,
} from "@/lib/tournament";
import { api } from "@/lib/api";
import { Player, Match } from "@/lib/types";
import MatchCard from "@/components/MatchCard";

interface Props {
  config: SingleElimConfig | DoubleElimConfig;
  players: Player[];
  matches: Match[];
  sessionId: string;
  isReadOnly: boolean;
  onScoreSubmit: (matchId: string, s1: number, s2: number) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
  onReload: () => Promise<void>;
}

export default function EliminationBracket({
  config,
  players,
  matches,
  sessionId,
  isReadOnly,
  onScoreSubmit,
  onDeleteMatch,
  onReload,
}: Props) {
  const [creating, setCreating] = useState(false);

  const isSingle = config._t === "single_elim";

  const rawState: Map<string, ElimSlotState> = isSingle
    ? computeElimState((config as SingleElimConfig).rounds, matches)
    : computeDoubleElimState(
        (config as DoubleElimConfig).upper,
        (config as DoubleElimConfig).lower,
        (config as DoubleElimConfig).grandFinal,
        matches
      );

  const allRounds: ElimSlot[][] = isSingle
    ? (config as SingleElimConfig).rounds
    : [
        ...(config as DoubleElimConfig).upper,
        ...(config as DoubleElimConfig).lower,
      ];

  const readySlotItems = isReadOnly
    ? []
    : getSlotsReadyToCreate(allRounds, rawState);
  const readySlots: ElimSlot[] = readySlotItems.map((r) => r.slot);

  const getPlayer = (id: string | null) =>
    id ? (players.find((p) => p.id === id) ?? null) : null;

  const getMatchByNumber = (matchNumber: number) =>
    matches.find((m) => m.match_number === matchNumber) ?? null;

  const handleCreateNextRound = async () => {
    if (readySlots.length === 0) return;
    setCreating(true);
    try {
      const totalRounds = isSingle
        ? (config as SingleElimConfig).rounds.length
        : (config as DoubleElimConfig).upper.length;
      const newMatches = readySlots.map((slot) => {
        const slotState = rawState.get(slot.slot);
        const roundIdx = allRounds.findIndex((r) => r.some((s) => s.slot === slot.slot));
        return {
          match_number: slot.matchNumber,
          court: getRoundLabel(roundIdx, totalRounds),
          status: "pending" as const,
          team1_player1_id: slotState?.p1Id ?? "",
          team1_player2_id: "",
          team2_player1_id: slotState?.p2Id ?? "",
          team2_player2_id: "",
          team1_score: null as null,
          team2_score: null as null,
          winner_team: null as null,
        };
      });
      await api.sessions.addMatches(sessionId, newMatches);
      await onReload();
    } finally {
      setCreating(false);
    }
  };

  const renderSlot = (slot: ElimSlot) => {
    const slotState = rawState.get(slot.slot);
    const match = getMatchByNumber(slot.matchNumber);
    const p1 = getPlayer(slotState?.p1Id ?? null);
    const p2 = getPlayer(slotState?.p2Id ?? null);

    if (match) {
      return (
        <MatchCard
          key={slot.slot}
          match={match}
          players={players}
          isReadOnly={isReadOnly}
          onScoreSubmit={onScoreSubmit}
          onDelete={onDeleteMatch}
        />
      );
    }

    return (
      <div
        key={slot.slot}
        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-3"
      >
        <span
          className={`flex-1 text-sm font-medium text-right ${
            p1
              ? "text-slate-800 dark:text-slate-100"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {p1 ? p1.name : "TBD"}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
          vs
        </span>
        <span
          className={`flex-1 text-sm font-medium ${
            p2
              ? "text-slate-800 dark:text-slate-100"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {p2 ? p2.name : "TBD"}
        </span>
        {slotState?.created === false && (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
            Menunggu...
          </span>
        )}
      </div>
    );
  };

  const renderRounds = (rounds: ElimSlot[][], label?: string) => (
    <div className="space-y-4">
      {label && (
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </p>
      )}
      {rounds.map((round, roundIdx) => (
        <div key={roundIdx}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            {getRoundLabel(roundIdx, rounds.length)}
          </p>
          <div className="space-y-2">{round.map(renderSlot)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Create next round button */}
      {!isReadOnly && readySlots.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleCreateNextRound}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {creating
              ? "Membuat..."
              : `Buat match babak berikutnya (${readySlots.length})`}
          </button>
        </div>
      )}

      {/* Bracket */}
      {isSingle ? (
        renderRounds((config as SingleElimConfig).rounds)
      ) : (
        <div className="space-y-6">
          {renderRounds((config as DoubleElimConfig).upper, "Babak Atas")}
          {renderRounds((config as DoubleElimConfig).lower, "Babak Bawah")}

          {/* Grand Final */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Grand Final
            </p>
            <div className="space-y-2">
              {renderSlot((config as DoubleElimConfig).grandFinal)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
