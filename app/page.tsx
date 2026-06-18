"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DashStats } from "@/lib/api";
import { formatDateShort } from "@/lib/utils";

export default function HomePage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.get().then((s) => { setStats(s); setLoading(false); });
  }, []);

  const activeSession = stats?.recentSessions.find((s) => s.status === "active");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-600 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-primary-200 text-sm font-medium mb-1">Selamat datang di</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">🏸 Shuttle Track</h1>
        <p className="text-primary-100 text-sm">Catat, analisis, dan tingkatkan permainanmu</p>
        <Link
          href="/sessions/new"
          className="mt-4 inline-flex items-center gap-2 bg-white text-primary-700 font-bold text-sm px-5 py-2.5 rounded-full shadow hover:shadow-md transition-all"
        >
          ➕ Sesi Baru
        </Link>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <Link href={`/sessions/${activeSession.id}`}>
          <div className="bg-shuttle-400/20 border border-shuttle-400 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Sesi Aktif</p>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDateShort(activeSession.date)}</p>
              {activeSession.location && (
                <p className="text-xs text-slate-500">{activeSession.location}</p>
              )}
            </div>
            <span className="text-2xl">▶️</span>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sesi", value: stats?.totalSessions ?? 0, icon: "📅" },
          { label: "Pemain", value: stats?.totalPlayers ?? 0, icon: "👥" },
          { label: "Match", value: stats?.totalMatches ?? 0, icon: "🎯" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top player */}
      {stats?.topPlayer && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
          <span className="text-4xl">🥇</span>
          <div>
            <p className="text-xs text-slate-500 font-medium">Top Player (All Time)</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.topPlayer.name}</p>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800">Sesi Terakhir</h2>
          <Link href="/sessions" className="text-sm text-primary-600 font-medium">
            Lihat semua →
          </Link>
        </div>
        {!stats?.recentSessions.length ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
            <p className="text-4xl mb-3">🏸</p>
            <p className="text-slate-500 text-sm">Belum ada sesi.</p>
            <Link href="/sessions/new" className="mt-3 inline-block text-primary-600 font-semibold text-sm">
              Buat sesi pertamamu →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentSessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100 flex items-center justify-between hover:border-primary-300 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{formatDateShort(s.date)}</p>
                    {s.location && <p className="text-xs text-slate-400 mt-0.5">{s.location}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.status === "active" ? "bg-shuttle-400/20 text-yellow-700" : "bg-primary-100 text-primary-800"}`}>
                    {s.status === "active" ? "Aktif" : "Selesai"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
