# Sessiof 🎓🔍

Sistem Absensi Sekolah berbasis deteksi wajah secara *real-time* menggunakan kamera (Webcam) laptop. Sistem ini mendeteksi wajah menggunakan algoritma **Haar Cascades** dan mengenali identitas wajah siswa secara akurat menggunakan model **LBPH (Local Binary Patterns Histograms)** dari OpenCV. 

Setiap kali siswa berhasil teridentifikasi oleh kamera, data kehadiran akan otomatis tercatat ke **Excel lokal (`attendance.xlsx`)** dan terintegrasi langsung dengan **Google Sheets (Online)** serta **Dashboard Web Next.js** secara real-time.

---

## 🌟 Fitur Utama

1. **Registrasi Wajah Baru:** Mengambil 30 foto sampel wajah siswa dari berbagai ekspresi dan sudut secara otomatis.
2. **Pelatihan Otomatis (Machine Learning Training):** Melatih model pengenal wajah secara cepat menggunakan metode LBPH dan menyimpan file model dalam format `.yml`.
3. **Deteksi & Absensi Real-Time:** Mengenali wajah siswa di kamera dan mendeteksi jika siswa sudah absen hari ini (*anti-duplicate log*).
4. **Dashboard Portal Admin Web (Next.js):**
   * **Dashboard Statistik:** Menampilkan total siswa, jumlah hadir hari ini, rasio persentase kehadiran, rasio siswa tepat waktu/terlambat/sakit/izin dengan diagram garis interaktif.
   * **Daftar Kehadiran:** Menampilkan status kehadiran siswa (Hadir, Izin, Sakit, Alpa). Status **Alpa** akan digenerasikan otomatis secara dinamis setiap hari untuk siswa yang belum absen.
   * **CRUD Kalender Akademik:** Mengelola agenda, rapat evaluasi, dan kalender kegiatan sekolah langsung lewat halaman web.
   * **Export Fitur:** Download rekap log absensi harian atau bulanan dalam format CSV dan Spreadsheet (.xlsx) secara instan.
   * **Batas Waktu Hadir/Pulang:** Mengatur ambang batas jam kedatangan untuk menetapkan keterlambatan siswa.
5. **Output Excel Lokal:** Mencatat absensi lengkap dengan kolom: `Nama`, `Hari`, `Tanggal`, `Bulan`, `Tahun`, `Waktu Absen`.
6. **Sinkronisasi Cloud Google Sheets:** Mengirimkan data absen ke Google Sheets menggunakan integrasi Webhook (Google Apps Script).

---

## 📂 Struktur Proyek

```text
├── dataset/                  # Folder foto wajah siswa hasil registrasi (Di-ignore)
├── trainer.yml               # File model wajah hasil training (LBPH) (Di-ignore)
├── names.npy                 # Database nama siswa terdaftar (Di-ignore)
├── attendance.xlsx           # Rekap absensi lokal (Excel) (Di-ignore)
├── face_attendance.py        # Kode utama program Python untuk kamera absensi
├── dashboard.py              # Dashboard alternatif menggunakan Streamlit (Python)
├── server.py                 # Flask Server penghubung Python dengan Portal Admin
├── dashboard-web/            # Dashboard portal admin utama menggunakan Next.js (React)
└── README.md                 # Dokumentasi proyek
```

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Kloning Repositori
```bash
git clone https://github.com/davinmaritza/sessiof.git
cd sessiof
```

### 2. Jalankan Lingkungan Virtual & Instal Dependensi Python
```bash
# Aktifkan virtual environment
.venv\Scripts\activate # Di CMD/PowerShell Windows
# atau
source .venv/Scripts/activate # Di Git Bash/Linux/macOS

# Instal pustaka Python yang dibutuhkan
pip install opencv-contrib-python pandas openpyxl requests numpy streamlit flask flask-cors
```

### 3. Jalankan Web Dashboard Next.js (Portal Admin)
Buka terminal baru di folder `dashboard-web` lalu jalankan:
```bash
cd dashboard-web
npm install
npm run dev
```
Akses dashboard di browser Anda pada alamat **http://localhost:3000** (Data absensi tersinkronisasi secara real-time dari file Excel di atasnya!).

### 4. Jalankan Server Flask & Kamera Absensi
Aplikasi dashboard akan terhubung ke Server Python untuk mengaktifkan kamera. Jalankan Flask Server di folder root proyek:
```bash
python server.py
```

### 5. Jalankan Kamera Absensi Manual (Terminal Python)
Jika ingin menjalankan program kamera absensi mandiri tanpa web browser:
```bash
python face_attendance.py
```

---

## ☁️ Cara Integrasi dengan Google Sheets (Online)

Untuk menghubungkan absensi kamera langsung ke Google Sheets Anda secara online, ikuti langkah mudah berikut:

1. Buat spreadsheet baru di **Google Sheets**.
2. Berikan judul kolom di baris pertama: **A1:** `Nama`, **B1:** `Hari`, **C1:** `Tanggal`, **D1:** `Bulan`, **E1:** `Tahun`, **F1:** `Waktu`.
3. Klik menu **Ekstensi** > **Apps Script**.
4. Hapus semua kode bawaan, lalu tempel kode JavaScript di bawah ini:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Tambahkan data ke baris paling bawah di Google Sheets
    sheet.appendRow([
      data.nama,
      data.hari,
      data.tanggal,
      data.bulan,
      data.tahun,
      data.waktu
    ]);
    
    return ContentService.createTextOutput("Sukses").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Gagal: " + error.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
```
5. Klik tombol **Terapkan** (Deploy) > **Penerapan Baru** (New Deployment).
6. Pilih Jenis Penerapan: **Aplikasi Web** (Web App).
7. Konfigurasi:
   * **Deskripsi:** Absensi Deteksi Wajah
   * **Jalankan sebagai:** Saya (Email Anda)
   * **Yang memiliki akses:** Siapa saja (Anyone) -> *Penting agar Python bisa mengirim data.*
8. Klik **Terapkan**, lalu salin **URL Aplikasi Web** yang diberikan.
9. Buka file `face_attendance.py`, temukan variabel `GOOGLE_SHEETS_WEBHOOK_URL` di bagian atas, dan masukkan URL yang disalin di sana:
   ```python
   GOOGLE_SHEETS_WEBHOOK_URL = "URL_GOOGLE_APPS_SCRIPT_ANDA"
   ```

---

## 🛠️ Teknologi yang Digunakan
* **Next.js 16** (React 19, Tailwind CSS, TypeScript)
* **Python 3.12+**
* **OpenCV** (Deteksi wajah dengan Haar Cascade & Pengenalan wajah dengan LBPH Recognizer)
* **Flask** (Backend API untuk integrasi kontrol kamera dengan Web Dashboard)
* **Pandas & Openpyxl** (Manajemen database Excel lokal)
* **Requests** (Komunikasi HTTP Webhook ke Cloud Google Sheets)
* **Google Apps Script** (Sebagai backend API Google Sheets)
