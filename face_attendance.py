import cv2
import os
import numpy as np
import pandas as pd
import time
import urllib.request
import requests
from datetime import datetime
from openpyxl import load_workbook

# 1. Unduh Haar Cascade XML untuk deteksi wajah jika belum ada
CASCADE_URL = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
CASCADE_PATH = "haarcascade_frontalface_default.xml"

if not os.path.exists(CASCADE_PATH):
    print("Mengunduh Haar Cascade XML dari OpenCV repository...")
    urllib.request.urlretrieve(CASCADE_URL, CASCADE_PATH)
    print("Haar Cascade berhasil diunduh.")

# Inisialisasi Detektor Wajah OpenCV
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

# File Penyimpanan Absensi Lokal
EXCEL_FILE = "attendance.xlsx"

# URL Webhook Google Sheets (Masukkan URL Web App dari Google Apps Script Anda di sini)
# Contoh: "https://script.google.com/macros/s/xxxx/exec"
GOOGLE_SHEETS_WEBHOOK_URL = ""

# 2. Fungsi untuk Merekam Absensi ke Excel & Google Sheets
def log_attendance(name):
    # Dapatkan waktu saat ini
    now = datetime.now()
    hari_ini = now.strftime("%A")  # Nama Hari
    tanggal = now.strftime("%d")   # Tanggal
    bulan = now.strftime("%B")     # Bulan
    tahun = now.strftime("%Y")     # Tahun
    waktu = now.strftime("%H:%M:%S") # Jam:Menit:Detik
    
    # Format baris data
    data_absen = {
        "Nama": [name],
        "Hari": [hari_ini],
        "Tanggal": [tanggal],
        "Bulan": [bulan],
        "Tahun": [tahun],
        "Waktu Absen": [waktu]
    }
    df_new = pd.DataFrame(data_absen)
    
    # A. CATAT KE EXCEL LOKAL (.xlsx)
    sudah_absen_hari_ini = False
    
    if os.path.exists(EXCEL_FILE):
        df_existing = pd.read_excel(EXCEL_FILE)
        
        # Cek apakah siswa sudah absen hari ini (mencegah absen ganda di hari yang sama)
        sudah_absen = df_existing[
            (df_existing["Nama"] == name) & 
            (df_existing["Tanggal"].astype(str) == str(tanggal)) & 
            (df_existing["Bulan"] == bulan) & 
            (df_existing["Tahun"].astype(str) == str(tahun))
        ]
        
        if not sudah_absen.empty:
            sudah_absen_hari_ini = True
        else:
            # Gunakan openpyxl untuk append data baru tanpa menimpa format
            with pd.ExcelWriter(EXCEL_FILE, mode='a', engine='openpyxl', if_sheet_exists='overlay') as writer:
                df_new.to_excel(writer, index=False, header=False, startrow=len(df_existing) + 1)
    else:
        # Jika file belum ada, buat file Excel baru
        df_new.to_excel(EXCEL_FILE, index=False)
        
    # B. KIRIM KE GOOGLE SHEETS VIA WEBHOOK (Jika URL diisi)
    if GOOGLE_SHEETS_WEBHOOK_URL and not sudah_absen_hari_ini:
        payload = {
            "nama": name,
            "hari": hari_ini,
            "tanggal": tanggal,
            "bulan": bulan,
            "tahun": tahun,
            "waktu": waktu
        }
        try:
            # Mengirim data secara asinkron/POST request
            response = requests.post(GOOGLE_SHEETS_WEBHOOK_URL, json=payload)
            if response.status_code == 200:
                print(f"-> Berhasil sinkronisasi Google Sheets untuk {name}")
            else:
                print(f"-> Gagal kirim ke Google Sheets. Status code: {response.status_code}")
        except Exception as e:
            print(f"-> Gagal menghubungi Google Sheets Webhook: {e}")
            
    return sudah_absen_hari_ini

