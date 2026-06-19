"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
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
  const [newPlayerNames, setNewPlayerNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.players.list().then(setAllPlayers);
  }, []);

  const handleAdd = (player: Player | { name: string }) => {
    if ("id" in player) {
      if (!selectedIds.includes(player.id)) setSelectedIds((p) => [...p, player.id]);
    } else {
      const trimmed = player.name.trim();
      if (trimmed && !newPlayerNames.includes(trimmed))
        setNewPlayerNames((p) => [...p, trimmed]);
    }
  };

  const totalPlayers = selectedIds.length + newPlayerNames.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPlayers < 2) { setError("Minimal 2 pemain diperlukan"); return; }
    setSaving(true);
    try {
      const { session } = await api.sessions.create({
        date, location, notes,
        playerIds: selectedIds,
        newPlayerNames,
      });
      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 flex items-center gap-1">← Kembali</button>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Sesi Baru</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Isi detail sesi badminton</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Informasi Sesi</h2>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">Lokasi <span className="text-slate-300 dark:text-slate-600">(opsional)</span></label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. GOR Mawar..."
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">Catatan <span className="text-slate-300 dark:text-slate-600">(opsional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Catatan tambahan..."
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 resize-none" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Pemain</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{totalPlayers} dipilih</span>
          </div>
          <PlayerCombobox
            allPlayers={allPlayers}
            selectedIds={selectedIds}
            onAdd={handleAdd}
            onRemove={(id) => setSelectedIds((p) => p.filter((x) => x !== id))}
            placeholder="Cari atau tambah pemain baru..."
          />
          {newPlayerNames.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">Pemain baru (akan dibuat):</p>
              <div className="flex flex-wrap gap-2">
                {newPlayerNames.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 bg-shuttle-400/20 dark:bg-amber-900/20 text-yellow-800 dark:text-amber-300 text-sm px-3 py-1 rounded-full font-medium">
                    ✨ {name}
                    <button type="button" onClick={() => setNewPlayerNames((p) => p.filter((n) => n !== name))}
                      className="ml-1 text-yellow-600 hover:text-red-500 font-bold leading-none">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">💡 Nama baru akan otomatis ditambahkan ke database.</p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <button type="submit" disabled={saving || totalPlayers < 2}
          className="w-full py-4 rounded-2xl bg-primary-600 text-white text-base font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary-600/20">
          {saving ? "Membuat Sesi..." : `Mulai Sesi (${totalPlayers} pemain)`}
        </button>
      </form>
    </div>
  );
}
