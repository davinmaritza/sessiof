import cv2
import os
import shutil
import numpy as np
import pandas as pd
import urllib.request
import requests
import json
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Haar Cascade XML Detektor Wajah
CASCADE_PATH = "haarcascade_frontalface_default.xml"
EXCEL_FILE = "attendance.xlsx"
GOOGLE_SHEETS_WEBHOOK_URL = ""
METADATA_FILE = "students_metadata.json"
DATASET_DIR = "dataset"

face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

# Status Kamera
camera_running = False
camera_thread = None
stop_camera_event = threading.Event()

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
        json.dump(metadata, f, indent=4)

# Fungsi untuk mendapatkan path folder siswa berdasarkan data metadata
def get_student_dir(class_name, absent_no, name):
    # Struktur: dataset/<kelas>/<no_absen> - <nama>
    # Bersihkan nama folder agar aman dari karakter aneh
    safe_class = class_name.replace("/", "-").replace("\\", "-")
    safe_name = name.replace("/", "-").replace("\\", "-")
    return os.path.join(DATASET_DIR, safe_class, f"{absent_no} - {safe_name}")

# --- PEREKAMAN ABSENSI KE EXCEL ---
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
            
            # Clean up corrupted Unnamed columns that might cause shifting
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
        print(f"Gagal mencatat absensi ke Excel (Pastikan file tidak sedang dibuka): {e}")
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

