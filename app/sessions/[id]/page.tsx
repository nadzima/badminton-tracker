"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, SessionDetail } from "@/lib/api";
import { Player, Match } from "@/lib/types";
import { formatDate, generateFairSchedule, calcSchedulePreview, calcSessionRankings } from "@/lib/utils";
import MatchCard from "@/components/MatchCard";
import RankingTable from "@/components/RankingTable";
import AddMatchModal from "@/components/AddMatchModal";
import PlayerCombobox from "@/components/PlayerCombobox";
import { downloadAsJpeg } from "@/lib/download";

type Tab = "matches" | "ranking" | "players";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<SessionDetail | null>(null);
  const [tab, setTab] = useState<Tab>("matches");
  const [loading, setLoading] = useState(true);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [numCourts, setNumCourts] = useState(2);
  const [numMatchesWanted, setNumMatchesWanted] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const rankingRef = useRef<HTMLDivElement>(null);
  const matchHistoryRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const d = await api.sessions.get(id);
    setData(d);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.session) return <div className="text-center py-20"><p className="text-slate-400">Sesi tidak ditemukan.</p><button onClick={() => router.push("/sessions")} className="mt-3 text-primary-600 font-medium text-sm">← Kembali</button></div>;

  const { session, players, allPlayers, matches } = data;
  const isActive = session.status === "active";
  const rankings = calcSessionRankings(matches, players);
  const completedMatches = matches.filter((m) => m.status === "completed").length;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleScoreSubmit = async (matchId: string, score1: number, score2: number) => {
    const winner = score1 > score2 ? 1 : score1 < score2 ? 2 : null;
    await api.matches.update(matchId, { team1_score: score1, team2_score: score2, winner_team: winner, status: "completed" });
    await reload();
  };

  const handleDeleteMatch = async (matchId: string) => {
    await api.matches.delete(matchId);
    await reload();
  };

  const handleGenerateRandom = async () => {
    if (players.length < 4) { setError("Minimal 4 pemain untuk generate jadwal"); return; }
    setGenerating(true); setError("");
    const nextNum = matches.length > 0 ? Math.max(...matches.map((m) => m.match_number)) + 1 : 1;
    const newMatches = generateFairSchedule(players, numMatchesWanted, numCourts, nextNum);
    if (newMatches.length === 0) { setError("Pemain tidak cukup untuk lapangan yang dipilih"); setGenerating(false); return; }
    await api.sessions.addMatches(id, newMatches as Parameters<typeof api.sessions.addMatches>[1]);
    await reload();
    setGenerating(false);
  };

  const handleAddMatch = async (formData: { court: string; team1p1: string; team1p2: string; team2p1: string; team2p2: string }) => {
    const nextNum = matches.length > 0 ? Math.max(...matches.map((m) => m.match_number)) + 1 : 1;
    await api.sessions.addMatches(id, [{
      match_number: nextNum, court: formData.court, status: "pending",
      team1_player1_id: formData.team1p1, team1_player2_id: formData.team1p2,
      team2_player1_id: formData.team2p1, team2_player2_id: formData.team2p2,
      team1_score: null, team2_score: null, winner_team: null,
    }]);
    await reload();
  };

  const handleAddPlayer = async (player: Player | { name: string }) => {
    if ("id" in player) {
      await api.sessions.addPlayer(id, { playerId: player.id });
    } else {
      await api.sessions.addPlayer(id, { playerName: player.name });
    }
    await reload();
    setShowAddPlayer(false);
  };

  const handleRemovePlayer = async (playerId: string) => {
    await api.sessions.removePlayer(id, playerId);
    await reload();
  };

  const handleComplete = async () => {
    if (!confirm("Tandai sesi ini sebagai selesai?")) return;
    setCompleting(true);
    await api.sessions.update(id, { status: "completed" });
    await reload();
    setCompleting(false);
  };

  const handleReopen = async () => {
    await api.sessions.update(id, { status: "active" });
    await reload();
  };

  const handleDownloadRanking = async () => {
    if (!rankingRef.current) return;
    await downloadAsJpeg(rankingRef.current, `ranking-${session.date}.jpg`);
  };

  const handleDownloadMatchHistory = async () => {
    if (!matchHistoryRef.current) return;
    await downloadAsJpeg(matchHistoryRef.current, `match-history-${session.date}.jpg`);
  };

  const handleDeleteSession = async () => {
    if (!confirm("Hapus sesi ini beserta semua match-nya?")) return;
    await api.sessions.delete(id);
    router.push("/sessions");
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/sessions")} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">← Semua Sesi</button>

      {/* Header */}
      <div className={`rounded-3xl p-5 shadow-sm ${isActive ? "bg-gradient-to-br from-primary-700 to-primary-600 text-white" : "bg-white border border-slate-200"}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {isActive ? "⏳ Aktif" : "✅ Selesai"}
            </span>
            <h1 className={`text-xl font-extrabold mt-2 ${isActive ? "text-white" : "text-slate-800"}`}>{formatDate(session.date)}</h1>
            {session.location && <p className={`text-sm mt-0.5 ${isActive ? "text-primary-100" : "text-slate-500"}`}>📍 {session.location}</p>}
            {session.notes && <p className={`text-sm mt-1 ${isActive ? "text-primary-200" : "text-slate-400"}`}>{session.notes}</p>}
          </div>
          <div className={`text-right text-sm ${isActive ? "text-primary-100" : "text-slate-500"}`}>
            <p className="font-bold text-2xl">{players.length}</p>
            <p>pemain</p>
          </div>
        </div>
        <div className={`mt-4 flex gap-4 text-sm ${isActive ? "text-primary-100" : "text-slate-500"}`}>
          <span>🎯 {matches.length} match</span>
          <span>✅ {completedMatches} selesai</span>
          <span>⏳ {matches.length - completedMatches} menunggu</span>
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">🎲 Generate Jadwal Otomatis</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Total match</label>
                <input
                  type="number" min={1} max={100} value={numMatchesWanted}
                  onChange={(e) => setNumMatchesWanted(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Lapangan tersedia</label>
                <input
                  type="number" min={1} max={10} value={numCourts}
                  onChange={(e) => setNumCourts(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {(() => {
              const p = calcSchedulePreview(players.length, numMatchesWanted, numCourts);
              return (
                <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Lapangan dipakai</span>
                      <span className="font-semibold text-slate-700">{p.courtsUsed}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Ronde</span>
                      <span className="font-semibold text-slate-700">{p.rounds}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Main/pemain</span>
                      <span className="font-semibold text-slate-700">~{p.avgMatchesPerPlayer.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Istirahat/ronde</span>
                      <span className={`font-semibold ${p.canRest ? "text-green-600" : "text-amber-500"}`}>
                        {p.canRest ? `${p.restingPerRound} pemain` : "tidak ada"}
                      </span>
                    </div>
                  </div>
                  {p.canRest && (
                    <p className="text-xs text-green-600 border-t border-slate-200 pt-2">
                      ✓ Pemain digilir — tidak back-to-back kecuali terpaksa
                    </p>
                  )}
                  {!p.canRest && players.length >= 4 && (
                    <p className="text-xs text-amber-500 border-t border-slate-200 pt-2">
                      Tambah pemain agar ada rotasi istirahat
                    </p>
                  )}
                </div>
              );
            })()}

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleGenerateRandom} disabled={generating || players.length < 4}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
                {generating ? "Generating..." : "🎲 Generate Jadwal"}
              </button>
              <button onClick={() => setShowAddMatch(true)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                ✏️ Manual
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleComplete} disabled={completing}
              className="flex-1 py-3 rounded-2xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-600/20">
              {completing ? "Menyimpan..." : "✅ Selesaikan Sesi"}
            </button>
            <button onClick={handleDeleteSession} className="px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100">🗑️</button>
          </div>
        </div>
      )}

      {!isActive && (
        <div className="flex gap-2">
          <button onClick={handleReopen} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200">🔓 Buka Kembali</button>
          <button onClick={handleDeleteSession} className="px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100">🗑️</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { key: "matches", label: `Match (${matches.length})` },
          { key: "ranking", label: "Ranking" },
          { key: "players", label: `Pemain (${players.length})` },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Matches */}
      {tab === "matches" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={handleDownloadMatchHistory}
              className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              ⬇ Download JPG
            </button>
          </div>
          <div ref={matchHistoryRef} className="space-y-3 bg-slate-50 rounded-2xl p-3">
          {matches.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-slate-500 text-sm">Belum ada match.</p>
              {isActive && <p className="text-slate-400 text-xs mt-1">Generate random pairs atau tambah manual di atas.</p>}
            </div>
          ) : (
            matches.map((m) => (
              <MatchCard key={m.id} match={m} players={allPlayers} onScoreSubmit={handleScoreSubmit} onDelete={handleDeleteMatch} sessionStatus={session.status} />
            ))
          )}
          </div>
          {isActive && matches.length > 0 && (
            <button onClick={() => setShowAddMatch(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors">
              ➕ Tambah Match Manual
            </button>
          )}
        </div>
      )}

      {/* Tab: Ranking */}
      {tab === "ranking" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Ranking Sesi</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{completedMatches} match selesai</span>
              <button onClick={handleDownloadRanking}
                className="text-xs text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                ⬇ JPG
              </button>
            </div>
          </div>
          {completedMatches === 0 ? (
            <div className="text-center py-8"><p className="text-3xl mb-2">📊</p><p className="text-slate-400 text-sm">Ranking akan muncul setelah ada match yang selesai</p></div>
          ) : (
            <>
              <div ref={rankingRef} className="bg-white rounded-xl p-2">
                <p className="text-sm font-bold text-slate-700 mb-3">
                  Ranking Sesi · {session.date}
                  {session.location ? ` · ${session.location}` : ""}
                </p>
                <RankingTable rankings={rankings} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Players */}
      {tab === "players" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-3">Pemain di Sesi Ini</h2>
            {players.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Belum ada pemain</p>
            ) : (
              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <span className="font-medium text-slate-800">{p.name}</span>
                    {isActive && (
                      <button onClick={() => handleRemovePlayer(p.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Hapus</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isActive && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              {!showAddPlayer ? (
                <button onClick={() => setShowAddPlayer(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors">
                  ➕ Tambah Pemain ke Sesi
                </button>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm">Tambah Pemain</h3>
                  <PlayerCombobox
                    allPlayers={allPlayers}
                    selectedIds={players.map((p) => p.id)}
                    onAdd={handleAddPlayer}
                    onRemove={() => {}}
                    placeholder="Cari atau tambah pemain baru..."
                  />
                  <button onClick={() => setShowAddPlayer(false)} className="text-sm text-slate-400 hover:text-slate-600">Tutup</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAddMatch && (
        <AddMatchModal
          players={players}
          onClose={() => setShowAddMatch(false)}
          onAdd={handleAddMatch}
          nextMatchNumber={matches.length > 0 ? Math.max(...matches.map((m) => m.match_number)) + 1 : 1}
        />
      )}
    </div>
  );
}
