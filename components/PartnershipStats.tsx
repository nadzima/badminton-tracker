"use client";
import { PartnershipStats } from "@/lib/types";

interface Props {
  partnerships: PartnershipStats[];
  limit?: number;
}

export default function PartnershipStatsTable({ partnerships, limit = 5 }: Props) {
  const shown = partnerships.slice(0, limit);
  if (shown.length === 0) {
    return (
      <p className="text-slate-400 text-sm text-center py-6">
        Belum ada data pasangan
      </p>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
            <th className="pb-2 text-left font-medium">#</th>
            <th className="pb-2 text-left font-medium">Pasangan</th>
            <th className="pb-2 text-right font-medium">M</th>
            <th className="pb-2 text-right font-medium text-green-600">W</th>
            <th className="pb-2 text-right font-medium">WR%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
          {shown.map((p, i) => (
            <tr key={`${p.player1.id}-${p.player2.id}`}>
              <td className="py-2.5 text-slate-400 dark:text-slate-500 text-xs w-5">{i + 1}</td>
              <td className="py-2.5 pr-3">
                <p className="font-medium text-slate-800 dark:text-slate-100 text-xs leading-tight">
                  {p.player1.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{p.player2.name}</p>
              </td>
              <td className="py-2.5 text-right text-slate-500 dark:text-slate-400 text-xs">{p.matches}</td>
              <td className="py-2.5 text-right text-green-600 font-semibold text-xs">{p.wins}</td>
              <td className="py-2.5 text-right">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    p.winRate >= 0.6
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : p.winRate >= 0.4
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {Math.round(p.winRate * 100)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
