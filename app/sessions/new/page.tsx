"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Player } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import PlayerCombobox from "@/components/PlayerCombobox";
import {
  generateRRSchedule,
  generateSingleElimBracket,
  generateDoubleElimBracket,
  getRoundLabel,
  TournamentFormat,
  BeruguTeam,
  BeruguTie,
} from "@/lib/tournament";

// ─── local types ───────────────────────────────────────────────────────────────
type SessionType = "regular" | "tournament";
type RRMatchType = "doubles" | "singles";

interface BeruguTeamState {
  id: string;
  name: string;
  playerIds: string[];
}

// ─── helpers ───────────────────────────────────────────────────────────────────
const FORMAT_LABELS: Record<TournamentFormat, string> = {
  round_robin: "Liga",
  single_elim: "Gugur",
  double_elim: "Gugur Ganda",
  beregu: "Beregu",
  king_of_court: "Raja Lapangan",
};

const FORMATS: TournamentFormat[] = [
  "round_robin",
  "single_elim",
  "double_elim",
  "beregu",
  "king_of_court",
];

const DEFAULT_RUBBER_LABELS: Record<number, string[]> = {
  3: ["GP", "TP", "GC"],
  4: ["GP", "TP", "GC", "GC2"],
  5: ["GP", "TP", "GC", "GC2", "GC3"],
};

