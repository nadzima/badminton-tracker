"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Session } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    api.sessions.list().then((s) => { setSessions(s); setLoading(false); });
  }, []);

  const filtered = sessions.filter((s) =>
    filter === "all" ? true : s.status === filter
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">Semua Sesi</h1>
        <Link href="/sessions/new" className="bg-primary-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-primary-700 transition-colors">
          ➕ Baru
        </Link>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {(["all", "active", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f === "all" ? "Semua" : f === "active" ? "Aktif" : "Selesai"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-100">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-500">Tidak ada sesi ditemukan</p>
          <Link href="/sessions/new" className="mt-3 inline-block text-primary-600 font-semibold text-sm">Buat sesi baru →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}>
              <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 hover:border-primary-300 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{formatDateShort(s.date)}</p>
                    {s.location && <p className="text-sm text-slate-500 mt-0.5">📍 {s.location}</p>}
                    {s.notes && <p className="text-sm text-slate-400 mt-1 line-clamp-1">{s.notes}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-2 ${s.status === "active" ? "bg-shuttle-400/20 text-yellow-700" : "bg-primary-100 text-primary-800"}`}>
                    {s.status === "active" ? "⏳ Aktif" : "✅ Selesai"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
