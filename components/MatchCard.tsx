"use client";
import { useState } from "react";
import { Match, Player } from "@/lib/types";

interface Props {
  match: Match;
  players: Player[];
  onScoreSubmit: (matchId: string, score1: number, score2: number) => Promise<void>;
  onDelete?: (matchId: string) => Promise<void>;
  sessionStatus: "active" | "completed";
}

function pname(id: string | null | undefined, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "?";
}

function scoreWarning(s1: string, s2: string): string | null {
  const n1 = parseInt(s1), n2 = parseInt(s2);
  if (isNaN(n1) || isNaN(n2) || s1 === "" || s2 === "") return null;
  if (n1 === 0 && n2 === 0) return "Kedua skor 0 — yakin?";
  if (n1 > 30 || n2 > 30) return "Skor >30 — biasanya badminton sampai 21";
  if (n1 === n2) return "Skor seri — pastikan ada pemenang";
  return null;
}

export default function MatchCard({ match, players, onScoreSubmit, onDelete, sessionStatus }: Props) {
  const [editing, setEditing] = useState(false);
  const [s1, setS1] = useState(match.team1_score?.toString() ?? "");
  const [s2, setS2] = useState(match.team2_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const t1 = [match.team1_player1_id, match.team1_player2_id].filter(Boolean).map((id) => pname(id, players)).join(" / ");
  const t2 = [match.team2_player1_id, match.team2_player2_id].filter(Boolean).map((id) => pname(id, players)).join(" / ");
  const done = match.status === "completed";
  const warn = editing ? scoreWarning(s1, s2) : null;

  const handleSave = async () => {
    const score1 = parseInt(s1), score2 = parseInt(s2);
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) return;
    setSaving(true);
    await onScoreSubmit(match.id, score1, score2);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className={`bg-white rounded-xl border ${done ? "border-primary-100" : "border-slate-100"} p-3.5`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs text-slate-400 font-medium">
          #{match.match_number}{match.court ? ` · ${match.court}` : ""}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            done
              ? "bg-primary-50 text-primary-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {done ? "Selesai" : "Menunggu"}
        </span>
      </div>

      {/* Teams row */}
      <div className="flex items-stretch gap-2">
        <div
          className={`flex-1 rounded-lg px-3 py-2 text-center ${
            match.winner_team === 1 ? "bg-primary-50 ring-1 ring-primary-200" : "bg-slate-50"
          }`}
        >
          <p className="text-xs font-medium text-slate-700 leading-tight">{t1}</p>
          {done && (
            <p className={`text-xl font-bold mt-1 ${match.winner_team === 1 ? "text-primary-600" : "text-slate-400"}`}>
              {match.team1_score}
            </p>
          )}
          {match.winner_team === 1 && <p className="text-xs text-primary-500 font-medium mt-0.5">Menang</p>}
        </div>

        <div className="flex items-center justify-center">
          <span className="text-xs text-slate-300 font-bold">vs</span>
        </div>

        <div
          className={`flex-1 rounded-lg px-3 py-2 text-center ${
            match.winner_team === 2 ? "bg-primary-50 ring-1 ring-primary-200" : "bg-slate-50"
          }`}
        >
          <p className="text-xs font-medium text-slate-700 leading-tight">{t2}</p>
          {done && (
            <p className={`text-xl font-bold mt-1 ${match.winner_team === 2 ? "text-primary-600" : "text-slate-400"}`}>
              {match.team2_score}
            </p>
          )}
          {match.winner_team === 2 && <p className="text-xs text-primary-500 font-medium mt-0.5">Menang</p>}
        </div>
      </div>

      {/* Score input */}
      {sessionStatus === "active" && (
        <div className="mt-2.5">
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setS1(match.team1_score?.toString() ?? ""); setS2(match.team2_score?.toString() ?? ""); }}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                done
                  ? "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              }`}
            >
              {done ? "Edit Skor" : "Input Skor"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="number" min={0} value={s1} onChange={(e) => setS1(e.target.value)}
                  placeholder="Skor 1"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
                <span className="text-slate-300 font-bold text-sm">–</span>
                <input
                  type="number" min={0} value={s2} onChange={(e) => setS2(e.target.value)}
                  placeholder="Skor 2"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>
              {warn && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <span>⚠️</span> {warn}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium hover:bg-slate-200">
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      {onDelete && sessionStatus === "active" && !editing && (
        <button onClick={() => onDelete(match.id)}
          className="w-full mt-2 py-1 rounded-lg text-xs text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
          Hapus
        </button>
      )}
    </div>
  );
}
