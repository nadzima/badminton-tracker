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
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-primary-700 rounded-2xl p-5 text-white">
        <p className="text-primary-300 text-xs font-medium tracking-wide uppercase mb-1">Shuttle Track</p>
        <h1 className="text-2xl font-bold tracking-tight">Selamat datang 🏸</h1>
        <p className="text-primary-300 text-sm mt-1">Catat, analisis, dan tingkatkan permainanmu</p>
        <Link
          href="/sessions/new"
          className="mt-4 inline-flex items-center gap-2 bg-white text-primary-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors"
        >
          + Sesi Baru
        </Link>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <Link href={`/sessions/${activeSession.id}`}>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between hover:border-amber-300 transition-colors">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Sesi Aktif</p>
              <p className="font-semibold text-slate-800 mt-0.5 text-sm">{formatDateShort(activeSession.date)}</p>
              {activeSession.location && (
                <p className="text-xs text-slate-400 mt-0.5">{activeSession.location}</p>
              )}
            </div>
            <span className="text-slate-400 text-lg">›</span>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sesi", value: stats?.totalSessions ?? 0 },
          { label: "Pemain", value: stats?.totalPlayers ?? 0 },
          { label: "Match", value: stats?.totalMatches ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top player */}
      {stats?.topPlayer && (
        <Link href="/players">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-lg">🥇</div>
              <div>
                <p className="text-xs text-slate-400">Top Player (All Time)</p>
                <p className="font-semibold text-slate-800 text-sm">{stats.topPlayer.name}</p>
              </div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </div>
        </Link>
      )}

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="font-semibold text-slate-800 text-sm">Sesi Terakhir</p>
          <Link href="/sessions" className="text-xs text-primary-600 font-medium">Lihat semua</Link>
        </div>
        {!stats?.recentSessions.length ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
            <p className="text-slate-400 text-sm">Belum ada sesi.</p>
            <Link href="/sessions/new" className="mt-2 inline-block text-primary-600 font-medium text-sm">
              Buat sesi pertamamu →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentSessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{formatDateShort(s.date)}</p>
                    {s.location && <p className="text-xs text-slate-400 mt-0.5">{s.location}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.status === "active" ? "bg-amber-50 text-amber-600" : "bg-primary-50 text-primary-700"}`}>
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
