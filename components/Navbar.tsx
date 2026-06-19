"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/", label: "Home", icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-600"}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )},
  { href: "/sessions", label: "Sesi", icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-600"}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )},
  { href: "/players", label: "Pemain", icon: (active: boolean) => (
    <svg className={`w-5 h-5 ${active ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-600"}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.26 9.71 2 12 2c2.291 0 4.545.26 6.75.721v1.515M19.75 4.236c.982.143 1.954.317 2.916.52a6.003 6.003 0 01-5.395 5.492M19.75 4.236V4.5a9.75 9.75 0 01-2.48 5.228" />
    </svg>
  )},
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Shuttle Track</span>
          <ThemeToggle />
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5"
              >
                {item.icon(active)}
                <span className={`text-xs font-medium ${active ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
