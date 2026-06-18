"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Session, Player, Match, SessionPlayer } from "@/lib/types";
import { formatDate, generateRandomMatches, calcSessionRankings } from "@/lib/utils";
import MatchCard from "@/components/MatchCard";
import RankingTable from "@/components/RankingTable";
import AddMatchModal from "@/components/AddMatchModal";
import PlayerCombobox from "@/components/PlayerCombobox";

type Tab = "matches" | "ranking" | "players";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionPlayers, setSessionPlayers] = useState<Player[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<Tab>("matches");
  const [loading, setLoading] = useState(true);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [numCourts, setNumCourts] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: s }, { data: sp }, { data: m }, { data: ap }] =
      await Promise.all([
        supabase.from("sessions").select("*").eq("id", id).single(),
        supabase
          .from("session_players")
          .select("*, player:players(*)")
          .eq("session_id", id),
        supabase
          .from("matches")
          .select("*, team1_player1:players!matches_team1_player1_id_fkey(*), team1_player2:players!matches_team1_player2_id_fkey(*), team2_player1:players!matches_team2_player1_id_fkey(*), team2_player2:players!matches_team2_player2_id_fkey(*)")
          .eq("session_id", id)
          .order("match_number"),
        supabase.from("players").select("*").order("name"),
      ]);

    setSession(s as Session);
    setSessionPlayers(
      ((sp as SessionPlayer[]) ?? []).map((sp) => sp.player as Player)
    );
    setMatches((m as Match[]) ?? []);
    setAllPlayers((ap as Player[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Score submit ─────────────────────────────────────────────────────────────
  const handleScoreSubmit = async (
    matchId: string,
    score1: number,
    score2: number
  ) => {
    const winner = score1 > score2 ? 1 : score1 < score2 ? 2 : null;
    await supabase
      .from("matches")
      .update({
        team1_score: score1,
        team2_score: score2,
        winner_team: winner,
        status: "completed",
      })
      .eq("id", matchId);
    await loadData();
  };

  // ── Delete match ─────────────────────────────────────────────────────────────
  const handleDeleteMatch = async (matchId: string) => {
    await supabase.from("matches").delete().eq("id", matchId);
    await loadData();
  };

  // ── Random pair generation ────────────────────────────────────────────────────
  const handleGenerateRandom = async () => {
    if (sessionPlayers.length < 4) {
      setError("Minimal 4 pemain untuk generate random pairs");
      return;
    }
    setGenerating(true);
    setError("");
    const nextNum =
      matches.length > 0
        ? Math.max(...matches.map((m) => m.match_number)) + 1
        : 1;
    const newMatches = generateRandomMatches(
      sessionPlayers,
      numCourts,
      nextNum
    );
    if (newMatches.length === 0) {
      setError("Pemain tidak cukup untuk semua lapangan yang diminta");
      setGenerating(false);
      return;
    }
    await supabase.from("matches").insert(
      newMatches.map((m) => ({ ...m, session_id: id }))
    );
    await loadData();
    setGenerating(false);
  };

  // ── Add manual match ─────────────────────────────────────────────────────────
  const handleAddMatch = async (data: {
    court: string;
    team1p1: string;
    team1p2: string;
    team2p1: string;
    team2p2: string;
  }) => {
    const nextNum =
      matches.length > 0
        ? Math.max(...matches.map((m) => m.match_number)) + 1
        : 1;
    await supabase.from("matches").insert({
      session_id: id,
      match_number: nextNum,
      court: data.court,
      status: "pending",
      team1_player1_id: data.team1p1,
      team1_player2_id: data.team1p2,
      team2_player1_id: data.team2p1,
      team2_player2_id: data.team2p2,
    });
    await loadData();
  };

  // ── Add player to session ────────────────────────────────────────────────────
  const handleAddPlayer = async (player: Player | { name: string }) => {
    let playerId: string;
    if ("id" in player) {
      playerId = player.id;
    } else {
      const { data, error: pErr } = await supabase
        .from("players")
        .insert({ name: player.name })
        .select()
        .single();
      if (pErr) { setError("Gagal membuat pemain: " + pErr.message); return; }
      playerId = (data as Player).id;
    }
    await supabase
      .from("session_players")
      .upsert({ session_id: id, player_id: playerId });
    await loadData();
    setShowAddPlayer(false);
  };

  const handleRemovePlayer = async (playerId: string) => {
    await supabase
      .from("session_players")
      .delete()
      .eq("session_id", id)
      .eq("player_id", playerId);
    await loadData();
  };

  // ── Complete session ─────────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!confirm("Tandai sesi ini sebagai selesai?")) return;
    setCompleting(true);
    await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", id);
    await loadData();
    setCompleting(false);
  };

  // ── Reopen session ───────────────────────────────────────────────────────────
  const handleReopen = async () => {
    await supabase.from("sessions").update({ status: "active" }).eq("id", id);
    await loadData();
  };

  // ── Delete session ───────────────────────────────────────────────────────────
  const handleDeleteSession = async () => {
    if (!confirm("Hapus sesi ini beserta semua match-nya? Tindakan ini tidak bisa dibatalkan."))
      return;
    await supabase.from("sessions").delete().eq("id", id);
    router.push("/sessions");
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Sesi tidak ditemukan.</p>
        <button onClick={() => router.push("/sessions")} className="mt-3 text-primary-600 font-medium text-sm">
          ← Kembali ke daftar sesi
        </button>
      </div>
    );
  }

  const isActive = session.status === "active";
  const rankings = calcSessionRankings(matches, sessionPlayers);
  const completedMatches = matches.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.push("/sessions")}
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        ← Semua Sesi
      </button>

      {/* Session header card */}
      <div className={`rounded-3xl p-5 shadow-sm ${isActive ? "bg-gradient-to-br from-primary-700 to-primary-600 text-white" : "bg-white border border-slate-200"}`}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {isActive ? "⏳ Aktif" : "✅ Selesai"}
            </span>
            <h1 className={`text-xl font-extrabold mt-2 ${isActive ? "text-white" : "text-slate-800"}`}>
              {formatDate(session.date)}
            </h1>
            {session.location && (
              <p className={`text-sm mt-0.5 ${isActive ? "text-primary-100" : "text-slate-500"}`}>
                📍 {session.location}
              </p>
            )}
            {session.notes && (
              <p className={`text-sm mt-1 ${isActive ? "text-primary-200" : "text-slate-400"}`}>
                {session.notes}
              </p>
            )}
          </div>
          <div className={`text-right text-sm ${isActive ? "text-primary-100" : "text-slate-500"}`}>
            <p className="font-bold text-2xl">{sessionPlayers.length}</p>
            <p>pemain</p>
          </div>
        </div>

        <div className={`mt-4 flex gap-4 text-sm ${isActive ? "text-primary-100" : "text-slate-500"}`}>
          <span>🎯 {matches.length} match</span>
          <span>✅ {completedMatches} selesai</span>
          <span>⏳ {matches.length - completedMatches} menunggu</span>
        </div>
      </div>

      {/* Action buttons */}
      {isActive && (
        <div className="space-y-3">
          {/* Random generate */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">🎲 Generate Random Pairs</h3>
            <div className="flex gap-3 items-center">
              <label className="text-sm text-slate-600 whitespace-nowrap">Jumlah lapangan:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={numCourts}
                onChange={(e) => setNumCourts(parseInt(e.target.value) || 1)}
                className="w-20 border border-slate-300 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              Perlu {numCourts * 4} pemain • {sessionPlayers.length} tersedia → {Math.floor(sessionPlayers.length / 4)} match maks
            </p>
            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleGenerateRandom}
                disabled={generating || sessionPlayers.length < 4}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {generating ? "Generating..." : "🎲 Generate Sekarang"}
              </button>
              <button
                onClick={() => setShowAddMatch(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                ✏️ Manual
              </button>
            </div>
          </div>

          {/* Complete / delete */}
          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 py-3 rounded-2xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-600/20"
            >
              {completing ? "Menyimpan..." : "✅ Selesaikan Sesi"}
            </button>
            <button
              onClick={handleDeleteSession}
              className="px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100"
            >
              🗑️
            </button>
          </div>
        </div>
      )}

      {!isActive && (
        <div className="flex gap-2">
          <button
            onClick={handleReopen}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"
          >
            🔓 Buka Kembali
          </button>
          <button
            onClick={handleDeleteSession}
            className="px-4 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {([
          { key: "matches", label: `Match (${matches.length})` },
          { key: "ranking", label: "Ranking" },
          { key: "players", label: `Pemain (${sessionPlayers.length})` },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Matches */}
      {tab === "matches" && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-slate-500 text-sm">Belum ada match.</p>
              {isActive && (
                <p className="text-slate-400 text-xs mt-1">
                  Generate random pairs atau tambah manual di atas.
                </p>
              )}
            </div>
          ) : (
            matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                players={allPlayers}
                onScoreSubmit={handleScoreSubmit}
                onDelete={handleDeleteMatch}
                sessionStatus={session.status}
              />
            ))
          )}

          {isActive && matches.length > 0 && (
            <button
              onClick={() => setShowAddMatch(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
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
            <span className="text-xs text-slate-400">
              {completedMatches} match selesai
            </span>
          </div>
          {completedMatches === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-slate-400 text-sm">
                Ranking akan muncul setelah ada match yang selesai
              </p>
            </div>
          ) : (
            <>
              <RankingTable rankings={rankings} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Poin: Menang = 2, Kalah = 0 &nbsp;|&nbsp; Tiebreaker: selisih skor
                </p>
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
            {sessionPlayers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Belum ada pemain</p>
            ) : (
              <div className="space-y-2">
                {sessionPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
                  >
                    <span className="font-medium text-slate-800">{p.name}</span>
                    {isActive && (
                      <button
                        onClick={() => handleRemovePlayer(p.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isActive && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">
                {showAddPlayer ? "Tambah Pemain" : ""}
              </h3>
              {!showAddPlayer ? (
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  ➕ Tambah Pemain ke Sesi
                </button>
              ) : (
                <div className="space-y-3">
                  <PlayerCombobox
                    allPlayers={allPlayers}
                    selectedIds={sessionPlayers.map((p) => p.id)}
                    onAdd={handleAddPlayer}
                    onRemove={() => {}}
                    placeholder="Cari atau tambah pemain baru..."
                  />
                  <button
                    onClick={() => setShowAddPlayer(false)}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Match Modal */}
      {showAddMatch && (
        <AddMatchModal
          players={sessionPlayers}
          onClose={() => setShowAddMatch(false)}
          onAdd={handleAddMatch}
          nextMatchNumber={
            matches.length > 0
              ? Math.max(...matches.map((m) => m.match_number)) + 1
              : 1
          }
        />
      )}
    </div>
  );
}
