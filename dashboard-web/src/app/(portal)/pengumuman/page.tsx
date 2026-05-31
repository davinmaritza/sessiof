'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface Announcement {
  id: number;
  title: string;
  content: string;
  class_name: string;
  date: string;
}

interface ClassItem {
  name: string;
}

export default function PengumumanAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [title, setTitle] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [userClass, setUserClass] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('sessiof_user_role') || 'admin';
    const ucls = localStorage.getItem('sessiof_user_class') || '';
    setUserRole(role);
    setUserClass(ucls);
    if (role === 'guru' && ucls) {
      setSelectedClass(ucls);
    }
    fetchAnnouncements();
    fetchClasses();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/announcements', { cache: 'no-store' });
      if (res.ok) setAnnouncements(await res.json());
    } catch (e) {
      console.error('Gagal memuat pengumuman:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/classes', { cache: 'no-store' });
      if (res.ok) setClasses(await res.json());
    } catch (e) {
      console.error('Gagal memuat kelas:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, class_name: selectedClass })
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        if (userRole !== 'guru' || !userClass) {
          setSelectedClass('Semua');
        }
        // Dispatch toast notification
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Pengumuman berhasil diposting!', type: 'success' } }));
        fetchAnnouncements();
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Gagal memposting pengumuman.', type: 'error' } }));
      }
    } catch (error) {
      console.error('Error posting announcement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId === null) return;
    setConfirmOpen(false);
    try {
      const res = await fetch(`http://localhost:5000/api/announcements/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Pengumuman berhasil dihapus.', type: 'success' } }));
        fetchAnnouncements();
      }
    } catch (e) {
      console.error('Gagal menghapus:', e);
    } finally {
      setDeleteId(null);
    }
  };

  const filteredAnnouncements = userRole === 'guru' && !!userClass
    ? announcements.filter(ann => ann.class_name === userClass || ann.class_name === 'Semua')
    : announcements;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-5">
        <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Wali Kelas Feed</span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Manajemen Pengumuman Kelas</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Create Announcement */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Buat Pengumuman Baru</h3>
            <p className="text-xs text-slate-400 mt-1">Publikasikan informasi penting langsung ke dashboard mandiri siswa.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Judul Pengumuman</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Info Ujian Akhir Semester"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-250 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Target Kelas</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={userRole === 'guru' && !!userClass}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-250 dark:border-zinc-800 pr-10 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {userRole === 'guru' && !!userClass ? (
                    <option value={userClass}>{userClass}</option>
                  ) : (
                    <>
                      <option value="Semua">Semua Kelas</option>
                      {classes.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </>
                  )}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Isi Pengumuman</label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis pesan pengumuman untuk siswa di sini..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-250 dark:border-zinc-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Memposting...' : 'Kirim Pengumuman'}
            </button>
          </form>
        </div>

        {/* Announcement List */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white px-1">Daftar Pengumuman Aktif</h3>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-8 text-center text-slate-400">
              Belum ada pengumuman yang diposting.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {filteredAnnouncements.map((ann) => (
                <div key={ann.id} className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3 relative group hover:shadow-md transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-primary-surface text-primary border-primary-lighter dark:border-primary-light/20">
                        {ann.class_name}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-2">{ann.title}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{ann.date}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteClick(ann.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Hapus Pengumuman"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-xs text-slate-650 dark:text-zinc-300 leading-relaxed whitespace-pre-line border-t border-slate-50 dark:border-zinc-800 pt-3">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Hapus Pengumuman"
        message="Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        confirmStyle="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
