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
    <html lang="id">
      <body>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-20 pb-24 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
