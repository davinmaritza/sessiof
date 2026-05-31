# Sessiof 🎓🔍

> **Sistem Absensi Sekolah berbasis Deteksi Wajah (Face Recognition Attendance System)**

Sessiof mendeteksi dan mengenali wajah siswa secara *real-time* menggunakan kamera Webcam. Menggunakan algoritma **YuNet** untuk deteksi wajah dan model **SFace** dari OpenCV untuk pengenalan identitas yang akurat. Setiap siswa yang teridentifikasi, data kehadirannya otomatis tercatat ke **Excel lokal** dan tersinkronisasi dengan **Dashboard Web Next.js** secara real-time.

---

## 🌟 Fitur Utama

### 🤖 Sistem Kamera Absensi
- **Registrasi Wajah Baru** — Mengambil sampel wajah siswa dari berbagai sudut secara otomatis.
- **Deteksi & Absensi Real-Time** — Mengenali wajah di kamera dengan *anti-duplicate log* harian.
- **Status Kehadiran Lengkap** — Hadir, Terlambat, Izin, Sakit, dan Alpa (auto-generate).

### 📊 Portal Admin Web (Next.js)
- **Dashboard Statistik** — Statistik hadir, terlambat, izin, sakit & alpa dengan grafik interaktif.
- **Statistik per Kelas** — Laporan mendalam tiap kelas untuk Wali Kelas & Admin.
- **Daftar Kehadiran** — Tabel kehadiran lengkap dengan filter kelas, status, dan tanggal.
- **Kalender Akademik** — CRUD agenda dan kegiatan sekolah langsung dari portal.
- **Export Laporan** — Download rekap absensi dalam format CSV & Excel (.xlsx).
- **Portal Siswa** — Dashboard mandiri siswa dengan grafik kehadiran pribadi.
- **Pengumuman Sekolah** — Buat & kelola pengumuman yang tampil di portal siswa.
- **Izin Digital** — Siswa dapat mengajukan surat izin langsung dari portal.
- **Kelola Pengguna** — Manajemen akun Admin & Guru dengan role & penugasan wali kelas.
- **Pengaturan Sistem** — Toleransi keterlambatan (grace period) & notifikasi WhatsApp.

### 🔔 Integrasi & Notifikasi
- **Notifikasi WhatsApp Orang Tua** — Simulasi kirim pesan otomatis saat siswa tidak hadir.
- **Google Sheets Sync** — Sinkronisasi data absensi ke Google Sheets via Webhook.

---

## 📂 Struktur Proyek

```text
sessiof/
├── dataset/                    # Foto wajah siswa hasil registrasi [.gitignore]
├── face_attendance.py          # Program utama kamera absensi (Python)
├── server.py                   # Flask API Server — jembatan Python ↔ Next.js
├── dashboard.py                # Dashboard alternatif berbasis Streamlit
├── dashboard-web/              # Portal Admin & Siswa (Next.js 15 / React 19)
│   ├── public/
│   │   └── sessiof-logo.png    # Logo aplikasi Sessiof
│   └── src/app/
│       ├── (portal)/           # Layout & halaman portal admin
│       │   ├── dashboard/      # Dashboard statistik utama
│       │   ├── attendance/     # Daftar & manajemen kehadiran
│       │   ├── statistik-kelas/# Statistik mendalam per kelas
│       │   ├── users/          # Kelola akun pengguna (admin/guru)
│       │   ├── izin/           # Permohonan izin siswa
│       │   ├── pengumuman/     # Pengumuman sekolah
│       │   ├── settings/       # Pengaturan sistem
│       │   └── layout.tsx      # Layout sidebar portal admin
│       ├── student/dashboard/  # Portal akses mandiri siswa
│       ├── login/              # Halaman login
│       └── page.tsx            # Landing page publik
├── .gitignore
└── README.md
```

> **File yang di-ignore:** `dataset/`, `users.json`, `settings.json`, `attendance.xlsx`, `students_metadata.json`, `admin_account.json`, `*.pkl`, `*.onnx`

---

## 🚀 Panduan Instalasi & Menjalankan

### Prasyarat
- **Python 3.10+** dengan pip
- **Node.js 18+** dengan npm

---

### 1. Clone Repositori
```bash
git clone https://github.com/davinmaritza/sessiof.git
cd sessiof
```

---

### 2. Setup Python & Instal Dependensi

```bash
# (Opsional) Buat virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows CMD/PowerShell
# source .venv/bin/activate   # Linux/macOS

# Instal dependensi Python
pip install opencv-contrib-python pandas openpyxl requests numpy flask flask-cors
```

---

### 3. Buat File Konfigurasi Data Awal

Buat file `users.json` di root proyek (tidak di-commit karena sensitif):

```json
[
  {
    "username": "admin",
    "password": "admin123",
    "name": "Administrator",
    "role": "admin"
  }
]
```

Buat file `settings.json`:
```json
{
  "jam_masuk": "07:00",
  "jam_pulang": "15:00",
  "grace_period": 15,
  "whatsapp_notifications_enabled": false
}
```

---

### 4. Jalankan Flask Server (Backend)

```bash
# Di folder root sessiof/
python server.py
```
Server berjalan di `http://localhost:5000`

---

### 5. Jalankan Portal Web (Frontend)

Buka terminal baru:

```bash
cd dashboard-web
npm install
npm run dev
```

Akses portal di browser: **http://localhost:3000**

---

### 6. Jalankan Kamera Absensi

```bash
# Di folder root sessiof/
python face_attendance.py
```

---

## 👤 Akun Default

| Username | Password  | Role  | Keterangan         |
|----------|-----------|-------|--------------------|
| `admin`  | `admin123`| Admin | Akses penuh portal |

> ⚠️ **Segera ganti password admin** setelah pertama login melalui menu **Kelola Pengguna**.

---

## ☁️ Integrasi Google Sheets (Opsional)

1. Buat spreadsheet baru di **Google Sheets** dengan kolom: `Nama`, `Hari`, `Tanggal`, `Bulan`, `Tahun`, `Waktu`.
2. Klik **Ekstensi → Apps Script**, tempel kode berikut:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([data.nama, data.hari, data.tanggal, data.bulan, data.tahun, data.waktu]);
    return ContentService.createTextOutput("Sukses").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Gagal: " + error.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
```

3. **Deploy → New Deployment** sebagai **Web App** (akses: *Anyone*).
4. Salin URL lalu masukkan ke variabel `GOOGLE_SHEETS_WEBHOOK_URL` di `face_attendance.py`.

---

## 🛠️ Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Vanilla CSS |
| **Backend** | Python 3.10+, Flask, Flask-CORS |
| **Face Detection** | OpenCV + YuNet (`.onnx`) |
| **Face Recognition** | OpenCV + SFace (`.onnx`) |
| **Data Storage** | Excel lokal (`.xlsx`) via Pandas & Openpyxl |
| **Cloud Sync** | Google Apps Script Webhook |
| **Export** | SheetJS (xlsx) |

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi untuk keperluan pendidikan.
