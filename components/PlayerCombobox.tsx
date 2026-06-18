"use client";
import { useState, useRef, useEffect } from "react";
import { Player } from "@/lib/types";

interface Props {
  allPlayers: Player[];
  selectedIds: string[];
  onAdd: (player: Player | { name: string }) => void;
  onRemove: (playerId: string) => void;
  placeholder?: string;
}

export default function PlayerCombobox({
  allPlayers,
  selectedIds,
  onAdd,
  onRemove,
  placeholder = "Tambah pemain...",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const unselected = allPlayers.filter((p) => !selectedIds.includes(p.id));
  const filtered = query
    ? unselected.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : unselected;

  const exactMatch = allPlayers.find(
    (p) => p.name.toLowerCase() === query.toLowerCase()
  );
  const showAddNew =
    query.trim().length > 0 && !exactMatch && !selectedIds.includes("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (player: Player) => {
    onAdd(player);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleAddNew = () => {
    const name = query.trim();
    if (!name) return;
    onAdd({ name });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const player = allPlayers.find((p) => p.id === id);
            const label = player?.name ?? id;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full font-medium"
              >
                {label}
                <button
                  onClick={() => onRemove(id)}
                  className="ml-1 text-primary-600 hover:text-red-500 font-bold leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />

        {open && (filtered.length > 0 || showAddNew) && (
          <div
            ref={dropRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
          >
            {filtered.map((p) => (
              <button
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 text-slate-700 first:rounded-t-xl"
              >
                {p.name}
              </button>
            ))}
            {showAddNew && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAddNew(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-primary-700 font-medium hover:bg-primary-50 border-t border-slate-100 last:rounded-b-xl"
              >
                ➕ Tambah &quot;{query.trim()}&quot; sebagai pemain baru
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
