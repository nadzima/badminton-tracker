# 🏸 Shuttle Track

Sistem pencatatan sesi badminton — session tracking, random pairs, score input, dan ranking historis.  
**Database: Google Spreadsheet** (tidak perlu SQL sama sekali!)

---

## Setup (ikuti urutan ini)

### Step 1 — Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) → Buat spreadsheet baru
2. Beri nama: `Shuttle Track DB`
3. Catat **ID spreadsheet** dari URL:  
   `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`

### Step 2 — Buat Google Cloud Service Account

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru (atau pakai yang sudah ada)
3. Cari **"Google Sheets API"** → Enable
4. Buka **APIs & Services → Credentials → Create Credentials → Service Account**
5. Isi nama, klik **Create and Continue** → **Done**
6. Klik service account yang baru dibuat → tab **Keys** → **Add Key → JSON**
7. File JSON akan ter-download — simpan baik-baik

### Step 3 — Bagikan Spreadsheet ke Service Account

1. Buka file JSON yang tadi di-download
2. Cari field `"client_email"` — copy emailnya (contoh: `xxx@project.iam.gserviceaccount.com`)
3. Buka Google Spreadsheet → klik **Share** → paste email service account → pilih **Editor**

### Step 4 — Deploy ke Vercel

1. Push code ke GitHub (sudah selesai)
2. Buka [vercel.com](https://vercel.com) → **New Project** → Import `nadzima/badminton-tracker`
3. Tambahkan **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `SPREADSHEET_ID` | ID dari URL spreadsheet (Step 1) |
   | `GOOGLE_SERVICE_ACCOUNT_KEY` | Isi seluruh konten file JSON (copy-paste) |

4. Klik **Deploy**

### Step 5 — Inisialisasi Spreadsheet

Setelah deploy selesai, buka URL app kamu + `/api/setup`:  
`https://your-app.vercel.app/api/setup`

Ini akan otomatis membuat 4 tab di spreadsheet: `players`, `sessions`, `session_players`, `matches`.

---

## Fitur

| Fitur | Keterangan |
|-------|------------|
| **Sesi Baru** | Pilih tanggal, lokasi, dan pemain |
| **Dropdown Pemain** | Nama dari sesi sebelumnya tampil otomatis |
| **Pemain Baru** | Input manual untuk pemain yang belum pernah main |
| **Random Pairs** | Generate pasangan acak sesuai jumlah lapangan |
| **Manual Match** | Tambah match dengan pilih pemain secara manual |
| **Input Skor** | Tap match card → isi skor → simpan |
| **Ranking Sesi** | 2 poin per menang, tiebreaker selisih skor |
| **Ranking All-Time** | Akumulasi seluruh sesi dengan statistik lengkap |
| **Google Sheets DB** | Data tersimpan di spreadsheet, bisa dilihat langsung |

## Development Lokal

```bash
cp .env.example .env.local
# Edit .env.local dengan SPREADSHEET_ID dan isi JSON key
npm install
npm run dev
# Lalu buka http://localhost:3000/api/setup sekali untuk init sheet
```
