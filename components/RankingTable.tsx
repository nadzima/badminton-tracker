"use client";
import { PlayerRankStats } from "@/lib/types";

interface Props {
  rankings: PlayerRankStats[];
  showSessions?: boolean;
}

const medals = ["🥇", "🥈", "🥉"];

function StreakBadge({ streak }: { streak?: number }) {
  if (!streak) return <span className="text-slate-300 text-xs">—</span>;
  const isWin = streak > 0;
  const count = Math.abs(streak);
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isWin ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"}`}>
      {isWin ? `W${count}` : `L${count}`}
    </span>
  );
}

export default function RankingTable({ rankings, showSessions }: Props) {
  if (rankings.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-6">Belum ada data ranking</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[660px]">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="pb-2 text-left pl-1 w-6 font-medium">#</th>
              <th className="pb-2 text-left min-w-[80px] pr-2 font-medium">Pemain</th>
              {showSessions && <th className="pb-2 text-right px-2 font-medium whitespace-nowrap">Sesi</th>}
              <th className="pb-2 text-right px-2 font-medium">M</th>
              <th className="pb-2 text-right px-2 font-medium text-green-600">W</th>
              <th className="pb-2 text-right px-2 font-medium text-red-400">L</th>
              <th className="pb-2 text-right px-2 font-medium">WR%</th>
              <th className="pb-2 text-right px-2 font-medium">PF</th>
              <th className="pb-2 text-right px-2 font-medium">PA</th>
              <th className="pb-2 text-right px-2 font-medium">±PD</th>
              <th className="pb-2 text-right px-2 font-medium">Streak</th>
              <th className="pb-2 text-right pl-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rankings.map((r, i) => (
              <tr key={r.player.id} className={i < 3 ? "font-medium" : ""}>
                <td className="py-2.5 pl-1">
                  {i < 3 ? <span className="text-sm">{medals[i]}</span> : <span className="text-slate-400 font-normal">{i + 1}</span>}
                </td>
                <td className="py-2.5 text-slate-800 pr-2">{r.player.name}</td>
                {showSessions && <td className="py-2.5 text-right px-2 text-slate-500">{r.sessionsPlayed ?? "—"}</td>}
                <td className="py-2.5 text-right px-2 text-slate-500">{r.gamesPlayed}</td>
                <td className="py-2.5 text-right px-2 text-green-600 font-semibold">{r.wins}</td>
                <td className="py-2.5 text-right px-2 text-red-400">{r.losses}</td>
                <td className="py-2.5 text-right px-2 text-slate-500">
                  {r.gamesPlayed > 0 ? `${Math.round(r.winRate * 100)}%` : "—"}
                </td>
                <td className="py-2.5 text-right px-2 text-slate-500">{r.pointsScored}</td>
                <td className="py-2.5 text-right px-2 text-slate-500">{r.pointsConceded}</td>
                <td className={`py-2.5 text-right px-2 font-medium ${r.pointDiff > 0 ? "text-green-600" : r.pointDiff < 0 ? "text-red-400" : "text-slate-400"}`}>
                  {r.pointDiff > 0 ? "+" : ""}{r.pointDiff}
                </td>
                <td className="py-2.5 text-right px-2">
                  <StreakBadge streak={r.streak} />
                </td>
                <td className="py-2.5 text-right pl-2">
                  <span className="bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full text-xs">
                    {(r.rankScore ?? 0).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-0.5">
        <p className="text-xs text-slate-500">
          <span className="font-semibold">Score</span> = (W × 0.5) + (±PD × 0.5) · <span className="font-semibold">Streak</span>: W = win, L = loss (berturut-turut)
        </p>
        <p className="text-xs text-slate-400">M = Matches · W = Wins · L = Losses · WR% = Win Rate · PF/PA = Points For/Against</p>
      </div>
    </div>
  );
}
