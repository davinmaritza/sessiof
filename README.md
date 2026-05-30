# Face Recognition Attendance System 🎓🔍

Sistem Absensi Sekolah/Kantor berbasis deteksi wajah secara *real-time* menggunakan kamera (Webcam) laptop. Sistem ini mendeteksi wajah menggunakan algoritma **Haar Cascades** dan mengenali identitas wajah siswa menggunakan model **LBPH (Local Binary Patterns Histograms)** dari OpenCV. 

Setiap kali siswa berhasil teridentifikasi oleh kamera, data kehadiran akan otomatis tercatat ke **Excel lokal (`.xlsx`)** dan terintegrasi langsung dengan **Google Sheets (Online)** secara real-time.

---

## 🌟 Fitur Utama
1. **Registrasi Wajah Baru:** Mengambil 30 foto sampel wajah siswa dari berbagai ekspresi dan sudut secara otomatis.
2. **Pelatihan Otomatis (Machine Learning Training):** Melatih model pengenal wajah secara cepat menggunakan metode LBPH dan menyimpan file otak model dalam bentuk file `.yml`.
3. **Deteksi & Absensi Real-Time:** Mengenali wajah siswa di kamera, mendeteksi jika siswa sudah absen hari ini agar tidak ada data ganda (*anti-duplicate*).
4. **Output Excel Lokal:** Mencatat absensi lengkap dengan kolom: `Nama`, `Hari`, `Tanggal`, `Bulan`, `Tahun`, `Waktu Absen`.
5. **Sinkronisasi Cloud Google Sheets:** Mengirimkan data absen ke Google Sheets menggunakan integrasi Webhook (Google Apps Script).

---

## 📂 Struktur Folder
```text
├── dataset/                  # Folder foto wajah siswa hasil registrasi
├── trainer.yml               # File model wajah hasil training (LBPH)
├── names.npy                 # Database nama siswa terdaftar
├── attendance.xlsx           # Rekap absensi lokal (Excel)
├── face_attendance.py        # Kode utama program Python
├── dashboard.py              # Dashboard alternatif menggunakan Streamlit (Python)
├── dashboard-web/            # Dashboard utama menggunakan Next.js (React/Tailwind)
└── README.md                 # Dokumentasi proyek
```

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Kloning Repositori
```bash
git clone https://github.com/USERNAME-ANDA/NAMA-REPOSITORI.git
cd NAMA-REPOSITORI
```

### 2. Jalankan Lingkungan Virtual & Instal Dependensi Python
```bash
# Aktifkan virtual environment (jika ada)
source .venv/Scripts/activate # Di Git Bash/Linux
# atau
.venv\Scripts\activate # Di CMD/PowerShell

# Instal pustaka yang dibutuhkan
pip install opencv-contrib-python pandas openpyxl requests numpy streamlit
```

### 3. Jalankan Program Python (Absensi Wajah)
```bash
python face_attendance.py
```

### 4. Jalankan Web Dashboard Next.js
Buka terminal baru di folder `dashboard-web` lalu jalankan:
```bash
cd dashboard-web
npm install
npm run dev
```
Akses dashboard di browser Anda pada alamat **http://localhost:3000** (Data absensi tersinkronisasi secara real-time dari file Excel di atasnya!).

### 5. Jalankan Web Dashboard Streamlit (Alternatif)
Jika ingin menggunakan dashboard berbasis Python/Streamlit:
```bash
streamlit run dashboard.py
```
Akses di browser Anda pada alamat **http://localhost:8501**.

---

## ☁️ Cara Integrasi dengan Google Sheets (Online)

Untuk menghubungkan absensi kamera langsung ke Google Sheets Anda secara online, ikuti langkah mudah berikut:

1. Buat spreadsheet baru di **Google Sheets**.
2. Berikan judul kolom di baris pertama: **A1:** `Nama`, **B1:** `Hari`, **C1:** `Tanggal`, **D1:** `Bulan`, **E1:** `Tahun`, **F1:** `Waktu`.
3. Klik menu **Ekstensi** > **Apps Script**.
4. Hapus semua kode bawaan, lalu paste kode JavaScript di bawah ini:

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
* **Python 3.12+**
* **OpenCV** (Deteksi wajah dengan Haar Cascade & Pengenalan wajah dengan LBPH Recognizer)
* **Pandas & Openpyxl** (Manajemen database Excel lokal)
* **Requests** (Komunikasi HTTP Webhook ke Cloud Google Sheets)
* **Google Apps Script** (Sebagai backend API Google Sheets)