def attendance_loop():
    global camera_running
    try:
        if not os.path.exists("trainer.yml") or not os.path.exists("names.npy"):
            return
            
        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.read("trainer.yml")
        names = np.load("names.npy")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("ERROR: cv2.VideoCapture(0) gagal membuka kamera!")
            camera_running = False
            return
            
        print("SUCCESS: Kamera berhasil dibuka.")
        window_name = "Kamera Absensi Wajah - Tekan 'q' untuk keluar"
        
        # Buffer untuk mencegah absensi salah sasaran akibat kedipan (flicker)
        attendance_buffer = {}
        frame_counter = 0
        
        while not stop_camera_event.is_set():
            success, frame = cap.read()
            if not success or frame is None:
                break
                
            frame_counter += 1
            if frame_counter % 30 == 0:
                attendance_buffer.clear() # Reset buffer setiap ~1 detik agar tidak menumpuk
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
            
            for (x, y, w, h) in faces:
                face_img = gray[y:y+h, x:x+w]
                face_img = cv2.resize(face_img, (200, 200))
                
                label_id, confidence = recognizer.predict(face_img)
                
                if confidence < 65: # Threshold lebih ketat agar tidak salah orang
                    student_name = names[label_id]
                    match_percentage = int(100 - confidence)
                    display_text = f"{student_name} ({match_percentage}%)"
                    
                    # Tambah hitungan frame untuk orang ini
                    attendance_buffer[student_name] = attendance_buffer.get(student_name, 0) + 1
                    
                    # Butuh 10 frame yang konsisten berturut-turut untuk menganggapnya valid!
                    if attendance_buffer[student_name] >= 10:
                        box_color = (0, 255, 0)
                        is_duplicate = log_attendance(student_name)
                        status_text = "Sudah Absen Hari Ini" if is_duplicate else "ABSEN BERHASIL!"
                        text_color = (255, 191, 0) if is_duplicate else (0, 255, 0)
                        
                        # Render satu frame ekstra agar pesan sukses terlihat, lalu tutup
                        cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
                        cv2.putText(frame, display_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                        cv2.putText(frame, status_text, (x, y + h + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                        cv2.imshow(window_name, frame)
                        cv2.waitKey(1500)
                        stop_camera_event.set()
                        break
                    else:
                        box_color = (0, 255, 255)
                        status_text = f"Memverifikasi... ({attendance_buffer[student_name]}/10)"
                        text_color = (0, 255, 255)
                        status_text = f"Memverifikasi... ({attendance_buffer[student_name]}/10)"
                        text_color = (0, 255, 255)
                elif confidence < 85: # Mirip tapi belum yakin
                    student_name = names[label_id]
                    match_percentage = int(100 - confidence)
                    display_text = f"Mirip: {student_name}?"
                    status_text = f"Kemiripan: {match_percentage}% (Tolong Diam/Lepas Masker)"
                    box_color = (0, 165, 255) # Orange color in BGR
                    text_color = (0, 165, 255)
                else:
                    display_text = "Unknown"
                    status_text = "Wajah Tidak Dikenal"
                    box_color = (0, 0, 255)
                    text_color = (0, 0, 255)
                    
                cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
                cv2.putText(frame, display_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                cv2.putText(frame, status_text, (x, y + h + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                
            cv2.imshow(window_name, frame)
            
            # Allow user to close by clicking 'X' on window
            if cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) < 1:
                break
                
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
        cap.release()
        cv2.destroyAllWindows()
    except Exception as e:
        print(f"Error pada thread kamera: {e}")
    finally:
        camera_running = False

# --- API ENDPOINTS ---

# 1. Status Server & Siswa Terdaftar (Scanning dataset berstruktur)
@app.route('/api/status', methods=['GET'])
def get_status():
    metadata = load_metadata()
    student_list = []
    
    # Scan folder dataset secara rekursif: dataset/<kelas>/<no_absen> - <nama>
    if os.path.exists(DATASET_DIR):
        classes = [c for c in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, c))]
        for cls in classes:
            class_path = os.path.join(DATASET_DIR, cls)
            students_folders = [s for s in os.listdir(class_path) if os.path.isdir(os.path.join(class_path, s))]
            for folder in students_folders:
                # Mengurai nama folder, format: "<no_absen> - <nama>"
                parts = folder.split(" - ", 1)
                if len(parts) == 2:
                    absent_no, student_name = parts
                    info = metadata.get(student_name, {})
                    
                    # Hitung jumlah foto wajah tersimpan
                    folder_path = os.path.join(class_path, folder)
                    photos = [f for f in os.listdir(folder_path) if f.endswith(".jpg")]
                    
                    student_list.append({
                        "name": student_name,
                        "class_name": info.get("class_name", cls),
                        "absent_no": info.get("absent_no", absent_no),
                        "photo_count": len(photos)
                    })
            
    return jsonify({
        "camera_running": camera_running,
        "total_students": len(student_list),
        "students": student_list,
        "model_exists": os.path.exists("trainer.yml")
    })

# 2. CRUD: Tambah  Siswa Baru (Buat Folder Struktur Baru)
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    name = data.get("name", "").strip()
    class_name = data.get("class_name", "").strip()
    absent_no = data.get("absent_no", "").strip()
    
    if not name or not class_name or not absent_no:
        return jsonify({"error": "Data nama, kelas, dan nomor absen harus lengkap!"}), 400
        
    student_dir = get_student_dir(class_name, absent_no, name)
    if os.path.exists(student_dir):
        return jsonify({"error": "Siswa sudah terdaftar di folder tersebut!"}), 400
        
    os.makedirs(student_dir, exist_ok=True)
    
    # Simpan metadata
    metadata = load_metadata()
    metadata[name] = {
        "name": name,
        "class_name": class_name,
        "absent_no": absent_no
    }
    save_metadata(metadata)
    
    return jsonify({"message": f"Siswa '{name}' ({class_name}) berhasil didaftarkan."})

# 3. CRUD: Edit Profil Siswa (Rename Folder Struktur Baru)
@app.route('/api/students/<name>', methods=['PUT'])
def edit_student(name):
    data = request.json
    new_name = data.get("new_name", "").strip()
    class_name = data.get("class_name", "").strip()
    absent_no = data.get("absent_no", "").strip()
    
    if not new_name or not class_name or not absent_no:
        return jsonify({"error": "Data nama, kelas, dan nomor absen tidak boleh kosong!"}), 400
        
    metadata = load_metadata()
    old_info = metadata.get(name, {})
    old_class = old_info.get("class_name", class_name)
    old_absent_no = old_info.get("absent_no", absent_no)
    
    old_dir = get_student_dir(old_class, old_absent_no, name)
    new_dir = get_student_dir(class_name, absent_no, new_name)
    
    if not os.path.exists(old_dir):
        return jsonify({"error": f"Folder lama siswa '{name}' tidak ditemukan."}), 404
        
    # Pindahkan folder jika ada perubahan kelas, absen, atau nama
    if old_dir != new_dir:
        if os.path.exists(new_dir):
            return jsonify({"error": "Lokasi/nama siswa baru sudah digunakan"}), 400
        
        # Buat folder kelas baru jika belum ada
        os.makedirs(os.path.dirname(new_dir), exist_ok=True)
        shutil.move(old_dir, new_dir)
        
        # Bersihkan folder kelas lama jika kosong
        old_class_dir = os.path.dirname(old_dir)
        if os.path.exists(old_class_dir) and len(os.listdir(old_class_dir)) == 0:
            os.rmdir(old_class_dir)
        
    # Update metadata
    if name in metadata:
        del metadata[name]
        
    metadata[new_name] = {
        "name": new_name,
        "class_name": class_name,
        "absent_no": absent_no
    }
    save_metadata(metadata)
    
    return jsonify({"message": f"Data profil siswa '{new_name}' berhasil diperbarui."})

# 4. CRUD: Hapus Siswa
@app.route('/api/students/<name>', methods=['DELETE'])
def delete_student(name):
    metadata = load_metadata()
    info = metadata.get(name, {})
    class_name = info.get("class_name")
    absent_no = info.get("absent_no")
    
    if not class_name or not absent_no:
        return jsonify({"error": "Informasi kelas/nomor absen siswa tidak ditemukan di metadata."}), 404
        
    student_dir = get_student_dir(class_name, absent_no, name)
    if not os.path.exists(student_dir):
        return jsonify({"error": "Folder siswa tidak ditemukan."}), 404
        
    shutil.rmtree(student_dir)
    
    # Hapus folder kelas jika kosong setelah siswa dihapus (DINONAKTIFKAN SESUAI REQUEST)
    # class_dir = os.path.dirname(student_dir)
    # if os.path.exists(class_dir) and len(os.listdir(class_dir)) == 0:
    #     os.rmdir(class_dir)
        
    # Hapus dari metadata
    del metadata[name]
    save_metadata(metadata)
        
    return jsonify({"message": f"Siswa '{name}' berhasil dihapus."})

# 5. Registrasi Foto Kamera
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Nama tidak ditemukan"}), 400
        
    metadata = load_metadata()
    info = metadata.get(name, {})
    class_name = info.get("class_name", "-")
    absent_no = info.get("absent_no", "-")
    
    student_dir = get_student_dir(class_name, absent_no, name)
    os.makedirs(student_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Kamera tidak dapat diakses"}), 500
        
    count = 0
    while cap.isOpened() and count < 30:
        success, frame = cap.read()
        if not success:
            break
            
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        for (x, y, w, h) in faces:
            count += 1
            face_img = gray[y:y+h, x:x+w]
            face_img = cv2.resize(face_img, (200, 200))
            cv2.imwrite(os.path.join(student_dir, f"{count}.jpg"), face_img)
            
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(frame, f"Foto: {count}/30", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
            
        cv2.imshow("Registrasi Wajah - Jangan Bergerak", frame)
        if cv2.waitKey(100) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    
    if count >= 30:
        return jsonify({"message": f"Berhasil memotret 30 sampel foto wajah untuk {name}."})
    else:
        return jsonify({"error": "Proses foto dibatalkan"}), 400

# 6. Upload Foto Wajah
@app.route('/api/upload-face', methods=['POST'])
def upload_face():
    name = request.form.get("name", "").strip()
    if not name:
        return jsonify({"error": "Nama siswa harus diisi"}), 400
        
    if 'image' not in request.files:
        return jsonify({"error": "File foto wajah tidak ditemukan"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "File foto kosong"}), 400
        
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({"error": "Format gambar tidak valid"}), 400
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
    
    if len(faces) == 0:
        return jsonify({"error": "Wajah tidak terdeteksi dalam foto! Pastikan wajah terlihat jelas."}), 400
        
    # Dapatkan info direktori terstruktur
    metadata = load_metadata()
    info = metadata.get(name, {})
    class_name = info.get("class_name", "-")
    absent_no = info.get("absent_no", "-")
    
    student_dir = get_student_dir(class_name, absent_no, name)
    os.makedirs(student_dir, exist_ok=True)
    
    existing_files = [f for f in os.listdir(student_dir) if f.endswith(".jpg")]
    next_index = len(existing_files) + 1
    
    (x, y, w, h) = faces[0]
    face_img = gray[y:y+h, x:x+w]
    face_img = cv2.resize(face_img, (200, 200))
    
    save_path = os.path.join(student_dir, f"{next_index}.jpg")
    cv2.imwrite(save_path, face_img)
    
    return jsonify({
        "message": f"Wajah berhasil dipindai! Tersimpan sebagai file ke-{next_index} untuk {name}.",
        "next_index": next_index
    })

# 7. Training Model Wajah (Melalui folder terstruktur dataset/<kelas>/<no_absen> - <nama>)
@app.route('/api/train', methods=['POST'])
def train():
    if not os.path.exists(DATASET_DIR):
        return jsonify({"error": "Folder dataset tidak ditemukan"}), 400
        
    faces = []
    ids = []
    name_list = []
    id_counter = 0
    
    # Scanning terstruktur
    classes = [c for c in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, c))]
    for cls in classes:
        class_path = os.path.join(DATASET_DIR, cls)
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
        return jsonify({"error": "Tidak ada foto wajah siswa terdaftar yang siap ditraining."}), 400
        
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(ids))
    recognizer.write("trainer.yml")
    np.save("names.npy", np.array(name_list))
    
    return jsonify({"message": f"Model berhasil ditraining dengan {len(name_list)} siswa.", "students": name_list})

# --- CLASS MANAGEMENT ---
@app.route('/api/classes', methods=['GET'])
def get_classes():
    classes_set = set()
    if os.path.exists(DATASET_DIR):
        for c in os.listdir(DATASET_DIR):
            if os.path.isdir(os.path.join(DATASET_DIR, c)):
                classes_set.add(c)
    metadata = load_metadata()
    for s in metadata.values():
        if s.get("class_name"):
            classes_set.add(s.get("class_name"))
    
    classes_list = []
    for cls in sorted(classes_set):
        student_count = sum(1 for s in metadata.values() if s.get("class_name") == cls)
        classes_list.append({
            "name": cls,
            "student_count": student_count
        })
    return jsonify(classes_list)

@app.route('/api/classes', methods=['POST'])
def add_class():
    data = request.json
    class_name = data.get("class_name", "").strip()
    if not class_name:
        return jsonify({"error": "Nama kelas tidak boleh kosong!"}), 400
    
    safe_class = class_name.replace("/", "-").replace("\\", "-")
    class_dir = os.path.join(DATASET_DIR, safe_class)
    if os.path.exists(class_dir):
        return jsonify({"error": "Kelas sudah ada!"}), 400
        
    os.makedirs(class_dir, exist_ok=True)
    return jsonify({"message": f"Kelas '{class_name}' berhasil ditambahkan."})

@app.route('/api/classes/<old_class_name>', methods=['PUT'])
def edit_class(old_class_name):
    data = request.json
    new_class_name = data.get("new_class_name", "").strip()
    if not new_class_name:
        return jsonify({"error": "Nama kelas baru tidak boleh kosong!"}), 400
        
    safe_old = old_class_name.replace("/", "-").replace("\\", "-")
    safe_new = new_class_name.replace("/", "-").replace("\\", "-")
    
    old_dir = os.path.join(DATASET_DIR, safe_old)
    new_dir = os.path.join(DATASET_DIR, safe_new)
    
    if os.path.exists(old_dir) and old_dir != new_dir:
        if os.path.exists(new_dir):
            return jsonify({"error": "Nama kelas baru sudah digunakan di folder dataset!"}), 400
        try:
            shutil.move(old_dir, new_dir)
        except Exception as e:
            return jsonify({"error": f"Gagal memindahkan folder: {str(e)}"}), 500
        
    metadata = load_metadata()
    updated = False
    for name, info in list(metadata.items()):
        if info.get("class_name") == old_class_name:
            info["class_name"] = new_class_name
            updated = True
    if updated:
        save_metadata(metadata)
        
    return jsonify({"message": f"Kelas '{old_class_name}' berhasil diubah menjadi '{new_class_name}'."})

@app.route('/api/classes/<class_name>', methods=['DELETE'])
def delete_class(class_name):
    safe_class = class_name.replace("/", "-").replace("\\", "-")
    class_dir = os.path.join(DATASET_DIR, safe_class)
    
    if os.path.exists(class_dir):
        try:
            shutil.rmtree(class_dir)
        except Exception as e:
            return jsonify({"error": f"Gagal menghapus folder: {str(e)}"}), 500
        
    metadata = load_metadata()
    students_to_delete = [name for name, info in metadata.items() if info.get("class_name") == class_name]
    for s_name in students_to_delete:
        del metadata[s_name]
    save_metadata(metadata)
    
    return jsonify({"message": f"Kelas '{class_name}' beserta data siswanya berhasil dihapus."})

# 8. Kamera Absensi Mulai/Berhenti
@app.route('/api/start', methods=['POST'])
def start_camera():
    global camera_running, camera_thread
    if camera_running:
        return jsonify({"message": "Kamera absensi sudah berjalan"})
        
    if not os.path.exists("trainer.yml"):
        return jsonify({"error": "Model wajah belum ditraining. Silakan lakukan training terlebih dahulu"}), 400
        
    camera_running = True
    stop_camera_event.clear()
    camera_thread = threading.Thread(target=attendance_loop)
    camera_thread.start()
    return jsonify({"message": "Kamera absensi berhasil dimulai"})

@app.route('/api/stop', methods=['POST'])
def stop_camera():
    global camera_running
    if not camera_running:
        return jsonify({"message": "Kamera absensi tidak sedang berjalan"})
        
    stop_camera_event.set()
    if camera_thread:
        camera_thread.join(timeout=2)
    camera_running = False
    return jsonify({"message": "Kamera absensi berhasil dihentikan"})

def migrate_dataset():
    if not os.path.exists(DATASET_DIR):
        return
    metadata = load_metadata()
    for name, info in list(metadata.items()):
        class_name = info.get("class_name")
        absent_no = info.get("absent_no")
        if not class_name or not absent_no:
            continue
        
        # Folder model lama (tidak terstruktur)
        old_dir = os.path.join(DATASET_DIR, name)
        # Folder model baru (terstruktur)
        new_dir = get_student_dir(class_name, absent_no, name)
        
        if os.path.exists(old_dir) and not os.path.exists(new_dir):
            os.makedirs(os.path.dirname(new_dir), exist_ok=True)
            try:
                shutil.move(old_dir, new_dir)
                print(f"Migrasi: Memindahkan {old_dir} -> {new_dir}")
            except Exception as e:
                print(f"Gagal migrasi folder {old_dir}: {e}")

if __name__ == '__main__':
    migrate_dataset()
    app.run(host='0.0.0.0', port=5000)