// ─── component ─────────────────────────────────────────────────────────────────
export default function NewSessionPage() {
  const router = useRouter();

  // ── shared state
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── session type
  const [sessionType, setSessionType] = useState<SessionType>("regular");

  // ── regular session state
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newPlayerNames, setNewPlayerNames] = useState<string[]>([]);

  // ── tournament state
  const [tournamentFormat, setTournamentFormat] =
    useState<TournamentFormat>("round_robin");

  // Liga (RR)
  const [rrMatchType, setRRMatchType] = useState<RRMatchType>("doubles");

  // Gugur / Gugur Ganda — just uses player order
  // (no extra config needed beyond player list)

  // Beregu
  const [beruguTeams, setBeruguTeams] = useState<BeruguTeamState[]>([
    { id: "t1", name: "Tim 1", playerIds: [] },
    { id: "t2", name: "Tim 2", playerIds: [] },
  ]);
  const [beruguRubbersPerTie, setBeruguRubbersPerTie] = useState(3);
  const [beruguRubberLabels, setBeruguRubberLabels] = useState<string[]>([
    "GP",
    "TP",
    "GC",
  ]);

  // Raja Lapangan
  const [kocCourts, setKocCourts] = useState(2);

  // ── tournament shared player list (non-beregu)
  const [tourneySelectedIds, setTourneySelectedIds] = useState<string[]>([]);
  const [tourneyNewPlayerNames, setTourneyNewPlayerNames] = useState<string[]>(
    []
  );

  useEffect(() => {
    api.players.list().then(setAllPlayers);
  }, []);

  // ── handlers: regular
  const handleRegularAdd = (player: Player | { name: string }) => {
    if ("id" in player) {
      if (!selectedIds.includes(player.id))
        setSelectedIds((p) => [...p, player.id]);
    } else {
      const trimmed = player.name.trim();
      if (trimmed && !newPlayerNames.includes(trimmed))
        setNewPlayerNames((p) => [...p, trimmed]);
    }
  };

  // ── handlers: tournament (non-beregu)
  const handleTourneyAdd = (player: Player | { name: string }) => {
    if ("id" in player) {
      if (!tourneySelectedIds.includes(player.id))
        setTourneySelectedIds((p) => [...p, player.id]);
    } else {
      const trimmed = player.name.trim();
      if (trimmed && !tourneyNewPlayerNames.includes(trimmed))
        setTourneyNewPlayerNames((p) => [...p, trimmed]);
    }
  };

  // ── handlers: beregu teams
  const handleBeruguAddPlayer = (
    teamId: string,
    player: Player | { name: string }
  ) => {
    setBeruguTeams((teams) =>
      teams.map((t) => {
        if (t.id !== teamId) return t;
        if ("id" in player) {
          if (t.playerIds.includes(player.id)) return t;
          return { ...t, playerIds: [...t.playerIds, player.id] };
        }
        return t; // new player names not supported inside team builder for simplicity
      })
    );
  };

  const handleBeruguRemovePlayer = (teamId: string, playerId: string) => {
    setBeruguTeams((teams) =>
      teams.map((t) =>
        t.id === teamId
          ? { ...t, playerIds: t.playerIds.filter((id) => id !== playerId) }
          : t
      )
    );
  };

  const handleAddTeam = () => {
    if (beruguTeams.length >= 6) return;
    const n = beruguTeams.length + 1;
    setBeruguTeams((t) => [
      ...t,
      { id: `t${n}`, name: `Tim ${n}`, playerIds: [] },
    ]);
  };

  const handleRemoveTeam = (teamId: string) => {
    if (beruguTeams.length <= 2) return;
    setBeruguTeams((t) => t.filter((x) => x.id !== teamId));
  };

  const handleRubbersPerTieChange = (n: number) => {
    setBeruguRubbersPerTie(n);
    setBeruguRubberLabels(DEFAULT_RUBBER_LABELS[n] ?? Array(n).fill(""));
  };

  // players already assigned to another beregu team (for exclusion)
  const allBeruguAssigned = beruguTeams.flatMap((t) => t.playerIds);

  // ── derived counts
  const regularTotal = selectedIds.length + newPlayerNames.length;
  const tourneyTotal = tourneySelectedIds.length + tourneyNewPlayerNames.length;

  // ── format change: reset player lists & beregu when switching
  const handleFormatChange = (fmt: TournamentFormat) => {
    setTournamentFormat(fmt);
    setError("");
  };

  // ── submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (sessionType === "regular") {
      if (regularTotal < 2) {
        setError("Minimal 2 pemain diperlukan");
        return;
      }
      setSaving(true);
      try {
        const { session } = await api.sessions.create({
          date,
          location,
          notes,
          playerIds: selectedIds,
          newPlayerNames,
        });
        router.push(`/sessions/${session.id}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setSaving(false);
      }
      return;
    }

    // ── tournament submit
    setSaving(true);
    try {
      let playerIdsForSession: string[] = [];
      let newNamesForSession: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let config: any = {};

      if (tournamentFormat === "beregu") {
        // Collect all player ids from all teams
        playerIdsForSession = beruguTeams.flatMap((t) => t.playerIds);
        newNamesForSession = [];

        if (beruguTeams.some((t) => t.playerIds.length === 0)) {
          setError("Setiap tim harus memiliki minimal 1 pemain");
          setSaving(false);
          return;
        }
        if (beruguTeams.length < 2) {
          setError("Minimal 2 tim diperlukan");
          setSaving(false);
          return;
        }

        // Build ties
        const teams: BeruguTeam[] = beruguTeams.map((t) => ({
          id: t.id,
          name: t.name,
          playerIds: t.playerIds,
        }));
        let mn = 1;
        const ties: BeruguTie[] = [];
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            ties.push({
              id: `tie-${i + 1}-${j + 1}`,
              teamAId: teams[i].id,
              teamBId: teams[j].id,
              rubbers: beruguRubberLabels.map((label, k) => ({
                id: `r${k + 1}`,
                label,
                matchNumber: mn++,
              })),
            });
          }
        }

        config = { _t: "beregu", teams, ties };
      } else {
        if (tourneyTotal < 2) {
          setError("Minimal 2 pemain diperlukan");
          setSaving(false);
          return;
        }
        playerIdsForSession = tourneySelectedIds;
        newNamesForSession = tourneyNewPlayerNames;

        if (tournamentFormat === "round_robin") {
          const schedule = generateRRSchedule(tourneySelectedIds, rrMatchType);
          config = { _t: "round_robin", matchType: rrMatchType, schedule };
        } else if (tournamentFormat === "single_elim") {
          const rounds = generateSingleElimBracket(tourneySelectedIds);
          config = { _t: "single_elim", rounds };
        } else if (tournamentFormat === "double_elim") {
          const { upper, lower, grandFinal } = generateDoubleElimBracket(
            tourneySelectedIds
          );
          config = { _t: "double_elim", upper, lower, grandFinal };
        } else if (tournamentFormat === "king_of_court") {
          config = { _t: "king_of_court", courts: kocCourts };
        }
      }

      const { session } = await api.sessions.create({
        date,
        location,
        notes: JSON.stringify(config),
        playerIds: playerIdsForSession,
        newPlayerNames: newNamesForSession,
      });

      // ── create pre-planned matches
      if (tournamentFormat === "round_robin") {
        // config.schedule: RRMatchSlot[][] — each slot has { matchNumber, t1p1, t1p2?, t2p1, t2p2? }
        const allSlots = (config.schedule as Array<Array<{ matchNumber: number; t1p1: string; t1p2?: string; t2p1: string; t2p2?: string }>>) ?? [];
        const matchList = allSlots.flatMap((round, roundIdx) =>
          round.map((slot) => ({
            match_number: slot.matchNumber,
            court: `Babak ${roundIdx + 1}`,
            status: "pending" as const,
            team1_player1_id: slot.t1p1,
            team1_player2_id: slot.t1p2 ?? "",
            team2_player1_id: slot.t2p1,
            team2_player2_id: slot.t2p2 ?? "",
            team1_score: null as null,
            team2_score: null as null,
            winner_team: null as null,
          }))
        );
        if (matchList.length > 0) {
          await api.sessions.addMatches(session.id, matchList);
        }
      } else if (tournamentFormat === "single_elim") {
        // config.rounds: ElimSlot[][] — first round has initial seeded players
        const rounds = config.rounds as Array<Array<{ matchNumber: number; p1Id: string | null; p2Id: string | null; autoWinnerId?: string }>>;
        const r1 = rounds[0] ?? [];
        const matchList = r1
          .filter((s) => s.p1Id && s.p2Id && !s.autoWinnerId)
          .map((s) => ({
            match_number: s.matchNumber,
            court: getRoundLabel(0, rounds.length),
            status: "pending" as const,
            team1_player1_id: s.p1Id!,
            team1_player2_id: "",
            team2_player1_id: s.p2Id!,
            team2_player2_id: "",
            team1_score: null as null,
            team2_score: null as null,
            winner_team: null as null,
          }));
        if (matchList.length > 0) {
          await api.sessions.addMatches(session.id, matchList);
        }
      } else if (tournamentFormat === "double_elim") {
        // config.upper: ElimSlot[][] — first upper round has initial seeded players
        const upper = config.upper as Array<Array<{ matchNumber: number; p1Id: string | null; p2Id: string | null; autoWinnerId?: string }>>;
        const r1 = upper[0] ?? [];
        const matchList = r1
          .filter((s) => s.p1Id && s.p2Id && !s.autoWinnerId)
          .map((s) => ({
            match_number: s.matchNumber,
            court: getRoundLabel(0, upper.length),
            status: "pending" as const,
            team1_player1_id: s.p1Id!,
            team1_player2_id: "",
            team2_player1_id: s.p2Id!,
            team2_player2_id: "",
            team1_score: null as null,
            team2_score: null as null,
            winner_team: null as null,
          }));
        if (matchList.length > 0) {
          await api.sessions.addMatches(session.id, matchList);
        }
      }
      // beregu & king_of_court: no matches created upfront

      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  };

  // ── render helpers
  const isTourney = sessionType === "tournament";

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 flex items-center gap-1"
        >
          ← Kembali
        </button>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
          Sesi Baru
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Isi detail sesi badminton
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Tipe Sesi toggle ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Tipe Sesi
          </p>
          <div className="flex gap-2">
            {(["regular", "tournament"] as SessionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSessionType(type);
                  setError("");
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  sessionType === type
                    ? "bg-primary-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {type === "regular" ? "Sesi Biasa" : "Turnamen"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tournament format selector ── */}
        {isTourney && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              Format Turnamen
            </h2>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    tournamentFormat === fmt
                      ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-500"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {FORMAT_LABELS[fmt]}
                </button>
              ))}
            </div>

            {/* Format-specific config */}
            {tournamentFormat === "round_robin" && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Jenis permainan
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRRMatchType("doubles")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      rrMatchType === "doubles"
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    Ganda{" "}
                    <span className="text-xs font-normal opacity-70">
                      (Recommended)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRRMatchType("singles")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      rrMatchType === "singles"
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    Tunggal
                  </button>
                </div>
              </div>
            )}

            {(tournamentFormat === "single_elim" ||
              tournamentFormat === "double_elim") && (
              <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                💡 Urutan pemain menentukan posisi di bracket.
              </p>
            )}

            {tournamentFormat === "king_of_court" && (
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Jumlah lapangan
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={kocCourts}
                  onChange={(e) =>
                    setKocCourts(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-24 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Session info card ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">
            Informasi Sesi
          </h2>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Lokasi{" "}
              <span className="text-slate-300 dark:text-slate-600">
                (opsional)
              </span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. GOR Mawar..."
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          {/* Notes only for regular sessions */}
          {!isTourney && (
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                Catatan{" "}
                <span className="text-slate-300 dark:text-slate-600">
                  (opsional)
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
              />
            </div>
          )}
          {isTourney && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Catatan tidak tersedia di mode turnamen — digunakan untuk
              menyimpan konfigurasi turnamen.
            </p>
          )}
        </div>

        {/* ── Players card (non-beregu) ── */}
        {(!isTourney || tournamentFormat !== "beregu") && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">
                Pemain
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isTourney ? tourneyTotal : regularTotal} dipilih
              </span>
            </div>

            {!isTourney ? (
              <>
                <PlayerCombobox
                  allPlayers={allPlayers}
                  selectedIds={selectedIds}
                  onAdd={handleRegularAdd}
                  onRemove={(id) =>
                    setSelectedIds((p) => p.filter((x) => x !== id))
                  }
                  placeholder="Cari atau tambah pemain baru..."
                />
                {newPlayerNames.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                      Pemain baru (akan dibuat):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {newPlayerNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 bg-shuttle-400/20 dark:bg-amber-900/20 text-yellow-800 dark:text-amber-300 text-sm px-3 py-1 rounded-full font-medium"
                        >
                          ✨ {name}
                          <button
                            type="button"
                            onClick={() =>
                              setNewPlayerNames((p) =>
                                p.filter((n) => n !== name)
                              )
                            }
                            className="ml-1 text-yellow-600 hover:text-red-500 font-bold leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  💡 Nama baru akan otomatis ditambahkan ke database.
                </p>
              </>
            ) : (
              <>
                <PlayerCombobox
                  allPlayers={allPlayers}
                  selectedIds={tourneySelectedIds}
                  onAdd={handleTourneyAdd}
                  onRemove={(id) =>
                    setTourneySelectedIds((p) => p.filter((x) => x !== id))
                  }
                  placeholder="Cari pemain..."
                />
                {tourneyNewPlayerNames.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                      Pemain baru (akan dibuat):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tourneyNewPlayerNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 bg-shuttle-400/20 dark:bg-amber-900/20 text-yellow-800 dark:text-amber-300 text-sm px-3 py-1 rounded-full font-medium"
                        >
                          ✨ {name}
                          <button
                            type="button"
                            onClick={() =>
                              setTourneyNewPlayerNames((p) =>
                                p.filter((n) => n !== name)
                              )
                            }
                            className="ml-1 text-yellow-600 hover:text-red-500 font-bold leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(tournamentFormat === "single_elim" ||
                  tournamentFormat === "double_elim") && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    💡 Urutan pemain di atas menentukan posisi di bracket.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Beregu team builder ── */}
        {isTourney && tournamentFormat === "beregu" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">
                Tim
              </h2>
              {beruguTeams.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddTeam}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                >
                  + Tambah Tim
                </button>
              )}
            </div>

            <div className="space-y-4">
              {beruguTeams.map((team, idx) => {
                const otherAssigned = beruguTeams
                  .filter((t) => t.id !== team.id)
                  .flatMap((t) => t.playerIds);
                const availablePlayers = allPlayers.filter(
                  (p) => !otherAssigned.includes(p.id)
                );
                return (
                  <div
                    key={team.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) =>
                          setBeruguTeams((teams) =>
                            teams.map((t) =>
                              t.id === team.id
                                ? { ...t, name: e.target.value }
                                : t
                            )
                          )
                        }
                        className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                      />
                      {beruguTeams.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeam(team.id)}
                          className="text-slate-400 hover:text-red-500 text-lg font-bold leading-none"
                          title="Hapus tim"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <PlayerCombobox
                      allPlayers={availablePlayers}
                      selectedIds={team.playerIds}
                      onAdd={(p) => handleBeruguAddPlayer(team.id, p)}
                      onRemove={(id) => handleBeruguRemovePlayer(team.id, id)}
                      placeholder={`Tambah pemain ke ${team.name}...`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Rubber config */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Rubber per pertandingan
              </p>
              <div className="flex gap-2">
                {[3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleRubbersPerTieChange(n)}
                    className={`w-12 py-2 rounded-xl text-sm font-bold transition-colors ${
                      beruguRubbersPerTie === n
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Label rubber:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {beruguRubberLabels.map((label, i) => (
                    <input
                      key={i}
                      type="text"
                      value={label}
                      onChange={(e) =>
                        setBeruguRubberLabels((labels) =>
                          labels.map((l, li) =>
                            li === i ? e.target.value : l
                          )
                        )
                      }
                      className="w-16 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={
            saving ||
            (!isTourney && regularTotal < 2) ||
            (isTourney &&
              tournamentFormat !== "beregu" &&
              tourneyTotal < 2) ||
            (isTourney &&
              tournamentFormat === "beregu" &&
              beruguTeams.some((t) => t.playerIds.length === 0))
          }
          className="w-full py-4 rounded-2xl bg-primary-600 text-white text-base font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-600/20"
        >
          {saving
            ? isTourney
              ? "Membuat Turnamen..."
              : "Membuat Sesi..."
            : isTourney
            ? "Buat Turnamen"
            : `Mulai Sesi (${regularTotal} pemain)`}
        </button>
      </form>
    </div>
  );
}
