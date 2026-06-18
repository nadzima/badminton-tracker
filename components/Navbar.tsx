"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/sessions", label: "Sesi", icon: "📅" },
  { href: "/players", label: "Pemain", icon: "🏆" },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <span className="text-xl">🏸</span>
          <span className="font-bold text-lg tracking-tight">Shuttle Track</span>
        </div>
      </header>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? path === "/"
                : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
                  active
                    ? "text-primary-600"
                    : "text-slate-500 hover:text-primary-600"
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
