# 🏸 Shuttle Track

Sistem pencatatan sesi badminton.  
**Database: Google Spreadsheet** — tidak perlu SQL, tidak perlu Google Cloud!

---

## Setup (3 langkah)

### Step 1 — Google Spreadsheet ✅
Sudah dibuat: `13Ckmw3j_DnpzNTtbkZCRb7BNDG8z-Gf6Nf5wuh0hRR4`

### Step 2 — Google Apps Script

1. Buka spreadsheet → menu **Extensions → Apps Script**
2. Hapus semua kode → paste kode dari file `scripts/appscript.js`
3. Klik **Save**
4. Klik **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy** → **Authorize** → copy **Web app URL**

### Step 3 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → New Project → Import `nadzima/badminton-tracker`
2. Tambah Environment Variable:
   - `APPS_SCRIPT_URL` = URL dari Step 2
3. Klik **Deploy**
4. Setelah deploy, buka `https://your-app.vercel.app/api/setup` (sekali saja)

---

## Fitur

| Fitur | Keterangan |
|-------|------------|
| Sesi Baru | Pilih tanggal, lokasi, pemain |
| Dropdown Pemain | Nama dari sesi sebelumnya muncul otomatis |
| Random Pairs | Generate pasangan acak per lapangan |
| Manual Match | Pilih pemain sendiri |
| Input Skor | Tap → isi → simpan |
| Ranking Sesi | 2 poin/menang, tiebreaker selisih skor |
| Ranking All-Time | Akumulasi seluruh sesi |
| Google Sheets DB | Data terlihat langsung di spreadsheet |

## Development Lokal

```bash
cp .env.example .env.local
# isi APPS_SCRIPT_URL
npm install
npm run dev
# buka http://localhost:3000/api/setup sekali untuk init sheet
```