# 3. Fitur Registrasi Siswa Baru
def register_student():
    name = input("Masukkan Nama Siswa: ").strip()
    if not name:
        print("Nama tidak boleh kosong!")
        return
    class_name = input("Masukkan Kelas: ").strip()
    if not class_name:
        print("Kelas tidak boleh kosong!")
        return
    absent_no = input("Masukkan Nomor Absen: ").strip()
    if not absent_no:
        print("Nomor Absen tidak boleh kosong!")
        return
        
    safe_class = class_name.replace("/", "-").replace("\\", "-")
    safe_name = name.replace("/", "-").replace("\\", "-")
    student_dir = os.path.join("dataset", safe_class, f"{absent_no} - {safe_name}")
    os.makedirs(student_dir, exist_ok=True)
    
    print("\nKamera akan terbuka. Harap melihat ke kamera dengan berbagai ekspresi/sudut.")
    print("Mengambil 30 foto wajah otomatis...")
    
    cap = cv2.VideoCapture(0)
    count = 0
    
    while cap.isOpened() and count < 30:
        success, frame = cap.read()
        if not success:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        for (x, y, w, h) in faces:
            count += 1
            # Crop bagian wajah
            face_img = gray[y:y+h, x:x+w]
            # Resize wajah ke ukuran standar agar hasil training optimal
            face_img = cv2.resize(face_img, (200, 200))
            
            # Simpan file gambar
            img_path = os.path.join(student_dir, f"{count}.jpg")
            cv2.imwrite(img_path, face_img)
            
            # Gambar kotak penanda di layar
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(frame, f"Foto: {count}/30", (x, y - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
            
        cv2.imshow("Registrasi Wajah Siswa - Harap Tunggu", frame)
        
        # Jeda sedikit agar variasi gambar bagus
        if cv2.waitKey(200) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    
    if count >= 30:
        print(f"Registrasi Sukses! 30 foto wajah disimpan di folder: {student_dir}")
        print("PENTING: Silakan pilih Menu [2] untuk melatih model setelah registrasi.")
    else:
        print("Registrasi dibatalkan atau tidak lengkap.")

# 4. Fitur Pelatihan (Training) Pengenal Wajah
def train_classifier():
    dataset_dir = "dataset"
    if not os.path.exists(dataset_dir) or len(os.listdir(dataset_dir)) == 0:
        print("Belum ada data siswa terdaftar di folder 'dataset/'. Daftarkan siswa terlebih dahulu di Menu [1].")
        return
        
    faces = []
    ids = []
    name_list = []
    id_counter = 0
    
    # Baca folder dataset secara terstruktur
    classes = [c for c in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, c))]
    for cls in classes:
        class_path = os.path.join(dataset_dir, cls)
        student_folders = [s for s in os.listdir(class_path) if os.path.isdir(os.path.join(class_path, s))]
        
        for folder in student_folders:
            parts = folder.split(" - ", 1)
            if len(parts) == 2:
                _, student_name = parts
                folder_path = os.path.join(class_path, folder)
                photos = [f for f in os.listdir(folder_path) if f.endswith(".jpg")]
                
                if len(photos) == 0:
                    continue
                    
                name_list.append(student_name)
                
                for img_name in photos:
                    img_path = os.path.join(folder_path, img_name)
                    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                    if img is not None:
                        faces.append(img)
                        ids.append(id_counter)
                
                id_counter += 1
                
    if len(faces) == 0:
        print("Tidak ada foto wajah yang ditemukan untuk ditraining.")
        return
        
    print("Memulai proses training wajah... Harap tunggu...")
    # Gunakan LBPH Face Recognizer
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(ids))
    
    # Simpan file trainer
    recognizer.write("trainer.yml")
    
    # Simpan daftar nama siswa agar indeks id_num sinkron saat pengenalan
    np.save("names.npy", np.array(name_list))
    
    print(f"Training Selesai! Model wajah disimpan sebagai 'trainer.yml'")
    print(f"Siswa terdaftar ({len(name_list)}): {', '.join(name_list)}")

# 5. Fitur Deteksi Wajah dan Absensi Real-Time
def start_attendance():
    if not os.path.exists("trainer.yml") or not os.path.exists("names.npy"):
        print("Error: File model 'trainer.yml' tidak ditemukan. Jalankan Menu [2] terlebih dahulu!")
        return
        
    # Load Model dan Daftar Nama
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read("trainer.yml")
    names = np.load("names.npy")
    
    print("Membuka Kamera untuk Absensi...")
    print("Tekan 'q' untuk berhenti.")
    
    cap = cv2.VideoCapture(0)
    
    # Catatan sementara agar tidak mencetak tulisan "berhasil absen" berkali-kali di terminal
    already_announced = set()
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
            
        # Gunakan grayscale untuk pengenalan wajah
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        for (x, y, w, h) in faces:
            # Deteksi & Prediksi ID wajah
            face_img = gray[y:y+h, x:x+w]
            face_img = cv2.resize(face_img, (200, 200))
            
            label_id, confidence = recognizer.predict(face_img)
            
            # Confidence pada LBPH menunjukkan jarak/error (makin kecil nilainya, makin mirip wajahnya)
            # Nilai confidence < 80 biasanya dianggap cukup akurat
            if confidence < 75:
                student_name = names[label_id]
                match_percentage = int(100 - confidence)
                display_text = f"{student_name} ({match_percentage}%)"
                box_color = (0, 255, 0) # Hijau untuk dikenal
                
                # Proses absensi ke Excel & Google Sheets
                is_duplicate = log_attendance(student_name)
                
                if is_duplicate:
                    status_text = "Sudah Absen Hari Ini"
                    text_color = (255, 191, 0) # Biru langit / Cyan muda
                else:
                    status_text = "ABSEN BERHASIL!"
                    text_color = (0, 255, 0) # Hijau
                    if student_name not in already_announced:
                        print(f"Absen Berhasil: {student_name} pada {datetime.now().strftime('%H:%M:%S')}")
                        already_announced.add(student_name)
            else:
                display_text = "Unknown"
                status_text = "Wajah Tidak Dikenal"
                box_color = (0, 0, 255) # Merah
                text_color = (0, 0, 255)
            
            # Gambar kotak wajah
            cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
            # Tampilkan Nama Siswa
            cv2.putText(frame, display_text, (x, y - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
            # Tampilkan Status Kehadiran di bawah kotak wajah
            cv2.putText(frame, status_text, (x, y + h + 25), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                        
        cv2.imshow("Sistem Absensi Kamera - Scan Wajah Siswa", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    print("Selesai. Kamera absensi ditutup.")

# 6. Menu Utama
def main():
    while True:
        print("\n" + "="*45)
        print(" SISTEM ABSENSI SCAN WAJAH SISWA (Excel / Sheets)")
        print("="*45)
        print("[1] Daftar Siswa Baru (Ambil Foto)")
        print("[2] Train Model Wajah (Trainer)")
        print("[3] Mulai Kamera Absensi")
        print("[4] Keluar")
        print("="*45)
        
        pilihan = input("Pilih Menu (1-4): ").strip()
        
        if pilihan == "1":
            register_student()
        elif pilihan == "2":
            train_classifier()
        elif pilihan == "3":
            start_attendance()
        elif pilihan == "4":
            print("Keluar dari program. Terima kasih!")
            break
        else:
            print("Pilihan menu tidak valid. Coba lagi.")

if __name__ == "__main__":
    main()
