# 🏸 Shuttle Track

Sistem pencatatan sesi badminton — session tracking, random pairs, score input, dan ranking historis.

## Tech Stack

- **Frontend & Backend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deploy**: Vercel

---

## Setup & Deployment

### 1. Buat Supabase Project

1. Buka [supabase.com](https://supabase.com) dan buat project baru (free tier cukup)
2. Buka **Database → SQL Editor**
3. Copy isi file `supabase/schema.sql` dan jalankan
4. Buka **Project Settings → API** dan catat:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 2. Push ke GitHub

```bash
cd badminton-tracker
git init
git add .
git commit -m "Initial commit: Shuttle Track"
# Buat repo baru di github.com, lalu:
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 3. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **New Project** → Import dari GitHub
2. Di bagian **Environment Variables**, tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL   = <project url dari Supabase>
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon key dari Supabase>
   ```
3. Klik **Deploy** — selesai!

### Development Lokal

```bash
cp .env.example .env.local
# Edit .env.local dengan Supabase URL dan key
npm install
npm run dev
```

---

## Fitur

| Fitur | Keterangan |
|-------|------------|
| **Sesi Baru** | Pilih tanggal, lokasi, dan pemain |
| **Dropdown Pemain** | Nama dari sesi sebelumnya tampil otomatis; input manual untuk pemain baru |
| **Random Pairs** | Generate pasangan acak sesuai jumlah lapangan (1 klik) |
| **Manual Match** | Tambah match dengan pilih pemain secara manual |
| **Input Skor** | Tap match card → isi skor → simpan; edit kapan saja |
| **Ranking Sesi** | Otomatis dihitung: 2 poin per menang, tiebreaker selisih skor |
| **Ranking All-Time** | Akumulasi seluruh sesi, dengan statistik detail per pemain |
| **Selesaikan Sesi** | Tandai sesi completed, bisa dibuka kembali |
| **Hapus Match/Sesi** | Konfirmasi sebelum hapus permanen |

## Sistem Poin

- **Menang** = 2 poin
- **Kalah** = 0 poin
- **Tiebreaker 1**: Selisih skor (poin dicetak – poin kemasukan)
- **Tiebreaker 2**: Total poin dicetak
