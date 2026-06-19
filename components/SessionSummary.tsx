"use client";
import { Match, Player, SessionSummaryData } from "@/lib/types";

interface Props {
  summary: SessionSummaryData;
  matches: Match[];
  players: Player[];
}

function playerName(id: string | null | undefined, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "?";
}

export default function SessionSummary({ summary, matches, players }: Props) {
  const { mvp, hottestMatch, mostConsistent } = summary;
  const completed = matches.filter((m) => m.status === "completed");
  if (completed.length === 0) return null;

  const items = [
    mvp
      ? { icon: "🏆", label: "MVP Sesi", value: mvp.name, sub: "Paling banyak menang" }
      : null,
    hottestMatch
      ? {
          icon: "🔥",
          label: "Match Terpanas",
          value: `#${hottestMatch.match_number}`,
          sub: `${hottestMatch.team1_score}–${hottestMatch.team2_score} (selisih ${Math.abs((hottestMatch.team1_score ?? 0) - (hottestMatch.team2_score ?? 0))})`,
        }
      : null,
    mostConsistent
      ? { icon: "🎯", label: "Paling Konsisten", value: mostConsistent.name, sub: "Win rate tertinggi (min 2 match)" }
      : null,
  ].filter(Boolean) as { icon: string; label: string; value: string; sub: string }[];

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-slate-50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ringkasan Sesi</p>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <span className="text-2xl w-8 text-center shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="font-semibold text-slate-800 text-sm truncate">{item.value}</p>
              <p className="text-xs text-slate-400 truncate">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
