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

  const filteredPermits = filterClass === 'Semua' 
    ? permits 
    : permits.filter(p => p.class_name === filterClass);

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
            
            return (
              <div key={p.id} className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-300">
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Siswa</span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{p.student_name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold block mt-0.5">{p.class_name}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                      p.status === 'Sakit' 
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' 
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                    }`}>
                      {p.status}
                    </span>
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
    </div>
  );
}
