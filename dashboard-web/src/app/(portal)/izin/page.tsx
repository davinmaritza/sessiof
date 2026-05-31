'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface Permit {
  id: number;
  student_name: string;
  class_name: string;
  status: 'Sakit' | 'Izin';
  reason: string;
  date_submitted: string;
  is_approved: 'Pending' | 'Approved' | 'Rejected';
  document_name: string;
}

export default function IzinAdminPage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('Semua');
  const [classes, setClasses] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: number, action: 'Approved' | 'Rejected'} | null>(null);
  const [userRole, setUserRole] = useState('admin');
  const [userClass, setUserClass] = useState('');
  
  // Selection and deletion state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<number[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('sessiof_user_role') || 'admin';
    const ucls = localStorage.getItem('sessiof_user_class') || '';
    setUserRole(role);
    setUserClass(ucls);
    if (role === 'guru' && ucls) {
      setFilterClass(ucls);
    }
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/permits', { cache: 'no-store' });
      if (res.ok) {
        const data: Permit[] = await res.json();
        setPermits(data);
        // Extract unique classes
        const clsSet = new Set(data.map(p => p.class_name).filter(Boolean));
        setClasses(Array.from(clsSet));
      }
    } catch (e) {
      console.error('Gagal mengambil data izin:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (id: number, action: 'Approved' | 'Rejected') => {
    setPendingAction({ id, action });
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    setConfirmOpen(false);
    setPendingAction(null);

    try {
      const res = await fetch(`http://localhost:5000/api/permits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: action })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { 
            message: action === 'Approved' ? 'Pengajuan disetujui!' : 'Pengajuan ditolak.', 
            type: action === 'Approved' ? 'success' : 'error' 
          } 
        }));
        fetchPermits();
      }
    } catch (e) {
      console.error('Gagal memproses aksi:', e);
    }
  };

  const handleConfirmDelete = async () => {
    if (idsToDelete.length === 0) return;
    setDeleteConfirmOpen(false);
    
    try {
      const res = await fetch('http://localhost:5000/api/permits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { 
            message: `Berhasil menghapus ${idsToDelete.length} pengajuan izin.`, 
            type: 'success' 
          } 
        }));
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        fetchPermits();
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { 
            message: 'Gagal menghapus pengajuan izin.', 
            type: 'error' 
          } 
        }));
      }
    } catch (e) {
      console.error('Gagal menghapus izin:', e);
    } finally {
      setIdsToDelete([]);
    }
  };

  const filteredPermits = filterClass === 'Semua' 
    ? permits 
    : permits.filter(p => p.class_name === filterClass);

  const handleSelectAll = () => {
    const filteredIds = filteredPermits.map(p => p.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const newSelection = [...prev];
        filteredIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Verifikasi Surat</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Persetujuan Sakit & Izin</h2>
        </div>

        {/* Filter */}
        <div className="relative">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            disabled={userRole === 'guru' && !!userClass}
            className="appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 cursor-pointer min-w-[130px] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {userRole === 'guru' && !!userClass ? (
              <option value={userClass}>{userClass}</option>
            ) : (
              <>
                <option value="Semua">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </>
            )}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
        </div>
      </div>

      {/* Selection Control Bar */}
      {!isLoading && filteredPermits.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 transition-all duration-300">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-checkbox"
              checked={filteredPermits.length > 0 && filteredPermits.every(p => selectedIds.includes(p.id))}
              onChange={handleSelectAll}
              className="w-4.5 h-4.5 rounded border-slate-300 text-primary focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 cursor-pointer"
            />
            <label htmlFor="select-all-checkbox" className="text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
              Pilih Semua ({filteredPermits.length} Item)
            </label>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end animate-fade-in">
              <span className="text-xs font-extrabold text-primary">
                {selectedIds.length} Terpilih
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setIdsToDelete(selectedIds);
                    setDeleteConfirmOpen(true);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Terpilih
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredPermits.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-12 text-center text-slate-400">
          Tidak ada pengajuan sakit atau izin yang ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scale-in">
          {filteredPermits.map((p) => {
            const isPending = p.is_approved === 'Pending';
            const isApproved = p.is_approved === 'Approved';
            const isChecked = selectedIds.includes(p.id);
            
            return (
              <div 
                key={p.id} 
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-300 ${
                  isChecked 
                    ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/[0.01]' 
                    : 'border-slate-200/60 dark:border-zinc-800/80'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(p.id)}
                        className="mt-1 w-4.5 h-4.5 rounded border-slate-300 text-primary focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950 cursor-pointer"
                      />
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Siswa</span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{p.student_name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold block mt-0.5">{p.class_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        p.status === 'Sakit' 
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' 
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                      }`}>
                        {p.status}
                      </span>
                      <button
                        onClick={() => {
                          setIdsToDelete([p.id]);
                          setDeleteConfirmOpen(true);
                        }}
                        title="Hapus data izin"
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-xl p-3.5 text-xs space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Alasan / Keterangan</span>
                    <p className="text-slate-700 dark:text-zinc-300 italic">"{p.reason}"</p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Berkas Lampiran: <strong>{p.document_name}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-4 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">{p.date_submitted}</span>
                  
                  {isPending ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleActionClick(p.id, 'Rejected')}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => handleActionClick(p.id, 'Approved')}
                        className="bg-primary text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg hover:bg-primary-light transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        Setujui
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                      isApproved 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' 
                        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'
                    }`}>
                      {isApproved ? 'Disetujui ✓' : 'Ditolak ✗'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title={pendingAction?.action === 'Approved' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
        message={
          pendingAction?.action === 'Approved'
            ? 'Apakah Anda yakin ingin menyetujui pengajuan izin ini? Ketidakhadiran siswa akan otomatis dicatat di log Excel.'
            : 'Apakah Anda yakin ingin menolak pengajuan ini?'
        }
        confirmText={pendingAction?.action === 'Approved' ? 'Setujui' : 'Tolak'}
        cancelText="Batal"
        confirmStyle={pendingAction?.action === 'Approved' ? 'primary' : 'danger'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Hapus Pengajuan Izin"
        message={
          idsToDelete.length === 1
            ? 'Apakah Anda yakin ingin menghapus data pengajuan izin ini?'
            : `Apakah Anda yakin ingin menghapus ${idsToDelete.length} data pengajuan izin terpilih secara permanen?`
        }
        confirmText="Hapus"
        cancelText="Batal"
        confirmStyle="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setIdsToDelete([]);
        }}
      />
    </div>
  );
}
