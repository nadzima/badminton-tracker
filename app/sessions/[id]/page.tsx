"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, SessionDetail } from "@/lib/api";
import { Player, Match } from "@/lib/types";
import {
  formatDate,
  generateFairSchedule,
  calcSchedulePreview,
  calcSessionRankings,
  calcPartnerships,
  calcSessionSummary,
} from "@/lib/utils";
import MatchCard from "@/components/MatchCard";
import RankingTable from "@/components/RankingTable";
import AddMatchModal from "@/components/AddMatchModal";
import PlayerCombobox from "@/components/PlayerCombobox";
import SessionSummary from "@/components/SessionSummary";
import PartnershipStatsTable from "@/components/PartnershipStats";
import { downloadAsJpeg } from "@/lib/download";
import { parseTournamentConfig, getFormatLabel } from "@/lib/tournament";
import RoundRobinView from "@/components/tournament/RoundRobinView";
import EliminationBracket from "@/components/tournament/EliminationBracket";
import BeruguView from "@/components/tournament/BeruguView";
import KingOfCourtView from "@/components/tournament/KingOfCourtView";

type Tab = "matches" | "ranking" | "players" | "pairs" | "tournament";

function SessionDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";

  const [data, setData] = useState<SessionDetail | null>(null);
  const [tab, setTab] = useState<Tab>("matches");
  const [loading, setLoading] = useState(true);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [numCourts, setNumCourts] = useState(2);
  const [numMatchesWanted, setNumMatchesWanted] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const rankingRef = useRef<HTMLDivElement>(null);
  const matchHistoryRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const d = await api.sessions.get(id);
    setData(d);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.session) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 dark:text-slate-500 text-sm">Sesi tidak ditemukan.</p>
        <button onClick={() => router.push("/sessions")} className="mt-3 text-primary-600 font-medium text-sm">← Kembali</button>
      </div>
    );
  }

  const { session, players, allPlayers, matches } = data;
  const tournamentConfig = parseTournamentConfig(session.notes ?? "");
  const effectiveTab: Tab = tournamentConfig && tab === "matches" ? "tournament" : tab;
  const isActive = session.status === "active";
  const rankings = calcSessionRankings(matches, players);
  const completedMatches = matches.filter((m) => m.status === "completed");
  const partnerships = calcPartnerships(matches, players);
  const summary = calcSessionSummary(matches, players);
  const lastCompleted = [...matches].reverse().find((m) => m.status === "completed");

  const handleScoreSubmit = async (matchId: string, score1: number, score2: number) => {
    const winner = score1 > score2 ? 1 : score1 < score2 ? 2 : null;
    await api.matches.update(matchId, { team1_score: score1, team2_score: score2, winner_team: winner, status: "completed" });
    await reload();
  };

  const handleUndoLastScore = async () => {
    if (!lastCompleted) return;
    setUndoing(true);
    await api.matches.update(lastCompleted.id, { team1_score: null, team2_score: null, winner_team: null, status: "pending" });
    await reload();
    setUndoing(false);
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

  const handleDeleteSession = async () => {
    if (!confirm("Hapus sesi ini beserta semua match-nya?")) return;
    await api.sessions.delete(id);
    router.push("/sessions");
  };

  const handleCopyReadOnly = async () => {
    const url = `${window.location.origin}/sessions/${id}?readonly=true`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadRanking = async () => {
    if (!rankingRef.current) return;
    await downloadAsJpeg(rankingRef.current, `ranking-${session.date}.jpg`);
  };

  const handleDownloadMatchHistory = async () => {
    if (!matchHistoryRef.current) return;
    await downloadAsJpeg(matchHistoryRef.current, `history-${session.date}.jpg`);
  };

  const tabs = tournamentConfig
    ? [
        { key: "tournament" as Tab, label: "Turnamen" },
        { key: "players" as Tab, label: `Pemain (${players.length})` },
      ]
    : [
        { key: "matches" as Tab, label: `Match (${matches.length})` },
        { key: "ranking" as Tab, label: "Ranking" },
        { key: "pairs" as Tab, label: "Pasangan" },
        { key: "players" as Tab, label: `Pemain (${players.length})` },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/sessions")} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">← Sesi</button>
        {isReadOnly && (
          <span className="ml-auto text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">
            Hanya lihat
          </span>
        )}
      </div>

      {/* Header */}
      <div className={`rounded-2xl p-5 ${isActive ? "bg-primary-700 text-white" : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${isActive ? "bg-white/15 text-white/90" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
              {isActive ? "Aktif" : "Selesai"}
            </span>
            <h1 className={`text-lg font-bold mt-2 ${isActive ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{formatDate(session.date)}</h1>
            {session.location && <p className={`text-sm mt-0.5 ${isActive ? "text-primary-200" : "text-slate-500 dark:text-slate-400"}`}>📍 {session.location}</p>}
            {session.notes && <p className={`text-xs mt-1 ${isActive ? "text-primary-300" : "text-slate-400 dark:text-slate-500"}`}>{session.notes}</p>}
            {tournamentConfig && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full border border-primary-200 dark:border-primary-800 mt-2">
                🏆 {getFormatLabel(tournamentConfig._t)}
              </span>
            )}
          </div>
          <div className={`text-right ${isActive ? "text-primary-200" : "text-slate-400 dark:text-slate-500"}`}>
            <p className={`text-2xl font-bold ${isActive ? "text-white" : "text-slate-700 dark:text-slate-200"}`}>{players.length}</p>
            <p className="text-xs">pemain</p>
          </div>
        </div>
        <div className={`mt-3 flex gap-4 text-xs ${isActive ? "text-primary-200" : "text-slate-400 dark:text-slate-500"}`}>
          <span>{matches.length} match</span>
          <span>{completedMatches.length} selesai</span>
          <span>{matches.length - completedMatches.length} pending</span>
        </div>
      </div>

      {/* Share + Undo row */}
      <div className="flex gap-2">
        <button onClick={handleCopyReadOnly}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          {copied ? "✓ Disalin" : "🔗 Bagikan"}
        </button>
        {isActive && !isReadOnly && !tournamentConfig && lastCompleted && (
          <button onClick={handleUndoLastScore} disabled={undoing}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50">
            {undoing ? "..." : "↩ Undo Skor #" + lastCompleted.match_number}
          </button>
        )}
      </div>

      {/* Active actions (regular sessions only — tournament views manage their own match generation) */}
      {isActive && !isReadOnly && !tournamentConfig && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Generate Jadwal</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Total match</label>
              <input type="number" min={1} max={100} value={numMatchesWanted}
                onChange={(e) => setNumMatchesWanted(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400 dark:bg-slate-700 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Lapangan</label>
              <input type="number" min={1} max={10} value={numCourts}
                onChange={(e) => setNumCourts(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400 dark:bg-slate-700 dark:text-slate-100" />
            </div>
          </div>
          {(() => {
            const p = calcSchedulePreview(players.length, numMatchesWanted, numCourts);
            return (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 grid grid-cols-2 gap-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Lapangan dipakai</span><span className="font-medium text-slate-700 dark:text-slate-200">{p.courtsUsed}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Ronde</span><span className="font-medium text-slate-700 dark:text-slate-200">{p.rounds}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 dark:text-slate-500">Match/pemain</span><span className="font-medium text-slate-700 dark:text-slate-200">~{p.avgMatchesPerPlayer.toFixed(1)}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Istirahat/ronde</span>
                  <span className={`font-medium ${p.canRest ? "text-green-600" : "text-amber-500"}`}>
                    {p.canRest ? `${p.restingPerRound} pemain` : "tidak ada"}
                  </span>
                </div>
              </div>
            );
          })()}
          {error && <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleGenerateRandom} disabled={generating || players.length < 4}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
              {generating ? "Generating..." : "Generate Jadwal"}
            </button>
            <button onClick={() => setShowAddMatch(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
              Manual
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isReadOnly && (
        <div className="flex gap-2">
          {isActive ? (
            <button onClick={handleComplete} disabled={completing}
              className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
              {completing ? "Menyimpan..." : "Selesaikan Sesi"}
            </button>
          ) : (
            <button onClick={handleReopen}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600">
              Buka Kembali
            </button>
          )}
          <button onClick={handleDeleteSession}
            className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm hover:border-red-200 hover:text-red-400 transition-colors">
            Hapus
          </button>
        </div>
      )}

      {/* Session summary (completed only) */}
      {!isActive && completedMatches.length > 0 && (
        <SessionSummary summary={summary} matches={matches} players={players} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${effectiveTab === t.key ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Matches (regular sessions only) */}
      {!tournamentConfig && effectiveTab === "matches" && (
        <div className="space-y-2.5">
          <div className="flex justify-end">
            <button onClick={handleDownloadMatchHistory}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5">
              Download JPG
            </button>
          </div>
          <div ref={matchHistoryRef} className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
            {matches.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada match.</p>
                {isActive && !isReadOnly && <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Generate jadwal atau tambah manual di atas.</p>}
              </div>
            ) : (
              matches.map((m) => (
                <MatchCard key={m.id} match={m} players={allPlayers}
                  onScoreSubmit={isReadOnly ? async () => {} : handleScoreSubmit}
                  onDelete={isReadOnly ? undefined : handleDeleteMatch}
                  sessionStatus={isReadOnly ? "completed" : session.status} />
              ))
            )}
          </div>
          {isActive && !isReadOnly && matches.length > 0 && (
            <button onClick={() => setShowAddMatch(true)}
              className="w-full py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm hover:border-primary-400 hover:text-primary-600 transition-colors">
              + Tambah Match Manual
            </button>
          )}
        </div>
      )}

      {/* Tab: Tournament (tournament sessions only) */}
      {tournamentConfig && effectiveTab === "tournament" && (
        <>
          {tournamentConfig._t === "round_robin" && (
            <RoundRobinView
              config={tournamentConfig}
              players={players}
              matches={matches}
              isReadOnly={isReadOnly}
              onScoreSubmit={handleScoreSubmit}
              onDeleteMatch={handleDeleteMatch}
            />
          )}
          {(tournamentConfig._t === "single_elim" || tournamentConfig._t === "double_elim") && (
            <EliminationBracket
              config={tournamentConfig}
              players={players}
              matches={matches}
              sessionId={id}
              isReadOnly={isReadOnly}
              onScoreSubmit={handleScoreSubmit}
              onDeleteMatch={handleDeleteMatch}
              onReload={reload}
            />
          )}
          {tournamentConfig._t === "beregu" && (
            <BeruguView
              config={tournamentConfig}
              players={players}
              matches={matches}
              sessionId={id}
              isReadOnly={isReadOnly}
              onScoreSubmit={handleScoreSubmit}
              onDeleteMatch={handleDeleteMatch}
              onReload={reload}
            />
          )}
          {tournamentConfig._t === "king_of_court" && (
            <KingOfCourtView
              config={tournamentConfig}
              players={players}
              matches={matches}
              sessionId={id}
              isReadOnly={isReadOnly}
              onScoreSubmit={handleScoreSubmit}
              onDeleteMatch={handleDeleteMatch}
              onReload={reload}
            />
          )}
        </>
      )}

      {/* Tab: Ranking (regular sessions only) */}
      {!tournamentConfig && effectiveTab === "ranking" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Ranking Sesi</p>
            <button onClick={handleDownloadRanking}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1">
              Download JPG
            </button>
          </div>
          {completedMatches.length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada match selesai</p></div>
          ) : (
            <div ref={rankingRef} className="bg-white dark:bg-slate-800 rounded-xl p-1">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{session.date}{session.location ? ` · ${session.location}` : ""}</p>
              <RankingTable rankings={rankings} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Pairs (regular sessions only) */}
      {!tournamentConfig && effectiveTab === "pairs" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-4">Statistik Pasangan</p>
          <PartnershipStatsTable partnerships={partnerships} />
        </div>
      )}

      {/* Tab: Players */}
      {effectiveTab === "players" && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">Pemain ({players.length})</p>
            {players.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">Belum ada pemain</p>
            ) : (
              <div className="space-y-1.5">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5">
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                    {isActive && !isReadOnly && (
                      <button onClick={() => handleRemovePlayer(p.id)} className="text-xs text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors">Hapus</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {isActive && !isReadOnly && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
              {!showAddPlayer ? (
                <button onClick={() => setShowAddPlayer(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm hover:border-primary-400 hover:text-primary-600 transition-colors">
                  + Tambah Pemain
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tambah Pemain</p>
                  <PlayerCombobox allPlayers={allPlayers} selectedIds={players.map((p) => p.id)}
                    onAdd={handleAddPlayer} onRemove={() => {}} placeholder="Cari atau tambah pemain..." />
                  <button onClick={() => setShowAddPlayer(false)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">Tutup</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAddMatch && (
        <AddMatchModal players={players} onClose={() => setShowAddMatch(false)} onAdd={handleAddMatch}
          nextMatchNumber={matches.length > 0 ? Math.max(...matches.map((m) => m.match_number)) + 1 : 1} />
      )}
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SessionDetailInner />
    </Suspense>
  );
}
