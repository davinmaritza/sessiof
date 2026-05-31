import cv2
import os
import shutil
import numpy as np
import pandas as pd
import urllib.request
import requests
import json
import threading
import time
import math
import pickle
from datetime import datetime
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Model Deep Learning YuNet & SFace
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

EXCEL_FILE = "attendance.xlsx"
GOOGLE_SHEETS_WEBHOOK_URL = ""
METADATA_FILE = "students_metadata.json"
DATASET_DIR = "dataset"

# Status Kamera & Streaming
camera_running = False
camera_thread = None
stop_camera_event = threading.Event()
latest_frame = None
frame_lock = threading.Lock()

# Template embeddings database
templates = {}

def load_templates():
    global templates
    templates.clear()
    if os.path.exists("embeddings.pkl"):
        try:
            with open("embeddings.pkl", "rb") as f:
                emb_list = pickle.load(f)
                for name, feat in emb_list:
                    if name not in templates:
                        templates[name] = []
                    templates[name].append(feat)
            print(f"Loaded SFace templates for {len(templates)} students.")
        except Exception as e:
            print(f"Gagal memuat templates: {e}")

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

def load_settings():
    settings_path = "settings.json"
    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "arrivalTime": "06:30",
        "departureTime": "15:00",
        "desktopNotifications": False,
        "darkMode": False,
        "autoBackup": False,
        "livenessEnabled": True,
        "livenessThreshold": 50
    }

def get_student_dir(class_name, absent_no, name):
    safe_class = class_name.replace("/", "-").replace("\\", "-")
    safe_name = name.replace("/", "-").replace("\\", "-")
    return os.path.join(DATASET_DIR, safe_class, f"{absent_no} - {safe_name}")

# --- PEREKAMAN ABSENSI KE EXCEL ---
latest_scan = None

def log_attendance(name):
    global latest_scan
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
    
    # Calculate status based on arrival time + grace period
    status = "Hadir"
    is_late = False
    try:
        settings = load_settings()
        arrival_time = settings.get("arrivalTime", "06:30")
        grace_period = int(settings.get("gracePeriod", 0))
        
        ahour, amin = map(int, arrival_time.split(":"))
        total_arrival_mins = ahour * 60 + amin + grace_period
        
        total_curr_mins = now.hour * 60 + now.minute
        if total_curr_mins > total_arrival_mins:
            is_late = True
            status = "Terlambat"
    except Exception as e:
        print(f"Gagal memproses batas keterlambatan: {e}")
        
    data_absen = {
        "Nama": [name],
        "Kelas": [kelas],
        "No Absen": [no_absen],
        "Hari": [hari_ini],
        "Tanggal": [tanggal],
        "Bulan": [bulan],
        "Tahun": [tahun],
        "Waktu Absen": [waktu],
        "Status": [status]
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
                if "Status" in df_existing.columns:
                    sudah_absen = df_existing[
                        (df_existing["Nama"] == name) & 
                        (pd.to_numeric(df_existing["Tanggal"], errors='coerce') == int(tanggal)) & 
                        (df_existing["Bulan"] == bulan) & 
                        (pd.to_numeric(df_existing["Tahun"], errors='coerce') == int(tahun)) &
                        (df_existing["Status"] != "Dihapus")
                    ]
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
            "bulan": bulan, "tahun": tahun, "waktu": waktu, "status": status
        }
        try:
            requests.post(GOOGLE_SHEETS_WEBHOOK_URL, json=payload, timeout=5)
        except Exception:
            pass
            
    if not sudah_absen_hari_ini:
        settings = load_settings()
        if settings.get("whatsappNotificationsEnabled", True):
            logs_file = "whatsapp_logs.json"
            whatsapp_logs = []
            if os.path.exists(logs_file):
                try:
                    with open(logs_file, 'r') as f:
                        whatsapp_logs = json.load(f)
                except Exception:
                    pass
            
            if is_late:
                message_body = f"Yth. Orang tua dari {name}, menginfokan bahwa siswa telah masuk sekolah pada pukul {waktu} (Terlambat)."
            else:
                message_body = f"Yth. Orang tua dari {name}, menginfokan bahwa siswa telah hadir di sekolah dengan tepat waktu pada pukul {waktu}."
                
            new_log = {
                "id": len(whatsapp_logs) + 1,
                "recipient": f"Orang Tua {name}",
                "message": message_body,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "Sent"
            }
            whatsapp_logs.insert(0, new_log)
            try:
                with open(logs_file, 'w') as f:
                    json.dump(whatsapp_logs, f, indent=4)
            except Exception as e:
                print(f"Gagal menulis log WhatsApp: {e}")
            
    latest_scan = {
        "name": name,
        "class_name": kelas,
        "absent_no": no_absen,
        "time": waktu,
        "is_duplicate": sudah_absen_hari_ini,
        "timestamp": time.time()
    }
            
    return sudah_absen_hari_ini

def distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def attendance_loop():
    global camera_running, latest_frame
    try:
        load_templates()
        if not templates:
            print("ERROR: Database template wajah kosong!")
            camera_running = False
            return
            
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("ERROR: Gagal membuka kamera!")
            camera_running = False
            return
            
        print("SUCCESS: Kamera absensi dimulai.")
        window_name = "Kamera Absensi Wajah - Tekan 'q' untuk keluar"
        
        # Buffer verifikasi wajah
        attendance_buffer = {}
        # Landmark history untuk passive liveness verification
        landmark_history = []
        
        last_settings_load = 0
        settings = load_settings()
        
        while not stop_camera_event.is_set():
            success, frame = cap.read()
            if not success or frame is None:
                break
                
            now_time = time.time()
            if now_time - last_settings_load > 3.0:
                settings = load_settings()
                last_settings_load = now_time
                
            liveness_enabled = settings.get("livenessEnabled", True)
            liveness_threshold = float(settings.get("livenessThreshold", 50.0))
                
            h, w = frame.shape[:2]
            detector.setInputSize((w, h))
            retval, faces = detector.detect(frame)
            
            recognized_any = False
            
            if faces is not None:
                for face in faces:
                    x, y, gw, gh = face[0:4].astype(int)
                    
                    # 1. PASIF Liveness Detection (Variasi Landmark + Laplacian Blur)
                    # A. Kejelasan Gambar (Laplacian Variance)
                    x_c = max(0, x)
                    y_c = max(0, y)
                    w_c = min(w - x_c, gw)
                    h_c = min(h - y_c, gh)
                    face_crop = frame[y_c:y_c+h_c, x_c:x_c+w_c]
                    
                    laplacian_var = 0.0
                    if face_crop.size > 0:
                        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
                        laplacian_var = cv2.Laplacian(gray_crop, cv2.CV_64F).var()
                        
                    # B. Variasi Landmark (Micro-movement)
                    landmark_history.append(face[4:14].copy())
                    if len(landmark_history) > 10:
                        landmark_history.pop(0)
                        
                    mean_var = 0.0
                    if len(landmark_history) >= 5:
                        arr = np.array(landmark_history)
                        coord_vars = np.var(arr, axis=0)
                        mean_var = np.mean(coord_vars)
                        
                    # Kriteria Liveness berdasarkan Settings
                    if liveness_enabled:
                        is_live = (laplacian_var >= liveness_threshold) and (mean_var >= 0.03)
                    else:
                        is_live = True
                    
                    # C. Pengenalan Wajah dengan SFace
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
                                
                    # SFace Threshold Cosine Similarity: 0.363
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
                                
                                cv2.rectangle(frame, (x, y), (x+gw, y+gh), box_color, 2)
                                cv2.putText(frame, display_text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                                cv2.putText(frame, status_text, (x, y + gh + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
                                
                                # Simpan frame terakhir
                                with frame_lock:
                                    latest_frame = frame.copy()
                                    
                                cv2.imshow(window_name, frame)
                                cv2.waitKey(1500)
                                stop_camera_event.set()
                                break
                            else:
                                status_text = f"Memverifikasi... ({attendance_buffer[student_name]}/8)"
                                text_color = (0, 255, 255)
                        else:
                            display_text = f"{student_name} ({match_percentage}%) [SPOOF DETECTED]"
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
                
            # Simpan frame untuk streaming
            with frame_lock:
                latest_frame = frame.copy()
                
            cv2.imshow(window_name, frame)
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

# MJPEG Video Feed Endpoint
def gen_frames():
    global latest_frame, camera_running
    while camera_running:
        with frame_lock:
            if latest_frame is None:
                time.sleep(0.03)
                continue
            ret, buffer = cv2.imencode('.jpg', latest_frame)
            frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.04)

@app.route('/api/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status', methods=['GET'])
def get_status():
    metadata = load_metadata()
    student_list = []
    
    if os.path.exists(DATASET_DIR):
        classes = [c for c in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, c))]
        for cls in classes:
            class_path = os.path.join(DATASET_DIR, cls)
            students_folders = [s for s in os.listdir(class_path) if os.path.isdir(os.path.join(class_path, s))]
            for folder in students_folders:
                parts = folder.split(" - ", 1)
                if len(parts) == 2:
                    absent_no, student_name = parts
                    info = metadata.get(student_name, {})
                    
                    folder_path = os.path.join(class_path, folder)
                    photos = [f for f in os.listdir(folder_path) if f.endswith(".jpg")]
                    
                    student_list.append({
                        "name": student_name,
                        "class_name": info.get("class_name", cls),
                        "absent_no": info.get("absent_no", absent_no),
                        "photo_count": len(photos),
                        "username": info.get("username", f"{student_name.lower().replace(' ', '')}"),
                        "password": info.get("password", "12345")
                    })
            
    return jsonify({
        "camera_running": camera_running,
        "total_students": len(student_list),
        "students": student_list,
        "model_exists": os.path.exists("embeddings.pkl"),
        "latest_scan": latest_scan
    })

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
    
    metadata = load_metadata()
    # Buat username & password default jika belum ada
    default_user = name.lower().replace(" ", "")
    metadata[name] = {
        "name": name,
        "class_name": class_name,
        "absent_no": absent_no,
        "username": default_user,
        "password": "12345"
    }
    save_metadata(metadata)
    
    return jsonify({"message": f"Siswa '{name}' ({class_name}) berhasil didaftarkan."})

