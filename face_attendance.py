import cv2
import os
import numpy as np
import pandas as pd
import time
import math
import pickle
import urllib.request
import requests
from datetime import datetime

# URL Model Deep Learning YuNet & SFace
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
YUNET_PATH = "face_detection_yunet_2023mar.onnx"
SFACE_PATH = "face_recognition_sface_2021dec.onnx"

def download_models():
    for url, path_file in [(YUNET_URL, YUNET_PATH), (SFACE_URL, SFACE_PATH)]:
        if not os.path.exists(path_file):
            print(f"Mengunduh {path_file}...")
            urllib.request.urlretrieve(url, path_file)
            print(f"{path_file} berhasil diunduh.")

download_models()

# Inisialisasi Detektor YuNet & Pengenal SFace
detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 240))
recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")

# File Penyimpanan Absensi Lokal
EXCEL_FILE = "attendance.xlsx"
GOOGLE_SHEETS_WEBHOOK_URL = ""
METADATA_FILE = "students_metadata.json"

# --- UTILS METADATA ---
def load_metadata():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_metadata(metadata):
    with open(METADATA_FILE, 'w') as f:
        import json
        json.dump(metadata, f, indent=4)

def log_attendance(name):
    metadata = load_metadata()
    student_info = metadata.get(name, {})
    kelas = student_info.get("class_name", "-")
    no_absen = student_info.get("absent_no", "-")
    
    now = datetime.now()
    hari_ini = now.strftime("%A")
    tanggal = now.strftime("%d")
    bulan = now.strftime("%B")
    tahun = now.strftime("%Y")
    waktu = now.strftime("%H:%M:%S")
    
    data_absen = {
        "Nama": [name],
        "Kelas": [kelas],
        "No Absen": [no_absen],
        "Hari": [hari_ini],
        "Tanggal": [tanggal],
        "Bulan": [bulan],
        "Tahun": [tahun],
        "Waktu Absen": [waktu],
        "Status": ["Hadir"]
    }
    df_new = pd.DataFrame(data_absen)
    
    sudah_absen_hari_ini = False
    
    try:
        if os.path.exists(EXCEL_FILE):
            df_existing = pd.read_excel(EXCEL_FILE)
            df_existing = df_existing.loc[:, ~df_existing.columns.str.contains('^Unnamed')]
            
            if df_existing.empty or "Nama" not in df_existing.columns:
                df_new.to_excel(EXCEL_FILE, index=False)
            else:
                sudah_absen = df_existing[
                    (df_existing["Nama"] == name) & 
                    (pd.to_numeric(df_existing["Tanggal"], errors='coerce') == int(tanggal)) & 
                    (df_existing["Bulan"] == bulan) & 
                    (pd.to_numeric(df_existing["Tahun"], errors='coerce') == int(tahun))
                ]
                if not sudah_absen.empty:
                    sudah_absen_hari_ini = True
                else:
                    if "Status" not in df_existing.columns:
                        df_existing["Status"] = "Hadir"
                    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                    df_combined.to_excel(EXCEL_FILE, index=False)
        else:
            df_new.to_excel(EXCEL_FILE, index=False)
            
    except Exception as e:
        print(f"Gagal mencatat absensi ke Excel: {e}")
        return False
        
    if GOOGLE_SHEETS_WEBHOOK_URL and not sudah_absen_hari_ini:
        payload = {
            "nama": name, "kelas": kelas, "no_absen": no_absen,
            "hari": hari_ini, "tanggal": tanggal, 
            "bulan": bulan, "tahun": tahun, "waktu": waktu, "status": "Hadir"
        }
        try:
            requests.post(GOOGLE_SHEETS_WEBHOOK_URL, json=payload, timeout=5)
        except Exception:
            pass
            
    return sudah_absen_hari_ini

