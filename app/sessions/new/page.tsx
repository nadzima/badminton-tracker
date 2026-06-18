"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Player } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import PlayerCombobox from "@/components/PlayerCombobox";

export default function NewSessionPage() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Pending new players (not yet in DB)
  const [newPlayerNames, setNewPlayerNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("players")
      .select("*")
      .order("name")
      .then(({ data }) => setAllPlayers((data as Player[]) ?? []));
  }, []);

  const handleAdd = (player: Player | { name: string }) => {
    if ("id" in player) {
      if (!selectedIds.includes(player.id)) {
        setSelectedIds((prev) => [...prev, player.id]);
      }
    } else {
      const trimmed = player.name.trim();
      if (trimmed && !newPlayerNames.includes(trimmed)) {
        setNewPlayerNames((prev) => [...prev, trimmed]);
      }
    }
  };

  const handleRemoveExisting = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const handleRemoveNew = (name: string) => {
    setNewPlayerNames((prev) => prev.filter((n) => n !== name));
  };

  const totalPlayers = selectedIds.length + newPlayerNames.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (totalPlayers < 2) {
      setError("Minimal 2 pemain diperlukan");
      return;
    }

    setSaving(true);

    try {
      // 1. Create new players first
      const createdPlayers: Player[] = [];
      for (const name of newPlayerNames) {
        const { data, error: pErr } = await supabase
          .from("players")
          .insert({ name })
          .select()
          .single();
        if (pErr) throw new Error(`Gagal membuat pemain "${name}": ${pErr.message}`);
        createdPlayers.push(data as Player);
      }

      // 2. Create session
      const { data: session, error: sErr } = await supabase
        .from("sessions")
        .insert({ date, location, notes, status: "active" })
        .select()
        .single();
      if (sErr) throw new Error(`Gagal membuat sesi: ${sErr.message}`);

      // 3. Add players to session
      const allIds = [
        ...selectedIds,
        ...createdPlayers.map((p) => p.id),
      ];
      const spRows = allIds.map((player_id) => ({
        session_id: session.id,
        player_id,
      }));
      const { error: spErr } = await supabase
        .from("session_players")
        .insert(spRows);
      if (spErr) throw new Error(`Gagal menambah pemain ke sesi: ${spErr.message}`);

      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1"
        >
          ← Kembali
        </button>
        <h1 className="text-2xl font-extrabold text-slate-800">Sesi Baru</h1>
        <p className="text-slate-500 text-sm mt-1">Isi detail sesi badminton</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <h2 className="font-bold text-slate-800">Informasi Sesi</h2>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Lokasi <span className="text-slate-300">(opsional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. GOR Mawar, Lapangan Indah..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Catatan <span className="text-slate-300">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Players */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Pemain</h2>
            <span className="text-sm text-slate-500">{totalPlayers} dipilih</span>
          </div>

          <PlayerCombobox
            allPlayers={allPlayers}
            selectedIds={selectedIds}
            onAdd={handleAdd}
            onRemove={handleRemoveExisting}
            placeholder="Cari atau tambah pemain baru..."
          />

          {/* New players (not yet in DB) */}
          {newPlayerNames.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-2">Pemain baru (akan dibuat):</p>
              <div className="flex flex-wrap gap-2">
                {newPlayerNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 bg-shuttle-400/20 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium"
                  >
                    ✨ {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveNew(name)}
                      className="ml-1 text-yellow-600 hover:text-red-500 font-bold leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            💡 Ketik nama dan pilih dari daftar. Nama baru akan otomatis ditambahkan ke database.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || totalPlayers < 2}
          className="w-full py-4 rounded-2xl bg-primary-600 text-white text-base font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-600/20"
        >
          {saving ? "Membuat Sesi..." : `Mulai Sesi (${totalPlayers} pemain)`}
        </button>
      </form>
    </div>
  );
}
