"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Player, Match, PlayerRankStats } from "@/lib/types";
import { calcSessionRankings } from "@/lib/utils";
import RankingTable from "@/components/RankingTable";

interface OverallStats extends PlayerRankStats {
  sessionsPlayed: number;
}

export default function PlayersPage() {
  const [rankings, setRankings] = useState<OverallStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Get all data needed
      const [players, sessions] = await Promise.all([
        api.players.list(),
        api.sessions.list(),
      ]);

      // Fetch all matches across all sessions
      const allMatches: Match[] = [];
      const sessionCountMap = new Map<string, Set<string>>();

      await Promise.all(
        sessions.map(async (s) => {
          try {
            const detail = await api.sessions.get(s.id);
            detail.matches.forEach((m) => allMatches.push(m));
            detail.players.forEach((p) => {
              if (!sessionCountMap.has(p.id)) sessionCountMap.set(p.id, new Set());
              sessionCountMap.get(p.id)!.add(s.id);
            });
          } catch {
            // skip failed sessions
          }
        })
      );

      const completed = allMatches.filter((m) => m.status === "completed");
      const globalStats = calcSessionRankings(completed, players);

      setRankings(
        globalStats.map((s) => ({
          ...s,
          sessionsPlayed: sessionCountMap.get(s.player.id)?.size ?? 0,
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  const filtered = rankings.filter((r) =>
    r.player.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">🏆 Ranking All-Time</h1>
        <p className="text-slate-500 text-sm mt-1">Akumulasi seluruh sesi</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pemain", value: rankings.length, icon: "👥" },
          { label: "Match", value: Math.round(rankings.reduce((s, r) => s + r.gamesPlayed, 0) / 2), icon: "🎯" },
          { label: "Top Win%", value: rankings[0] ? `${Math.round(rankings[0].winRate * 100)}%` : "-", icon: "🥇" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-xl font-extrabold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Cari nama pemain..."
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-500 text-sm">{search ? "Pemain tidak ditemukan" : "Belum ada pemain"}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <RankingTable rankings={filtered} showSessions />
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-slate-800 text-sm">Detail Pemain</h2>
            {filtered.map((r, i) => (
              <button key={r.player.id} onClick={() => setSelected(selected === r.player.id ? null : r.player.id)} className="w-full text-left">
                <div className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm border transition-all ${selected === r.player.id ? "border-primary-400" : "border-slate-100"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-slate-400 text-sm">{i + 1}</span>}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{r.player.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{r.sessionsPlayed} sesi · {r.gamesPlayed} match</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-primary-100 text-primary-800 text-sm font-bold px-2.5 py-1 rounded-full">{r.rankPoints} poin</span>
                      <p className="text-xs text-slate-400 mt-1">WR {Math.round(r.winRate * 100)}%</p>
                    </div>
                  </div>

                  {selected === r.player.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                      {[
                        { label: "Menang", value: r.wins, color: "text-primary-600" },
                        { label: "Kalah", value: r.losses, color: "text-red-400" },
                        { label: "Selisih Poin", value: (r.pointDiff >= 0 ? "+" : "") + r.pointDiff, color: r.pointDiff >= 0 ? "text-primary-600" : "text-red-400" },
                        { label: "Poin Dicetak", value: r.pointsScored, color: "text-slate-700" },
                        { label: "Poin Kemasukan", value: r.pointsConceded, color: "text-slate-700" },
                        { label: "Win Rate", value: Math.round(r.winRate * 100) + "%", color: r.winRate >= 0.5 ? "text-primary-600" : "text-red-400" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                          <p className="text-xs text-slate-400">{stat.label}</p>
                          <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