# Fitur Registrasi Siswa Baru
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
    
    # Simpan metadata
    metadata = load_metadata()
    metadata[name] = {
        "name": name,
        "class_name": class_name,
        "absent_no": absent_no
    }
    save_metadata(metadata)
    
    print("\nKamera akan terbuka. Harap melihat ke kamera dengan berbagai ekspresi/sudut.")
    print("Mengambil 30 foto wajah otomatis...")
    
    cap = cv2.VideoCapture(0)
    count = 0
    
    while cap.isOpened() and count < 30:
        success, frame = cap.read()
        if not success:
            break
            
        h, w = frame.shape[:2]
        detector.setInputSize((w, h))
        retval, faces = detector.detect(frame)
        
        if faces is not None:
            for face in faces:
                count += 1
                aligned_face = recognizer.alignCrop(frame, face)
                img_path = os.path.join(student_dir, f"{count}.jpg")
                cv2.imwrite(img_path, aligned_face)
                
                box = face[0:4].astype(int)
                cv2.rectangle(frame, (box[0], box[1]), (box[0]+box[2], box[1]+box[3]), (255, 0, 0), 2)
                cv2.putText(frame, f"Foto: {count}/30", (box[0], box[1] - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                
        cv2.imshow("Registrasi Wajah Siswa - Harap Tunggu", frame)
        if cv2.waitKey(200) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    
    if count >= 30:
        print(f"Registrasi Sukses! 30 foto wajah disimpan di folder: {student_dir}")
        print("PENTING: Silakan pilih Menu [2] untuk melatih model setelah registrasi.")
    else:
        print("Registrasi dibatalkan atau tidak lengkap.")

# Fitur Pelatihan (Training) Pengenal Wajah
def train_classifier():
    dataset_dir = "dataset"
    if not os.path.exists(dataset_dir) or len(os.listdir(dataset_dir)) == 0:
        print("Belum ada data siswa terdaftar di folder 'dataset/'. Daftarkan siswa terlebih dahulu di Menu [1].")
        return
        
    embeddings_list = []
    name_list = []
    
    print("Memulai proses training wajah... Harap tunggu...")
    
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
                    img = cv2.imread(img_path)
                    if img is not None:
                        h, w = img.shape[:2]
                        # Jika sudah ter-align 112x112
                        if w == 112 and h == 112:
                            feat = recognizer.feature(img)
                            embeddings_list.append((student_name, feat))
                        else:
                            detector.setInputSize((w, h))
                            retval, faces = detector.detect(img)
                            if faces is not None:
                                aligned_face = recognizer.alignCrop(img, faces[0])
                                feat = recognizer.feature(aligned_face)
                                embeddings_list.append((student_name, feat))
                
    if len(embeddings_list) == 0:
        print("Tidak ada foto wajah yang ditemukan untuk ditraining.")
        return
        
    with open("embeddings.pkl", "wb") as f:
        pickle.dump(embeddings_list, f)
        
    np.save("names.npy", np.array(name_list))
    
    print(f"Training Selesai! Model wajah disimpan sebagai 'embeddings.pkl'")
    print(f"Siswa terdaftar ({len(name_list)}): {', '.join(name_list)}")

# Fitur Deteksi Wajah dan Absensi Real-Time
def start_attendance():
    if not os.path.exists("embeddings.pkl"):
        print("Error: File model 'embeddings.pkl' tidak ditemukan. Jalankan Menu [2] terlebih dahulu!")
        return
        
    # Load Templates
    templates = {}
    with open("embeddings.pkl", "rb") as f:
        emb_list = pickle.load(f)
        for name, feat in emb_list:
            if name not in templates:
                templates[name] = []
            templates[name].append(feat)
            
    print("Membuka Kamera untuk Absensi...")
    print("Tekan 'q' untuk berhenti.")
    
    cap = cv2.VideoCapture(0)
    attendance_buffer = {}
    landmark_history = []
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
            
        h, w = frame.shape[:2]
        detector.setInputSize((w, h))
        retval, faces = detector.detect(frame)
        
        recognized_any = False
        
        if faces is not None:
            for face in faces:
                x, y, gw, gh = face[0:4].astype(int)
                
                # Pasif Liveness Detection
                x_c = max(0, x)
                y_c = max(0, y)
                w_c = min(w - x_c, gw)
                h_c = min(h - y_c, gh)
                face_crop = frame[y_c:y_c+h_c, x_c:x_c+w_c]
                
                laplacian_var = 0.0
                if face_crop.size > 0:
                    gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
                    laplacian_var = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
                    
                landmark_history.append(face[4:14].copy())
                if len(landmark_history) > 10:
                    landmark_history.pop(0)
                    
                mean_var = 0.0
                if len(landmark_history) >= 5:
                    arr = np.array(landmark_history)
                    coord_vars = np.var(arr, axis=0)
                    mean_var = np.mean(coord_vars)
                    
                is_live = (laplacian_var >= 50.0) and (mean_var >= 0.03)
                
                # Match
                aligned_face = recognizer.alignCrop(frame, face)
                query_feat = recognizer.feature(aligned_face)
                
                best_match = None
                max_score = -1.0
                
                for name, feat_list in templates.items():
                    for feat in feat_list:
                        score = recognizer.match(query_feat, feat, cv2.FaceRecognizerSF_FR_COSINE)
                        if score > max_score:
                            max_score = score
                            best_match = name
                            
                if max_score > 0.363:
                    student_name = best_match
                    match_percentage = int(max_score * 100)
                    
                    if is_live:
                        display_text = f"{student_name} ({match_percentage}%) [LIVE]"
                        box_color = (0, 255, 0)
                        
                        attendance_buffer[student_name] = attendance_buffer.get(student_name, 0) + 1
                        if attendance_buffer[student_name] >= 8:
                            is_duplicate = log_attendance(student_name)
                            status_text = "Sudah Absen Hari Ini" if is_duplicate else "ABSEN BERHASIL!"
                            text_color = (255, 191, 0) if is_duplicate else (0, 255, 0)
                            
                            # Render output sebelum menutup
                            cv2.rectangle(frame, (x, y), (x+gw, y+gh), box_color, 2)
                            cv2.putText(frame, display_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                            cv2.putText(frame, status_text, (x, y + gh + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                            cv2.imshow("Sistem Absensi Kamera - Scan Wajah Siswa", frame)
                            cv2.waitKey(1500)
                            break
                        else:
                            status_text = f"Memverifikasi... ({attendance_buffer[student_name]}/8)"
                            text_color = (0, 255, 255)
                    else:
                        display_text = f"{student_name} ({match_percentage}%) [SPOOF]"
                        box_color = (0, 165, 255)
                        status_text = "Harap Berkedip/Gerakkan Kepala"
                        text_color = (0, 165, 255)
                else:
                    display_text = "Unknown"
                    status_text = "Wajah Tidak Dikenal"
                    box_color = (0, 0, 255)
                    text_color = (0, 0, 255)
                
                cv2.rectangle(frame, (x, y), (x+gw, y+gh), box_color, 2)
                cv2.putText(frame, display_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                cv2.putText(frame, status_text, (x, y + gh + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                recognized_any = True
                
        if not recognized_any:
            landmark_history.clear()
            attendance_buffer.clear()
            
        cv2.imshow("Sistem Absensi Kamera - Scan Wajah Siswa", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    print("Selesai. Kamera absensi ditutup.")

# Menu Utama
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
