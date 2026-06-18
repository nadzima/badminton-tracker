"use client";
import { PlayerRankStats } from "@/lib/types";

interface Props {
  rankings: PlayerRankStats[];
  showSessions?: boolean;
}

const medals = ["🥇", "🥈", "🥉"];

export default function RankingTable({ rankings, showSessions }: Props) {
  if (rankings.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-6">
        Belum ada data ranking
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[620px]">
          <thead>
            <tr className="text-slate-400 uppercase tracking-wide border-b border-slate-200">
              <th className="pb-2 text-left pl-1 w-7">#</th>
              <th className="pb-2 text-left min-w-[90px] pr-2">Pemain</th>
              {showSessions && (
                <th className="pb-2 text-right px-2 whitespace-nowrap">Sesi</th>
              )}
              <th className="pb-2 text-right px-2">M</th>
              <th className="pb-2 text-right px-2 text-green-600">W</th>
              <th className="pb-2 text-right px-2 text-red-400">L</th>
              <th className="pb-2 text-right px-2">WR%</th>
              <th className="pb-2 text-right px-2">PF</th>
              <th className="pb-2 text-right px-2">PA</th>
              <th className="pb-2 text-right px-2">±PD</th>
              <th className="pb-2 text-right pl-2">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.map((r, i) => (
              <tr key={r.player.id} className={i < 3 ? "font-semibold" : ""}>
                <td className="py-2.5 pl-1">
                  {i < 3 ? (
                    <span className="text-sm">{medals[i]}</span>
                  ) : (
                    <span className="text-slate-400 font-normal">{i + 1}</span>
                  )}
                </td>
                <td className="py-2.5 text-slate-800 pr-2">{r.player.name}</td>
                {showSessions && (
                  <td className="py-2.5 text-right px-2 text-slate-500">
                    {r.sessionsPlayed ?? "-"}
                  </td>
                )}
                <td className="py-2.5 text-right px-2 text-slate-600">
                  {r.gamesPlayed}
                </td>
                <td className="py-2.5 text-right px-2 text-green-600 font-semibold">
                  {r.wins}
                </td>
                <td className="py-2.5 text-right px-2 text-red-400 font-semibold">
                  {r.losses}
                </td>
                <td className="py-2.5 text-right px-2 text-slate-600">
                  {r.gamesPlayed > 0
                    ? `${Math.round(r.winRate * 100)}%`
                    : "-"}
                </td>
                <td className="py-2.5 text-right px-2 text-slate-600">
                  {r.pointsScored}
                </td>
                <td className="py-2.5 text-right px-2 text-slate-600">
                  {r.pointsConceded}
                </td>
                <td
                  className={`py-2.5 text-right px-2 font-semibold ${
                    r.pointDiff > 0
                      ? "text-green-600"
                      : r.pointDiff < 0
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {r.pointDiff > 0 ? "+" : ""}
                  {r.pointDiff}
                </td>
                <td className="py-2.5 text-right pl-2">
                  <span className="bg-primary-100 text-primary-800 font-bold px-2 py-0.5 rounded-full">
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
          <span className="font-semibold">Ranking Score</span> ={" "}
          (Menang × 0.5) + (Selisih Poin × 0.5)
        </p>
        <p className="text-xs text-slate-400">
          M = Matches · W = Wins · L = Losses · WR% = Win Rate · PF = Points
          For · PA = Points Against · ±PD = Point Diff
        </p>
      </div>
    </div>
  );
}
