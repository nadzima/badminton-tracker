import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Shuttle Track",
  description: "Sistem pencatatan sesi badminton",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if((s||d)==='dark')document.documentElement.classList.add('dark');})();` }} />
      </head>
      <body>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-14 pb-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
