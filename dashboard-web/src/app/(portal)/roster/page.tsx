'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface Student {
  name: string;
  class_name: string;
  absent_no: string;
  photo_count: number;
  username?: string;
  password?: string;
}

interface ServerStatus {
  camera_running: boolean;
  total_students: number;
  students: Student[];
  model_exists: boolean;
}

export default function RosterPage() {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    camera_running: false,
    total_students: 0,
    students: [],
    model_exists: false
  });
  
  // State untuk Kelola Siswa (Add & Edit Card)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAbsentNo, setEditAbsentNo] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));
  
  // Search & Filter di Tab Kelola Siswa
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterClassFilter, setRosterClassFilter] = useState('Semua');

  // Input Pendaftaran & Upload
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newStudentAbsentNo, setNewStudentAbsentNo] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // Status Umpan Balik UI
  const [actionStatus, setActionStatus] = useState('');
  const [trainingStatus, setTrainingStatus] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<{name: string}[]>([]);

  // State untuk Analisis Siswa
  const [analyticsStudent, setAnalyticsStudent] = useState<Student | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState({ arrivalTime: '06:30', departureTime: '15:00' });

  const fetchAvailableClasses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/classes');
      if (res.ok) {
        const data = await res.json();
        setAvailableClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (error) {
      console.error('Python server offline:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data);
      }
    } catch (e) {
      console.error('Gagal memuat log absensi untuk analisis:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchServerStatus();
    fetchAvailableClasses();
    fetchAttendance();
    fetchSettings();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentClass.trim() || !newStudentAbsentNo.trim()) {
      alert('Semua kolom data siswa harus diisi!');
      return;
    }
    setActionStatus('Menambahkan siswa...');
    try {
      const res = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          class_name: newStudentClass.trim(),
          absent_no: newStudentAbsentNo.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}`);
        setNewStudentName('');
        setNewStudentClass('');
        setNewStudentAbsentNo('');
        setShowAddModal(false);
        fetchServerStatus();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal menghubungkan ke server.');
    }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!editName.trim() || !editClass.trim() || !editAbsentNo.trim()) {
      alert('Semua kolom profil harus diisi!');
      return;
    }

    setActionStatus('Memperbarui profil siswa...');
    try {
      const res = await fetch(`http://localhost:5000/api/students/${encodeURIComponent(selectedStudent.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_name: editName.trim(),
          class_name: editClass.trim(),
          absent_no: editAbsentNo.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}`);
        setSelectedStudent(null);
        fetchServerStatus();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal menyimpan pembaruan profil.');
    }
  };

  const handleSaveCredentials = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!editUsername.trim() || !editPassword.trim()) {
      alert('Username dan password baru tidak boleh kosong!');
      return;
    }
    setActionStatus('Memperbarui kredensial login...');
    try {
      const url = `http://localhost:5000/api/students/${encodeURIComponent(selectedStudent.name)}/credentials`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername.trim().toLowerCase(),
          password: editPassword.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}`);
        fetchServerStatus();
      } else {
        setActionStatus(`Gagal: ${data.error || 'Server menolak permintaan.'}`);
      }
    } catch (error) {
      console.error('Credentials save error:', error);
      setActionStatus('Gagal menyimpan kredensial. Pastikan server Python aktif di port 5000.');
    }
  };

  const handleDeleteStudent = async (name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Siswa',
      message: `Apakah Anda yakin ingin menghapus siswa '${name}' beserta seluruh fotonya?`,
      onConfirm: async () => {
        closeModal();
        setActionStatus('Menghapus data siswa...');
        try {
          const res = await fetch(`http://localhost:5000/api/students/${encodeURIComponent(name)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok) {
            setActionStatus(`Sukses: ${data.message}`);
            setSelectedStudent(null);
            fetchServerStatus();
          } else {
            setActionStatus(`Gagal: ${data.error}`);
          }
        } catch (error) {
          setActionStatus('Gagal menghubungkan ke server API.');
        }
      }
    });
  };

  const handleCameraRegister = async (name: string) => {
    setActionStatus('Membuka kamera registrasi... Harap menghadap ke kamera...');
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}. Memulai auto-training...`);
        fetchServerStatus();
        await handleTrainModel();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal membuka kamera registrasi.');
    }
  };

  const handleUploadFace = async (name: string) => {
    if (!uploadFile) {
      alert('Pilih file gambar wajah terlebih dahulu');
      return;
    }

    setActionStatus('Mengunggah dan memindai wajah...');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', uploadFile);

    try {
      const res = await fetch('http://localhost:5000/api/upload-face', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}. Memulai auto-training...`);
        setUploadFile(null);
        const fileInput = document.getElementById('face-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchServerStatus();
        await handleTrainModel();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal mengunggah foto wajah.');
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingStatus('Sedang melatih model wajah... Harap tunggu...');
    try {
      const res = await fetch('http://localhost:5000/api/train', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTrainingStatus(`Sukses: ${data.message}`);
        setActionStatus('Auto-Training selesai. Model wajah telah diperbarui.');
        fetchServerStatus();
      } else {
        setTrainingStatus(`Gagal: ${data.error}`);
        setActionStatus(`Gagal melatih model: ${data.error}`);
      }
    } catch (error) {
      setTrainingStatus('Gagal melatih model.');
      setActionStatus('Gagal menghubungi server saat melatih model.');
    } finally {
      setIsTraining(false);
    }
  };

  const getInitials = (name: string) => name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const rosterClasses = ['Semua', ...Array.from(new Set(serverStatus.students.map(s => s.class_name).filter(Boolean)))];
  
  let filteredRoster = serverStatus.students;
  if (rosterSearch.trim() !== '') {
    const q = rosterSearch.toLowerCase();
    filteredRoster = filteredRoster.filter(s =>
      (s.name && s.name.toString().toLowerCase().includes(q)) ||
      (s.class_name && s.class_name.toString().toLowerCase().includes(q)) ||
      (s.absent_no && s.absent_no.toString().includes(q))
    );
  }
  if (rosterClassFilter !== 'Semua') {
    filteredRoster = filteredRoster.filter(s => s.class_name === rosterClassFilter);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Manajemen Database</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Kelola Siswa</h2>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-95"
        >
          + Tambah Siswa Baru
        </button>
      </div>

      {actionStatus && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3.5 text-xs font-semibold flex justify-between items-center shadow-sm animate-fade-in">
          <span>{actionStatus}</span>
          <button onClick={() => setActionStatus('')} className="text-emerald-400 hover:text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Student List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Roster Siswa</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Pilih siswa untuk edit data & kelola foto</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto items-center">
              <div className="relative">
                <select
                  value={rosterClassFilter}
                  onChange={(e) => setRosterClassFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-[10px] font-bold text-slate-650 focus:outline-none focus:border-slate-400 cursor-pointer min-w-[110px]"
                >
                  {rosterClasses.map(cls => (
                    <option key={cls} value={cls}>Kelas: {cls}</option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-400">▼</span>
              </div>
              <input
                type="text"
                placeholder="Cari siswa..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-full sm:w-44 font-medium"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-xl overflow-hidden shadow-inner max-h-[500px] overflow-y-auto">
            {filteredRoster.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data siswa.</div>
            ) : (
              filteredRoster.map((student, i) => (
                <div 
                  key={student.name} 
                  onClick={() => {
                    setSelectedStudent(student);
                    setEditName(student.name);
                    setEditClass(student.class_name);
                    setEditAbsentNo(student.absent_no);
                    setEditUsername(student.username || '');
                    setEditPassword(student.password || '');
                  }}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-all cursor-pointer ${
                    selectedStudent?.name === student.name ? 'bg-slate-50/80 border-l-4 border-black' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ background: 'var(--primary-surface)', color: 'var(--primary)' }}>
                      {getInitials(student.name)}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{student.name}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Kelas: <span className="font-bold text-slate-600">{student.class_name}</span> | Absen: <span className="font-bold text-slate-600">{student.absent_no}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalyticsStudent(student);
                        setIsAnalyticsOpen(true);
                      }}
                      className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      Analisis
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCameraRegister(student.name);
                      }}
                      className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      Ambil Foto
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile edit card & Trainer panel */}
        <div className="lg:col-span-5 space-y-6">
          {selectedStudent ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-slide-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Card Profil Siswa</h3>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>

              <form onSubmit={handleSaveStudentEdit} className="space-y-3.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Kelas</label>
                    <select
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700 transition-all"
                    >
                      <option value="" disabled>Pilih Kelas</option>
                      {availableClasses.map((cls, idx) => (
                        <option key={idx} value={cls.name}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">No Absen</label>
                    <input
                      type="text"
                      value={editAbsentNo}
                      onChange={(e) => setEditAbsentNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Foto Wajah Tersimpan:</span>
                  <span className="font-bold text-slate-700 bg-slate-205 px-2.5 py-0.5 rounded-full">{selectedStudent.photo_count} file</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(selectedStudent.name)}
                    className="flex-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 font-bold text-xs py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Hapus Siswa
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-light text-white font-bold text-xs py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Simpan Edit
                  </button>
                </div>
              </form>

              {/* Akun & Kredensial Siswa */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Pengaturan Akun Siswa
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Username Siswa</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-400 font-mono text-slate-700"
                      placeholder="username_siswa"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">Password Baru</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-400 font-mono text-slate-700"
                      placeholder="•••••"
                    />
                  </div>
                  <button
                    onClick={handleSaveCredentials}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 rounded-lg transition-all active:scale-[0.98]"
                  >
                    Simpan Akun Siswa
                  </button>
                </div>
              </div>

              {/* Upload image */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Upload Foto Wajah Baru</h4>
                <div className="flex gap-2">
                  <input
                    id="face-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="flex-1 text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:bg-slate-100 file:text-slate-700 cursor-pointer"
                  />
                  <button
                    onClick={() => handleUploadFace(selectedStudent.name)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                  >
                    Scan & Upload
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-sm">
              Pilih salah satu siswa dari daftar untuk melihat profil, mengunggah foto wajah baru, atau menghapusnya.
            </div>
          )}

          {/* Model trainer card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Latih Model Wajah (Trainer)</h3>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Lakukan training wajah setelah mendaftarkan siswa baru atau mengunggah foto wajah agar terdaftar di model AI.
            </p>
            <button
              onClick={handleTrainModel}
              className="w-full bg-primary hover:bg-primary-light text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-md active:scale-95"
            >
              Mulai Training Wajah
            </button>
            {trainingStatus && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] font-semibold text-slate-600 animate-pulse">
                {trainingStatus}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 hover:scale-[1.01] transition-all duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-900">Tambah Siswa Baru</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddStudent} className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  placeholder="Ketik nama lengkap..."
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Kelas</label>
                <select
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700"
                  required
                >
                  <option value="" disabled>Pilih Kelas</option>
                  {availableClasses.map((cls, idx) => (
                    <option key={idx} value={cls.name}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nomor Absen</label>
                <input
                  type="text"
                  placeholder="Contoh: 12"
                  value={newStudentAbsentNo}
                  onChange={(e) => setNewStudentAbsentNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-light text-white font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal {...modalConfig} onCancel={closeModal} />
      
      {/* Loading Overlay saat Training AI */}
      {isTraining && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Melatih Model AI</h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Sistem sedang memproses wajah siswa dan menyusun ulang struktur model AI agar pengenalan lebih akurat. Mohon jangan tutup halaman ini...
            </p>
          </div>
        </div>
      )}

      {/* Student Analytics Modal */}
      {isAnalyticsOpen && analyticsStudent && (() => {
        const studentRecords = attendanceRecords.filter(r => r.Nama === analyticsStudent.name && r.Status !== 'Dihapus');
        
        let tepatWaktu = 0;
        let terlambat = 0;
        let sakit = 0;
        let izin = 0;
        let alpa = 0;
        
        studentRecords.forEach(r => {
          if (r.Status === 'Sakit') sakit++;
          else if (r.Status === 'Izin') izin++;
          else if (r.Status === 'Alpa') alpa++;
          else if (r['Waktu Absen']) {
            const limit = settings.arrivalTime + ":00";
            if (r['Waktu Absen'] > limit) {
              terlambat++;
            } else {
              tepatWaktu++;
            }
          }
        });
        
        const totalLogs = studentRecords.length;
        const totalPresent = tepatWaktu + terlambat;
        const presenceRate = totalLogs > 0 ? Math.round((totalPresent / totalLogs) * 100) : 0;
        
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 hover:scale-[1.005] transition-all duration-300">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Analisis Aktivitas</span>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">Statistik Kehadiran: {analyticsStudent.name}</h4>
                </div>
                <button 
                  onClick={() => {
                    setIsAnalyticsOpen(false);
                    setAnalyticsStudent(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Circular Progress Ring */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-200"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-primary transition-all duration-500"
                        strokeWidth="3"
                        strokeDasharray={`${presenceRate}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-black text-slate-950">{presenceRate}%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hadir</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold mt-3">Persentase Kehadiran</span>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Tepat Waktu</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">{tepatWaktu}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Terlambat</span>
                    <span className="text-base font-black text-slate-900 mt-1 block text-orange-500">{terlambat}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Izin/Sakit</span>
                    <span className="text-base font-black text-slate-900 mt-1 block text-blue-500">{sakit + izin}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Alpa</span>
                    <span className="text-base font-black text-slate-900 mt-1 block text-red-500">{alpa}</span>
                  </div>
                </div>
              </div>

              {/* Roster logs table */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Log Riwayat Terkini</h5>
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-inner max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Jam Absen</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentRecords.length > 0 ? (
                        studentRecords.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 font-semibold text-slate-650">{r.Tanggal} {r.Bulan} {r.Tahun}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{r['Waktu Absen'] || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                r.Status === 'Sakit' || r.Status === 'Izin' 
                                  ? 'bg-blue-50 text-blue-600' 
                                  : r.Status === 'Alpa' 
                                  ? 'bg-red-50 text-red-600' 
                                  : r['Waktu Absen'] && r['Waktu Absen'] > settings.arrivalTime + ":00"
                                  ? 'bg-orange-50 text-orange-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {r.Status || 'Hadir'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 font-semibold">Tidak ada log absensi terekam.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
