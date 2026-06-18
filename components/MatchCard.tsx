"use client";
import { useState } from "react";
import { Match, Player } from "@/lib/types";

interface Props {
  match: Match;
  players: Player[];
  onScoreSubmit: (
    matchId: string,
    score1: number,
    score2: number
  ) => Promise<void>;
  onDelete?: (matchId: string) => Promise<void>;
  sessionStatus: "active" | "completed";
}

function name(id: string | null | undefined, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "?";
}

export default function MatchCard({
  match,
  players,
  onScoreSubmit,
  onDelete,
  sessionStatus,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [s1, setS1] = useState(match.team1_score?.toString() ?? "");
  const [s2, setS2] = useState(match.team2_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const t1 = [match.team1_player1_id, match.team1_player2_id]
    .filter(Boolean)
    .map((id) => name(id, players))
    .join(" / ");
  const t2 = [match.team2_player1_id, match.team2_player2_id]
    .filter(Boolean)
    .map((id) => name(id, players))
    .join(" / ");

  const done = match.status === "completed";

  const handleSave = async () => {
    const score1 = parseInt(s1);
    const score2 = parseInt(s2);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) return;
    setSaving(true);
    await onScoreSubmit(match.id, score1, score2);
    setSaving(false);
    setEditing(false);
  };

  const statusBadge = {
    pending: "bg-slate-100 text-slate-600",
    in_progress: "bg-shuttle-400/20 text-yellow-700",
    completed: "bg-primary-100 text-primary-800",
  }[match.status];

  const statusLabel = {
    pending: "Menunggu",
    in_progress: "Sedang Main",
    completed: "Selesai",
  }[match.status];

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${done ? "border-primary-200" : "border-slate-200"} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Match #{match.match_number}
          </span>
          {match.court && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {match.court}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-2">
        {/* Team 1 */}
        <div className={`flex-1 rounded-xl p-3 text-center ${match.winner_team === 1 ? "bg-primary-50 border border-primary-300" : "bg-slate-50"}`}>
          <p className="text-sm font-semibold text-slate-800 leading-tight">{t1}</p>
          {done && (
            <p className={`text-2xl font-bold mt-1 ${match.winner_team === 1 ? "text-primary-600" : "text-slate-400"}`}>
              {match.team1_score}
            </p>
          )}
          {match.winner_team === 1 && (
            <p className="text-xs text-primary-600 font-medium mt-1">🏆 Menang</p>
          )}
        </div>

        <span className="text-slate-400 font-bold text-sm">VS</span>

        {/* Team 2 */}
        <div className={`flex-1 rounded-xl p-3 text-center ${match.winner_team === 2 ? "bg-primary-50 border border-primary-300" : "bg-slate-50"}`}>
          <p className="text-sm font-semibold text-slate-800 leading-tight">{t2}</p>
          {done && (
            <p className={`text-2xl font-bold mt-1 ${match.winner_team === 2 ? "text-primary-600" : "text-slate-400"}`}>
              {match.team2_score}
            </p>
          )}
          {match.winner_team === 2 && (
            <p className="text-xs text-primary-600 font-medium mt-1">🏆 Menang</p>
          )}
        </div>
      </div>

      {/* Score input */}
      {sessionStatus === "active" && (
        <>
          {!done && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Input Skor
            </button>
          )}
          {done && !editing && (
            <button
              onClick={() => { setEditing(true); setS1(match.team1_score?.toString() ?? ""); setS2(match.team2_score?.toString() ?? ""); }}
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Edit Skor
            </button>
          )}
          {editing && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={0}
                  value={s1}
                  onChange={(e) => setS1(e.target.value)}
                  placeholder="Skor 1"
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-slate-400 font-bold">–</span>
                <input
                  type="number"
                  min={0}
                  value={s2}
                  onChange={(e) => setS2(e.target.value)}
                  placeholder="Skor 2"
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete */}
      {onDelete && sessionStatus === "active" && (
        <button
          onClick={() => onDelete(match.id)}
          className="w-full py-1.5 rounded-xl text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          Hapus Match
        </button>
      )}
    </div>
  );
}
