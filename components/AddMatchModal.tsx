"use client";
import { useState } from "react";
import { Player } from "@/lib/types";

interface Props {
  players: Player[];
  onClose: () => void;
  onAdd: (data: {
    court: string;
    team1p1: string;
    team1p2: string;
    team2p1: string;
    team2p2: string;
  }) => Promise<void>;
  nextMatchNumber: number;
}

export default function AddMatchModal({ players, onClose, onAdd, nextMatchNumber }: Props) {
  const [court, setCourt] = useState(`Court 1`);
  const [team1p1, setTeam1p1] = useState("");
  const [team1p2, setTeam1p2] = useState("");
  const [team2p1, setTeam2p1] = useState("");
  const [team2p2, setTeam2p2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = [team1p1, team1p2, team2p1, team2p2].filter(Boolean);
  const uniqueSelected = new Set(selected);

  const validate = () => {
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2) return "Pilih semua 4 pemain";
    if (uniqueSelected.size < 4) return "Pemain tidak boleh sama dalam satu match";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    await onAdd({ court, team1p1, team1p2, team2p1, team2p2 });
    setSaving(false);
    onClose();
  };

  const PlayerSelect = ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
  }) => (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
      >
        <option value="">-- Pilih pemain --</option>
        {players.map((p) => (
          <option
            key={p.id}
            value={p.id}
            disabled={selected.includes(p.id) && value !== p.id}
          >
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">
            Tambah Match #{nextMatchNumber}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Court */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Lapangan</label>
            <input
              type="text"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="e.g. Court 1"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Team 1 */}
          <div className="bg-blue-50 rounded-2xl p-3 space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Team 1</p>
            <PlayerSelect value={team1p1} onChange={setTeam1p1} label="Pemain 1" />
            <PlayerSelect value={team1p2} onChange={setTeam1p2} label="Pemain 2" />
          </div>

          {/* Team 2 */}
          <div className="bg-orange-50 rounded-2xl p-3 space-y-3">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Team 2</p>
            <PlayerSelect value={team2p1} onChange={setTeam2p1} label="Pemain 1" />
            <PlayerSelect value={team2p2} onChange={setTeam2p2} label="Pemain 2" />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Tambah Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