# Endpoint Log Masuk Siswa
@app.route('/api/student/login', methods=['POST'])
def student_login():
    data = request.json
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not username or not password:
        return jsonify({"error": "Username dan password wajib diisi!"}), 400
        
    metadata = load_metadata()
    for student_name, info in metadata.items():
        curr_user = info.get("username", student_name.lower().replace(" ", "")).lower()
        curr_pass = str(info.get("password", "12345"))
        
        if curr_user == username and curr_pass == password:
            return jsonify({
                "success": True,
                "name": student_name,
                "class_name": info.get("class_name", "-"),
                "absent_no": info.get("absent_no", "-")
            })
            
    return jsonify({"error": "Username atau password siswa salah!"}), 401

# Endpoint Update Kredensial Siswa oleh Admin/Siswa
@app.route('/api/students/<name>/credentials', methods=['PUT'])
def update_credentials(name):
    data = request.json
    new_username = data.get("username", "").strip().lower()
    new_password = data.get("password", "").strip()
    
    if not new_username or not new_password:
        return jsonify({"error": "Username dan password baru tidak boleh kosong!"}), 400
        
    metadata = load_metadata()
    if name not in metadata:
        return jsonify({"error": f"Siswa '{name}' tidak ditemukan di metadata."}), 404
        
    # Validasi duplikasi username
    for s_name, info in metadata.items():
        if s_name != name and info.get("username", "").lower() == new_username:
            return jsonify({"error": "Username sudah digunakan oleh siswa lain!"}), 400
            
    metadata[name]["username"] = new_username
    metadata[name]["password"] = new_password
    save_metadata(metadata)
    
    return jsonify({"message": f"Kredensial login untuk siswa '{name}' berhasil diperbarui."})

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
        
    if old_dir != new_dir:
        if os.path.exists(new_dir):
            return jsonify({"error": "Lokasi/nama siswa baru sudah digunakan"}), 400
        
        os.makedirs(os.path.dirname(new_dir), exist_ok=True)
        shutil.move(old_dir, new_dir)
        
        old_class_dir = os.path.dirname(old_dir)
        if os.path.exists(old_class_dir) and len(os.listdir(old_class_dir)) == 0:
            os.rmdir(old_class_dir)
        
    username = old_info.get("username", new_name.lower().replace(" ", ""))
    password = old_info.get("password", "12345")

    if name in metadata:
        del metadata[name]
        
    metadata[new_name] = {
        "name": new_name,
        "class_name": class_name,
        "absent_no": absent_no,
        "username": username,
        "password": password
    }
    save_metadata(metadata)
    
    return jsonify({"message": f"Data profil siswa '{new_name}' berhasil diperbarui."})

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
    
    del metadata[name]
    save_metadata(metadata)
    
    # Rebuild embeddings model to remove deleted student's templates
    try:
        embeddings_list = []
        name_list = []
        if os.path.exists(DATASET_DIR):
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
                            img = cv2.imread(img_path)
                            if img is not None:
                                h, w = img.shape[:2]
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
        if len(embeddings_list) > 0:
            with open("embeddings.pkl", "wb") as f:
                pickle.dump(embeddings_list, f)
            np.save("names.npy", np.array(name_list))
        else:
            if os.path.exists("embeddings.pkl"):
                os.remove("embeddings.pkl")
            if os.path.exists("names.npy"):
                os.remove("names.npy")
        
        load_templates()
        print(f"Retrained templates successfully after deleting student '{name}'.")
    except Exception as e:
        print(f"Gagal retraining setelah menghapus siswa '{name}': {e}")
        
    return jsonify({"message": f"Siswa '{name}' berhasil dihapus."})

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
            
        h, w = frame.shape[:2]
        detector.setInputSize((w, h))
        retval, faces = detector.detect(frame)
        
        if faces is not None:
            for face in faces:
                count += 1
                aligned_face = recognizer.alignCrop(frame, face)
                cv2.imwrite(os.path.join(student_dir, f"{count}.jpg"), aligned_face)
                
                box = face[0:4].astype(int)
                cv2.rectangle(frame, (box[0], box[1]), (box[0]+box[2], box[1]+box[3]), (255, 0, 0), 2)
                cv2.putText(frame, f"Foto: {count}/30", (box[0], box[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                
        cv2.imshow("Registrasi Wajah - Jangan Bergerak", frame)
        if cv2.waitKey(100) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    
    if count >= 30:
        return jsonify({"message": f"Berhasil memotret 30 sampel foto wajah untuk {name}."})
    else:
        return jsonify({"error": "Proses foto dibatalkan"}), 400

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
        
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    retval, faces = detector.detect(img)
    pose = request.form.get("pose", "center").strip().lower()
    
    if faces is None or len(faces) == 0:
        return jsonify({"error": "Wajah tidak terdeteksi dalam foto! Pastikan wajah terlihat jelas."}), 400
        
    # Validasi Pose Wajah (Tengah, Kiri, Kanan) menggunakan landmarks YuNet
    face = faces[0]
    rex, ley, nex = face[4], face[6], face[8]
    eye_width = abs(ley - rex)
    if eye_width > 0:
        ratio = (nex - min(rex, ley)) / eye_width
        print(f"DEBUG Pose Check: expected={pose}, ratio={ratio:.3f}, rex={rex}, ley={ley}, nex={nex}")
        
        if pose == "left":
            if ratio >= 0.40:
                return jsonify({"error": "Sensor mendeteksi wajah Anda tidak menghadap ke KIRI. Silakan menoleh ke KIRI."}), 400
        elif pose == "right":
            if ratio <= 0.60:
                return jsonify({"error": "Sensor mendeteksi wajah Anda tidak menghadap ke KANAN. Silakan menoleh ke KANAN."}), 400
        elif pose == "center":
            if ratio < 0.38 or ratio > 0.62:
                return jsonify({"error": "Sensor mendeteksi wajah Anda miring/menoleh. Silakan hadap lurus ke DEPAN."}), 400
        
    # Validasi duplikasi wajah dengan database
    load_templates()
    if templates:
        aligned_face = recognizer.alignCrop(img, faces[0])
        query_feat = recognizer.feature(aligned_face)
        best_match = None
        max_score = -1.0
        for registered_name, feat_list in templates.items():
            if registered_name.lower().replace(" ", "") == name.lower().replace(" ", ""):
                continue
            for feat in feat_list:
                score = recognizer.match(query_feat, feat, cv2.FaceRecognizerSF_FR_COSINE)
                if score > max_score:
                    max_score = score
                    best_match = registered_name
                    
        print(f"DEBUG Duplikasi Wajah: Target={name}, Cocok={best_match}, Score={max_score}")
        if max_score > 0.25:
            return jsonify({"error": f"Wajah ini sangat mirip dengan '{best_match}' (Kemiripan: {int(max_score*100)}%). Pendaftaran ditolak untuk menghindari duplikasi!"}), 400
        
    metadata = load_metadata()
    info = metadata.get(name, {})
    class_name = info.get("class_name", "-")
    absent_no = info.get("absent_no", "-")
    
    student_dir = get_student_dir(class_name, absent_no, name)
    os.makedirs(student_dir, exist_ok=True)
    
    existing_files = [f for f in os.listdir(student_dir) if f.endswith(".jpg")]
    next_index = len(existing_files) + 1
    
    aligned_face = recognizer.alignCrop(img, faces[0])
    save_path = os.path.join(student_dir, f"{next_index}.jpg")
    cv2.imwrite(save_path, aligned_face)
    
    return jsonify({
        "message": f"Wajah berhasil dipindai! Tersimpan sebagai file ke-{next_index} untuk {name}.",
        "next_index": next_index
    })

@app.route('/api/train', methods=['POST'])
def train():
    if not os.path.exists(DATASET_DIR):
        return jsonify({"error": "Folder dataset tidak ditemukan"}), 400
        
    embeddings_list = []
    name_list = []
    
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
        return jsonify({"error": "Tidak ada foto wajah siswa terdaftar yang siap ditraining."}), 400
        
    with open("embeddings.pkl", "wb") as f:
        pickle.dump(embeddings_list, f)
    np.save("names.npy", np.array(name_list))
    
    return jsonify({"message": f"Model SFace berhasil diekstraksi untuk {len(name_list)} siswa.", "students": name_list})

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

@app.route('/api/start', methods=['POST'])
def start_camera():
    global camera_running, camera_thread
    if camera_running:
        return jsonify({"message": "Kamera absensi sudah berjalan"})
        
    if not os.path.exists("embeddings.pkl"):
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

@app.route('/api/verify-color-challenge', methods=['POST'])
def verify_color_challenge():
    if 'pre_flash' not in request.files or 'flash' not in request.files:
        return jsonify({"error": "Kedua gambar (pre_flash & flash) wajib diunggah!"}), 400
    
    color = request.form.get("color", "").strip().lower() # 'red', 'blue', 'yellow', 'purple'
    if not color:
        return jsonify({"error": "Warna challenge wajib ditentukan!"}), 400
    
    file_pre = request.files['pre_flash']
    file_flash = request.files['flash']
    
    bytes_pre = np.frombuffer(file_pre.read(), np.uint8)
    bytes_flash = np.frombuffer(file_flash.read(), np.uint8)
    
    img_pre = cv2.imdecode(bytes_pre, cv2.IMREAD_COLOR)
    img_flash = cv2.imdecode(bytes_flash, cv2.IMREAD_COLOR)
    
    if img_pre is None or img_flash is None:
        return jsonify({"error": "Gagal membaca format gambar."}), 400
    
    h, w = img_pre.shape[:2]
    detector.setInputSize((w, h))
    _, faces_pre = detector.detect(img_pre)
    
    if faces_pre is None or len(faces_pre) == 0:
        return jsonify({"error": "Wajah tidak terdeteksi pada gambar pra-flash! Harap hadap lurus ke kamera."}), 400
        
    h2, w2 = img_flash.shape[:2]
    detector.setInputSize((w2, h2))
    _, faces_flash = detector.detect(img_flash)
    
    if faces_flash is None or len(faces_flash) == 0:
        return jsonify({"error": "Wajah tidak terdeteksi pada saat flash warna! Jangan banyak bergerak."}), 400
    
    box_pre = faces_pre[0][0:4].astype(int)
    box_flash = faces_flash[0][0:4].astype(int)
    
    def get_face_crop(img, box):
        x, y, gw, gh = box
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(img.shape[1], x + gw)
        y2 = min(img.shape[0], y + gh)
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        rw = int((x2 - x1) * 0.3)
        rh = int((y2 - y1) * 0.3)
        return img[cy-rh:cy+rh, cx-rw:cx+rw]
        
    crop_pre = get_face_crop(img_pre, box_pre)
    crop_flash = get_face_crop(img_flash, box_flash)
    
    if crop_pre.size == 0 or crop_flash.size == 0:
        return jsonify({"error": "Gagal memproses area wajah."}), 400
        
    mean_pre = cv2.mean(crop_pre)[:3] # (B, G, R)
    mean_flash = cv2.mean(crop_flash)[:3] # (B, G, R)
    
    b_diff = mean_flash[0] - mean_pre[0]
    g_diff = mean_flash[1] - mean_pre[1]
    r_diff = mean_flash[2] - mean_pre[2]
    
    print(f"DEBUG Color Challenge: color={color}, diff=(B:{b_diff:.2f}, G:{g_diff:.2f}, R:{r_diff:.2f})")
    
    success = False
    
    # Cek kecenderungan (trend) pergeseran warna yang paling dominan
    if color == 'red':
        if r_diff > max(g_diff, b_diff) or (r_diff > 0.3 and r_diff > np.mean([g_diff, b_diff])):
            success = True
    elif color == 'blue':
        if b_diff > max(g_diff, r_diff) or (b_diff > 0.3 and b_diff > np.mean([g_diff, r_diff])):
            success = True
    elif color == 'yellow':
        if min(r_diff, g_diff) > b_diff or (r_diff > 0.3 and g_diff > 0.3 and min(r_diff, g_diff) > b_diff):
            success = True
    elif color == 'purple':
        if min(r_diff, b_diff) > g_diff or (r_diff > 0.3 and b_diff > 0.3 and min(r_diff, b_diff) > g_diff):
            success = True
            
    if not success:
        return jsonify({
            "error": f"Pantulan warna {color.upper()} tidak terdeteksi pada wajah Anda! Pastikan layar menghadap wajah Anda dan kondisi cahaya cukup."
        }), 400
        
    return jsonify({"message": f"Liveness deteksi pantulan warna {color.upper()} berhasil!"})

@app.route('/api/verify-pose', methods=['POST'])
def verify_pose():
    if 'image' not in request.files:
        return jsonify({"error": "Gambar pose wajib diunggah!"}), 400
    
    pose = request.form.get("pose", "center").strip().lower()
    if pose not in ['left', 'right', 'center']:
        return jsonify({"error": "Pose tidak valid!"}), 400
        
    file = request.files['image']
    bytes_img = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(bytes_img, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({"error": "Gagal membaca format gambar."}), 400
        
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    
    if faces is None or len(faces) == 0:
        if pose == "left":
            return jsonify({"error": "Wajah tidak terdeteksi! Pastikan wajah Anda terlihat oleh kamera saat menoleh ke KIRI (jangan menoleh terlalu jauh)."}), 400
        elif pose == "right":
            return jsonify({"error": "Wajah tidak terdeteksi! Pastikan wajah Anda terlihat oleh kamera saat menoleh ke KANAN (jangan menoleh terlalu jauh)."}), 400
        else:
            return jsonify({"error": "Wajah tidak terdeteksi! Silakan posisikan wajah Anda tepat di depan kamera."}), 400
        
    face = faces[0]
    rex, ley, nex = face[4], face[6], face[8]
    eye_width = abs(ley - rex)
    if eye_width > 0:
        ratio = (nex - min(rex, ley)) / eye_width
        print(f"DEBUG Verify Pose Check: expected={pose}, ratio={ratio:.3f}")
        
        if pose == "left":
            if ratio >= 0.40:
                return jsonify({"error": "Sensor mendeteksi wajah Anda tidak menghadap ke KIRI. Silakan menoleh ke KIRI."}), 400
        elif pose == "right":
            if ratio <= 0.60:
                return jsonify({"error": "Sensor mendeteksi wajah Anda tidak menghadap ke KANAN. Silakan menoleh ke KANAN."}), 400
        elif pose == "center":
            if ratio < 0.38 or ratio > 0.62:
                return jsonify({"error": "Sensor mendeteksi wajah Anda miring/menoleh. Silakan hadap lurus ke DEPAN."}), 400
                
    return jsonify({"message": f"Pose {pose.upper()} terverifikasi!"})

@app.route('/api/verify-attendance-face', methods=['POST'])
def verify_attendance_face():
    if 'image' not in request.files:
        return jsonify({"error": "Gambar wajah wajib diunggah!"}), 400
        
    file = request.files['image']
    bytes_img = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(bytes_img, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({"error": "Gagal membaca format gambar."}), 400
        
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    _, faces = detector.detect(img)
    
    if faces is None or len(faces) == 0:
        return jsonify({"error": "Wajah tidak terdeteksi! Silakan hadap lurus ke depan kamera."}), 400
        
    load_templates()
    if not templates:
        return jsonify({"error": "Database template wajah kosong! Silakan daftarkan siswa terlebih dahulu."}), 400
        
    aligned_face = recognizer.alignCrop(img, faces[0])
    query_feat = recognizer.feature(aligned_face)
    
    best_match = None
    max_score = -1.0
    for name, feat_list in templates.items():
        for feat in feat_list:
            score = recognizer.match(query_feat, feat, cv2.FaceRecognizerSF_FR_COSINE)
            if score > max_score:
                max_score = score
                best_match = name
                
    print(f"DEBUG Attendance Face Verification: Match={best_match}, Score={max_score:.3f}")
    
    if max_score > 0.363:
        is_duplicate = log_attendance(best_match)
        status_text = "Sudah Absen Hari Ini" if is_duplicate else "ABSEN BERHASIL!"
        
        metadata = load_metadata()
        student_info = metadata.get(best_match, {})
        kelas = student_info.get("class_name", "-")
        no_absen = student_info.get("absent_no", "-")
        
        return jsonify({
            "success": True,
            "name": best_match,
            "class_name": kelas,
            "absent_no": no_absen,
            "is_duplicate": is_duplicate,
            "message": f"Kehadiran berhasil dicatat untuk {best_match} ({status_text})."
        })
    else:
        return jsonify({"error": "Wajah tidak dikenali dalam sistem. Silakan coba lagi atau hubungi admin."}), 400

# --- PORTAL LANJUTAN ENDPOINTS ---

@app.route('/api/announcements', methods=['GET', 'POST'])
def handle_announcements():
    announcements_file = "announcements.json"
    if request.method == 'POST':
        data = request.json
        title = data.get("title", "").strip()
        content = data.get("content", "").strip()
        class_name = data.get("class_name", "Semua").strip()
        
        if not title or not content:
            return jsonify({"error": "Judul dan isi pengumuman wajib diisi!"}), 400
            
        announcements = []
        if os.path.exists(announcements_file):
            try:
                with open(announcements_file, 'r') as f:
                    announcements = json.load(f)
            except Exception:
                pass
                
        new_ann = {
            "id": int(time.time()),
            "title": title,
            "content": content,
            "class_name": class_name,
            "date": datetime.now().strftime("%d %B %Y %H:%M")
        }
        announcements.insert(0, new_ann)
        with open(announcements_file, 'w') as f:
            json.dump(announcements, f, indent=4)
        return jsonify(new_ann)
        
    else: # GET
        announcements = []
        if os.path.exists(announcements_file):
            try:
                with open(announcements_file, 'r') as f:
                    announcements = json.load(f)
            except Exception:
                pass
        return jsonify(announcements)

@app.route('/api/announcements/<int:ann_id>', methods=['DELETE'])
def delete_announcement(ann_id):
    announcements_file = "announcements.json"
    if os.path.exists(announcements_file):
        try:
            with open(announcements_file, 'r') as f:
                anns = json.load(f)
            anns = [a for a in anns if a.get("id") != ann_id]
            with open(announcements_file, 'w') as f:
                json.dump(anns, f, indent=4)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "File tidak ditemukan"}), 404

@app.route('/api/permits', methods=['GET', 'POST'])
def handle_permits():
    permits_file = "permits.json"
    if request.method == 'POST':
        data = request.json
        student_name = data.get("student_name", "").strip()
        class_name = data.get("class_name", "").strip()
        status = data.get("status", "Sakit").strip()
        reason = data.get("reason", "").strip()
        
        if not student_name or not reason:
            return jsonify({"error": "Nama dan alasan izin wajib diisi!"}), 400
            
        permits = []
        if os.path.exists(permits_file):
            try:
                with open(permits_file, 'r') as f:
                    permits = json.load(f)
            except Exception:
                pass
                
        new_permit = {
            "id": int(time.time()),
            "student_name": student_name,
            "class_name": class_name,
            "status": status,
            "reason": reason,
            "date_submitted": datetime.now().strftime("%d %B %Y %H:%M"),
            "is_approved": "Pending",
            "document_name": "surat_keterangan.pdf"
        }
        permits.insert(0, new_permit)
        with open(permits_file, 'w') as f:
            json.dump(permits, f, indent=4)
        return jsonify(new_permit)
        
    else: # GET
        permits = []
        if os.path.exists(permits_file):
            try:
                with open(permits_file, 'r') as f:
                    permits = json.load(f)
            except Exception:
                pass
        return jsonify(permits)

@app.route('/api/permits/<int:permit_id>', methods=['PATCH'])
def approve_permit(permit_id):
    permits_file = "permits.json"
    if not os.path.exists(permits_file):
        return jsonify({"error": "Data izin tidak ditemukan"}), 404
        
    try:
        with open(permits_file, 'r') as f:
            permits = json.load(f)
            
        permit_to_update = None
        for p in permits:
            if p.get("id") == permit_id:
                permit_to_update = p
                break
                
        if not permit_to_update:
            return jsonify({"error": "Izin tidak ditemukan"}), 404
            
        data = request.json
        new_status = data.get("is_approved") # 'Approved' atau 'Rejected'
        permit_to_update["is_approved"] = new_status
        
        # Jika disetujui, update absensi ke Excel
        if new_status == "Approved":
            student_name = permit_to_update.get("student_name")
            kelas = permit_to_update.get("class_name")
            status_absensi = permit_to_update.get("status") # 'Sakit' atau 'Izin'
            
            metadata = load_metadata()
            no_absen = metadata.get(student_name, {}).get("absent_no", "-")
            
            now = datetime.now()
            hari_ini = now.strftime("%A")
            tanggal = now.strftime("%d")
            bulan = now.strftime("%B")
            tahun = now.strftime("%Y")
            waktu = "-"
            
            data_absen = {
                "Nama": [student_name],
                "Kelas": [kelas],
                "No Absen": [no_absen],
                "Hari": [hari_ini],
                "Tanggal": [tanggal],
                "Bulan": [bulan],
                "Tahun": [tahun],
                "Waktu Absen": [waktu],
                "Status": [status_absensi]
            }
            df_new = pd.DataFrame(data_absen)
            
            if os.path.exists(EXCEL_FILE):
                df_existing = pd.read_excel(EXCEL_FILE)
                # Hapus record hari ini untuk siswa tersebut jika ada
                df_existing = df_existing[~(
                    (df_existing["Nama"] == student_name) & 
                    (pd.to_numeric(df_existing["Tanggal"], errors='coerce') == int(tanggal)) & 
                    (df_existing["Bulan"] == bulan) & 
                    (pd.to_numeric(df_existing["Tahun"], errors='coerce') == int(tahun))
                )]
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                df_combined.to_excel(EXCEL_FILE, index=False)
            else:
                df_new.to_excel(EXCEL_FILE, index=False)
                
        with open(permits_file, 'w') as f:
            json.dump(permits, f, indent=4)
            
        return jsonify(permit_to_update)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/whatsapp-logs', methods=['GET', 'POST'])
def handle_whatsapp_logs():
    logs_file = "whatsapp_logs.json"
    if request.method == 'POST':
        data = request.json
        name = data.get("name", "").strip()
        message = data.get("message", "").strip()
        
        logs = []
        if os.path.exists(logs_file):
            try:
                with open(logs_file, 'r') as f:
                    logs = json.load(f)
            except Exception:
                pass
                
        new_log = {
            "id": len(logs) + 1,
            "recipient": f"Orang Tua {name}",
            "message": message,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "Sent"
        }
        logs.insert(0, new_log)
        with open(logs_file, 'w') as f:
            json.dump(logs, f, indent=4)
        return jsonify(new_log)
    else: # GET
        logs = []
        if os.path.exists(logs_file):
            try:
                with open(logs_file, 'r') as f:
                    logs = json.load(f)
            except Exception:
                pass
        return jsonify(logs)

def init_users_db():
    users_file = "users.json"
    if not os.path.exists(users_file):
        default_users = [
            {
                "username": "admin",
                "password": "admin",
                "role": "admin",
                "name": "Administrator"
            }
        ]
        try:
            with open(users_file, "w") as f:
                json.dump(default_users, f, indent=4)
        except Exception as e:
            print(f"Gagal inisialisasi database user: {e}")

@app.route('/api/login', methods=['POST'])
def unified_login():
    data = request.json
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not username or not password:
        return jsonify({"error": "Username dan password wajib diisi!"}), 400
        
    init_users_db()
    
    # 1. Cek Admin/Guru di users.json
    users_file = "users.json"
    if os.path.exists(users_file):
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
            for u in users:
                if u.get("username", "").lower() == username and u.get("password") == password:
                    return jsonify({
                        "success": True,
                        "username": u.get("username"),
                        "role": u.get("role", "guru"),
                        "name": u.get("name", "User"),
                        "class_name": u.get("class_name", "")
                    })
        except Exception:
            pass
            
    # 2. Cek Student di students_metadata.json
    metadata = load_metadata()
    for student_name, info in metadata.items():
        curr_user = info.get("username", student_name.lower().replace(" ", "")).lower()
        curr_pass = str(info.get("password", "12345"))
        
        if curr_user == username and curr_pass == password:
            return jsonify({
                "success": True,
                "username": curr_user,
                "role": "student",
                "name": student_name,
                "class_name": info.get("class_name", "-"),
                "absent_no": info.get("absent_no", "-")
            })
            
    return jsonify({"error": "Username atau password salah!"}), 401

@app.route('/api/users', methods=['GET', 'POST'])
def handle_users():
    users_file = "users.json"
    init_users_db()
    
    if request.method == 'POST':
        data = request.json
        username = data.get("username", "").strip().lower()
        password = data.get("password", "").strip()
        role = data.get("role", "guru").strip().lower()
        name = data.get("name", "").strip()
        class_name = data.get("class_name", "").strip()
        
        if not username or not password or not name:
            return jsonify({"error": "Data username, password, dan nama harus lengkap!"}), 400
            
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
        except Exception:
            users = []
            
        # Check duplicate
        if any(u.get("username", "").lower() == username for u in users):
            return jsonify({"error": "Username sudah terdaftar!"}), 400
            
        new_user = {
            "username": username,
            "password": password,
            "role": role,
            "name": name,
            "class_name": class_name if role == "guru" else ""
        }
        users.append(new_user)
        try:
            with open(users_file, 'w') as f:
                json.dump(users, f, indent=4)
        except Exception as e:
            return jsonify({"error": f"Gagal menyimpan user baru: {e}"}), 500
        return jsonify(new_user)
    else: # GET
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
        except Exception:
            users = []
        return jsonify(users)

@app.route('/api/users/<username>', methods=['PUT', 'DELETE'])
def manage_user_endpoint(username):
    users_file = "users.json"
    init_users_db()
    username = username.strip().lower()
    
    if request.method == 'DELETE':
        if username == 'admin':
            return jsonify({"error": "Akun admin utama tidak boleh dihapus!"}), 400
            
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
            users = [u for u in users if u.get("username", "").lower() != username]
            with open(users_file, 'w') as f:
                json.dump(users, f, indent=4)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    else: # PUT
        data = request.json
        password = data.get("password", "").strip()
        name = data.get("name", "").strip()
        role = data.get("role", "guru").strip()
        class_name = data.get("class_name", "").strip()
        
        try:
            with open(users_file, 'r') as f:
                users = json.load(f)
                
            user_found = False
            for u in users:
                if u.get("username", "").lower() == username:
                    if password:
                        u["password"] = password
                    if name:
                        u["name"] = name
                    if role and username != 'admin': # Admin role cannot change
                        u["role"] = role
                    # Store class_name if role is guru
                    if u.get("role") == "guru":
                        u["class_name"] = class_name
                    else:
                        u["class_name"] = ""
                    user_found = True
                    break
                    
            if not user_found:
                return jsonify({"error": "User tidak ditemukan!"}), 404
                
            with open(users_file, 'w') as f:
                json.dump(users, f, indent=4)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

def migrate_dataset():
    if not os.path.exists(DATASET_DIR):
        return
    metadata = load_metadata()
    for name, info in list(metadata.items()):
        class_name = info.get("class_name")
        absent_no = info.get("absent_no")
        if not class_name or not absent_no:
            continue
        
        old_dir = os.path.join(DATASET_DIR, name)
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
