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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
            <th className="pb-2 text-left pl-2">#</th>
            <th className="pb-2 text-left">Pemain</th>
            <th className="pb-2 text-right">Poin</th>
            <th className="pb-2 text-right">M</th>
            <th className="pb-2 text-right">W</th>
            <th className="pb-2 text-right">L</th>
            <th className="pb-2 text-right">±</th>
            {showSessions && <th className="pb-2 text-right">Sesi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rankings.map((r, i) => (
            <tr
              key={r.player.id}
              className={i < 3 ? "font-semibold" : ""}
            >
              <td className="py-2.5 pl-2">
                <span className="text-base leading-none">
                  {i < 3 ? medals[i] : <span className="text-slate-400 font-normal">{i + 1}</span>}
                </span>
              </td>
              <td className="py-2.5 text-slate-800">
                {r.player.name}
              </td>
              <td className="py-2.5 text-right">
                <span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {r.rankPoints}
                </span>
              </td>
              <td className="py-2.5 text-right text-slate-500">{r.gamesPlayed}</td>
              <td className="py-2.5 text-right text-primary-600">{r.wins}</td>
              <td className="py-2.5 text-right text-red-400">{r.losses}</td>
              <td className={`py-2.5 text-right ${r.pointDiff >= 0 ? "text-primary-600" : "text-red-400"}`}>
                {r.pointDiff >= 0 ? "+" : ""}{r.pointDiff}
              </td>
              {showSessions && (
                <td className="py-2.5 text-right text-slate-500">
                  {(r as PlayerRankStats & { sessionsPlayed?: number }).sessionsPlayed ?? "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
