"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Player, Match, PlayerRankStats } from "@/lib/types";
import {
  calcSessionRankings,
  calcPartnerships,
  calcHeadToHead,
  calcWinRateTrend,
} from "@/lib/utils";
import RankingTable from "@/components/RankingTable";
import PartnershipStatsTable from "@/components/PartnershipStats";
import WinTrendChart from "@/components/WinTrendChart";
import { downloadAsJpeg } from "@/lib/download";

interface OverallStats extends PlayerRankStats {
  sessionsPlayed: number;
}

type SubTab = "ranking" | "partnerships" | "h2h";

export default function PlayersPage() {
  const [rankings, setRankings] = useState<OverallStats[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [sessionEntries, setSessionEntries] = useState<{ sessionId: string; date: string; matches: Match[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("ranking");
  const [h2hA, setH2hA] = useState("");
  const [h2hB, setH2hB] = useState("");
  const rankingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [players, sessions] = await Promise.all([api.players.list(), api.sessions.list()]);
      const allM: Match[] = [];
      const entries: { sessionId: string; date: string; matches: Match[] }[] = [];
      const sessionCountMap = new Map<string, Set<string>>();

      await Promise.all(
        sessions.map(async (s) => {
          try {
            const detail = await api.sessions.get(s.id);
            detail.matches.forEach((m) => allM.push(m));
            entries.push({ sessionId: s.id, date: s.date, matches: detail.matches });
            detail.players.forEach((p) => {
              if (!sessionCountMap.has(p.id)) sessionCountMap.set(p.id, new Set());
              sessionCountMap.get(p.id)!.add(s.id);
            });
          } catch { /* skip */ }
        })
      );

      const completed = allM.filter((m) => m.status === "completed");
      const globalStats = calcSessionRankings(completed, players);

      setAllMatches(allM);
      setSessionEntries(entries.sort((a, b) => a.date.localeCompare(b.date)));
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

  const allPlayers = rankings.map((r) => r.player);
  const partnerships = calcPartnerships(allMatches, allPlayers);

  const h2hPlayerA = allPlayers.find((p) => p.id === h2hA);
  const h2hPlayerB = allPlayers.find((p) => p.id === h2hB);
  const h2h = h2hA && h2hB && h2hA !== h2hB
    ? calcHeadToHead(allMatches, h2hA, h2hB)
    : null;

  const selectedPlayer = rankings.find((r) => r.player.id === selectedId);
  const trendData = selectedId
    ? calcWinRateTrend(sessionEntries, selectedId)
    : [];

  const handleDownload = async () => {
    if (!rankingRef.current) return;
    await downloadAsJpeg(rankingRef.current, "ranking-all-time.jpg");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ranking All-Time</h1>
        <p className="text-slate-400 text-sm mt-0.5">Akumulasi seluruh sesi</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pemain", value: rankings.length },
          { label: "Match", value: Math.round(rankings.reduce((s, r) => s + r.gamesPlayed, 0) / 2) },
          { label: "Top WR%", value: rankings[0] ? `${Math.round(rankings[0].winRate * 100)}%` : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {(["ranking", "partnerships", "h2h"] as SubTab[]).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${subTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "ranking" ? "Ranking" : t === "partnerships" ? "Pasangan" : "Head-to-Head"}
          </button>
        ))}
      </div>

      {/* Sub-tab: Ranking */}
      {subTab === "ranking" && (
        <div className="space-y-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pemain..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
              <p className="text-slate-400 text-sm">{search ? "Pemain tidak ditemukan" : "Belum ada pemain"}</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex justify-end mb-3">
                  <button onClick={handleDownload}
                    className="text-xs text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                    Download JPG
                  </button>
                </div>
                <div ref={rankingRef} className="bg-white rounded-xl p-1">
                  <RankingTable rankings={filtered} showSessions />
                </div>
              </div>

              {/* Player detail cards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Detail Pemain</p>
                {filtered.map((r, i) => (
                  <div key={r.player.id}>
                    <button onClick={() => setSelectedId(selectedId === r.player.id ? null : r.player.id)}
                      className="w-full text-left">
                      <div className={`bg-white rounded-2xl px-4 py-3.5 border transition-all ${selectedId === r.player.id ? "border-primary-200" : "border-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg w-7 text-center">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-slate-400 text-sm">{i + 1}</span>}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{r.player.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{r.sessionsPlayed} sesi · {r.gamesPlayed} match</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2.5 py-1 rounded-full">
                              {(r.rankScore ?? 0).toFixed(1)}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">{Math.round(r.winRate * 100)}% WR</p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {selectedId === r.player.id && (
                      <div className="bg-white border border-slate-100 border-t-0 rounded-b-2xl px-4 pb-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2 pt-4">
                          {[
                            { label: "Menang", value: r.wins, color: "text-green-600" },
                            { label: "Kalah", value: r.losses, color: "text-red-400" },
                            { label: "Win Rate", value: `${Math.round(r.winRate * 100)}%`, color: r.winRate >= 0.5 ? "text-green-600" : "text-red-400" },
                            { label: "PF", value: r.pointsScored, color: "text-slate-700" },
                            { label: "PA", value: r.pointsConceded, color: "text-slate-700" },
                            { label: "±PD", value: (r.pointDiff >= 0 ? "+" : "") + r.pointDiff, color: r.pointDiff >= 0 ? "text-green-600" : "text-red-400" },
                          ].map((stat) => (
                            <div key={stat.label} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                              <p className="text-xs text-slate-400">{stat.label}</p>
                              <p className={`text-base font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Win rate trend */}
                        {trendData.length >= 2 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tren Win Rate</p>
                            <div className="bg-slate-50 rounded-xl p-3">
                              <WinTrendChart data={trendData} />
                            </div>
                          </div>
                        )}
                        {trendData.length < 2 && (
                          <p className="text-xs text-slate-400 text-center py-1">Min 2 sesi untuk tren win rate</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sub-tab: Partnerships */}
      {subTab === "partnerships" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="font-semibold text-slate-800 text-sm mb-4">Pasangan Terbaik (All-Time)</p>
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <PartnershipStatsTable partnerships={partnerships} limit={10} />
          )}
        </div>
      )}

      {/* Sub-tab: Head-to-Head */}
      {subTab === "h2h" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <p className="font-semibold text-slate-800 text-sm">Head-to-Head</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Pemain A</label>
                <select value={h2hA} onChange={(e) => setH2hA(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
                  <option value="">Pilih...</option>
                  {allPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Pemain B</label>
                <select value={h2hB} onChange={(e) => setH2hB(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
                  <option value="">Pilih...</option>
                  {allPlayers.filter((p) => p.id !== h2hA).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {h2h && h2hPlayerA && h2hPlayerB && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              {h2h.totalMatches === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Belum pernah berhadapan</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 text-center p-4 rounded-xl ${h2h.player1Wins > h2h.player2Wins ? "bg-primary-50 ring-1 ring-primary-200" : "bg-slate-50"}`}>
                      <p className="text-xs text-slate-400 mb-1">{h2hPlayerA.name}</p>
                      <p className={`text-4xl font-bold ${h2h.player1Wins > h2h.player2Wins ? "text-primary-600" : "text-slate-400"}`}>
                        {h2h.player1Wins}
                      </p>
              {h2h.player1Wins > h2h.player2Wins && <p className="text-xs text-primary-500 font-medium mt-1">Unggul</p>}
                    </div>
                    <div className="text-slate-300 font-bold text-sm">vs</div>
                    <div className={`flex-1 text-center p-4 rounded-xl ${h2h.player2Wins > h2h.player1Wins ? "bg-primary-50 ring-1 ring-primary-200" : "bg-slate-50"}`}>
                      <p className="text-xs text-slate-400 mb-1">{h2hPlayerB.name}</p>
                      <p className={`text-4xl font-bold ${h2h.player2Wins > h2h.player1Wins ? "text-primary-600" : "text-slate-400"}`}>
                        {h2h.player2Wins}
                      </p>
              {h2h.player2Wins > h2h.player1Wins && <p className="text-xs text-primary-500 font-medium mt-1">Unggul</p>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">{h2h.totalMatches} pertandingan head-to-head</p>
                </div>
              )}
            </div>
          )}

          {(!h2hA || !h2hB) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-slate-400 text-sm">Pilih dua pemain untuk melihat head-to-head mereka</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
