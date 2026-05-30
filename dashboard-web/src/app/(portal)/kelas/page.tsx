'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface ClassItem {
  name: string;
  student_count: number;
}

interface Student {
  name: string;
  class_name: string;
  absent_no: string;
}

export default function KelasPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState('');
  
  const [actionStatus, setActionStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const fetchClasses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status');
      if (res.ok) {
        const data = await res.json();
        setAllStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      alert('Nama kelas tidak boleh kosong!');
      return;
    }
    setActionStatus('Menambahkan kelas...');
    try {
      const res = await fetch('http://localhost:5000/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name: newClassName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}`);
        setNewClassName('');
        setShowAddModal(false);
        fetchClasses();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal menghubungi server.');
    }
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassName.trim()) return;
    setActionStatus('Memperbarui nama kelas...');
    try {
      const res = await fetch(`http://localhost:5000/api/classes/${editingClass.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_class_name: editClassName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: ${data.message}`);
        setEditingClass(null);
        setEditClassName('');
        fetchClasses();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal menyimpan pembaruan kelas.');
    }
  };

  const handleDeleteClass = async (name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Kelas',
      message: `Apakah Anda yakin ingin menghapus kelas '${name}'? Tindakan ini akan menghapus semua folder wajah siswa di kelas ini dari dataset serta metadatanya.`,
      onConfirm: async () => {
        closeModal();
        setActionStatus('Menghapus data kelas...');
        try {
          const res = await fetch(`http://localhost:5000/api/classes/${name}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok) {
            setActionStatus(`Sukses: ${data.message}`);
            setEditingClass(null);
            fetchClasses();
          } else {
            setActionStatus(`Gagal: ${data.error}`);
          }
        } catch (error) {
          setActionStatus('Gagal menghubungi server.');
        }
      }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Manajemen Database</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Kelola Kelas</h2>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-95"
        >
          ⊕ Tambah Kelas Baru
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
        
        {/* Class List Card (Left) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daftar Kelas</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Pilih salah satu kelas untuk mengedit atau melihat detail.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs">Belum ada kelas terdaftar.</div>
            ) : (
              classes.map((cls) => (
                <div 
                  key={cls.name}
                  onClick={() => {
                    setEditingClass(cls);
                    setEditClassName(cls.name);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 hover:shadow-md hover:scale-[1.01] ${
                    editingClass?.name === cls.name 
                      ? 'bg-slate-50 border-black' 
                      : 'bg-slate-50/50 border-slate-200/60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight block">{cls.name}</span>
                    <span className="text-[14px]">🏫</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Siswa terdaftar</span>
                    <span className="text-xs font-black text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-full">{cls.student_count} orang</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Panel (Right) */}
        <div className="lg:col-span-5">
          {editingClass ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-slide-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Edit Kelas: {editingClass.name}</h3>
                <button 
                  onClick={() => setEditingClass(null)} 
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>

              <form onSubmit={handleSaveClassEdit} className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nama Kelas</label>
                  <input
                    type="text"
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 transition-all font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteClass(editingClass.name)}
                    className="flex-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 font-bold text-xs py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Hapus Kelas
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-light text-white font-bold text-xs py-2.5 rounded-lg transition-all active:scale-95"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>

              {/* Student Profiles List */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <h4 className="text-xs font-bold text-slate-800 mb-3">Profil Siswa di Kelas Ini</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {allStudents.filter(s => s.class_name === editingClass.name).length === 0 ? (
                    <div className="text-[10px] text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-slate-100">Belum ada siswa terdaftar di kelas ini.</div>
                  ) : (
                    allStudents
                      .filter(s => s.class_name === editingClass.name)
                      .sort((a, b) => parseInt(a.absent_no) - parseInt(b.absent_no))
                      .map(student => (
                        <div key={student.name} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-2.5 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shadow-sm">
                              {student.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{student.name}</p>
                              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">No Absen: {student.absent_no}</p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-sm">
              💡 Klik salah satu kartu kelas di daftar untuk mengubah nama, melihat profil siswa, atau menghapusnya.
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 hover:scale-[1.01] transition-all duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-900">Tambah Kelas Baru</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddClass} className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Nama Kelas Baru</label>
                <input
                  type="text"
                  placeholder="Contoh: X RPL 2"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-light text-white font-bold text-xs py-2.5 rounded-lg transition-all"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal {...modalConfig} onCancel={closeModal} />
    </div>
  );
}
