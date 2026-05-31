'use client';

import { useState, useEffect } from 'react';

interface User {
  username: string;
  name: string;
  role: 'admin' | 'guru';
  password?: string;
  class_name?: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<{ name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form/Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'guru'>('guru');
  const [className, setClassName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    username: string;
    name: string;
  }>({ show: false, username: '', name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/users', { cache: 'no-store' });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error('Gagal mengambil data user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/classes');
      if (res.ok) {
        setClasses(await res.json());
      }
    } catch (e) {
      console.error('Gagal mengambil data kelas:', e);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setName('');
    setUsername('');
    setPassword('');
    setRole('guru');
    setClassName('');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setIsEditMode(true);
    setName(user.name);
    setUsername(user.username);
    setPassword(user.password || '');
    setRole(user.role);
    setClassName(user.class_name || '');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !username.trim() || (!isEditMode && !password.trim())) {
      setErrorMessage('Semua bidang wajib diisi!');
      return;
    }

    const payload = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role,
      class_name: role === 'guru' ? className : ''
    };

    try {
      const url = isEditMode 
        ? `http://localhost:5000/api/users/${username}`
        : 'http://localhost:5000/api/users';
        
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { 
            message: isEditMode ? 'Akun pengguna berhasil diperbarui.' : 'Pengguna baru berhasil ditambahkan.', 
            type: 'success' 
          } 
        }));
        fetchUsers();
      } else {
        setErrorMessage(data.error || 'Terjadi kesalahan sistem.');
      }
    } catch (err) {
      setErrorMessage('Gagal menghubungi server.');
    }
  };

  const handleDeleteClick = (userUsername: string, userName: string) => {
    setConfirmDialog({ show: true, username: userUsername, name: userName });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${confirmDialog.username}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDialog({ show: false, username: '', name: '' });
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Pengguna berhasil dihapus.', type: 'success' } 
        }));
        fetchUsers();
      } else {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: data.error || 'Gagal menghapus pengguna.', type: 'error' } 
        }));
        setConfirmDialog({ show: false, username: '', name: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Manajemen Otoritas</span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Kelola Akun Pengguna</h2>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-950/50 border-b border-slate-150 dark:border-zinc-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4">Nama Pengguna</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Hak Akses (Role)</th>
                  <th className="py-3.5 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/85">
                {users.map((u) => (
                  <tr key={u.username} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-zinc-200">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-650 dark:text-zinc-400">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border w-fit ${
                          u.role === 'admin' 
                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' 
                            : 'bg-primary-surface text-primary border-primary-lighter dark:border-primary-light/20'
                        }`}>
                          {u.role}
                        </span>
                        {u.role === 'guru' && (
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                            Wali Kelas: {u.class_name || 'Semua Kelas (Umum)'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Edit Pengguna"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteClick(u.username, u.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add / Edit User Modal ─────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-700/60 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-scale-in"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(91,77,199,0.08)' }}>
            
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                <svg className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  {isEditMode
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  }
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {isEditMode ? 'Perbarui Akun Pengguna' : 'Tambah Pengguna Baru'}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  {isEditMode ? `Mengedit akun @${username}` : 'Lengkapi isian kredensial akun pengguna.'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi, S.Pd."
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="budi"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required={!isEditMode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditMode ? 'Isi hanya jika ingin diganti' : 'Password default'}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Peran (Role)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['guru', 'admin'] as const).map((r) => (
                    <label key={r}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        role === r
                          ? r === 'admin'
                            ? 'border-red-400/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'border-primary/40 bg-primary-surface text-primary'
                          : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                      } ${isEditMode && username === 'admin' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={role === r}
                        onChange={() => setRole(r)}
                        disabled={isEditMode && username === 'admin'}
                        className="hidden"
                      />
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        role === r
                          ? r === 'admin' ? 'border-red-500 bg-red-500' : 'border-primary bg-primary'
                          : 'border-slate-300 dark:border-zinc-600'
                      }`}>
                        {role === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-semibold capitalize">{r === 'guru' ? 'Guru / Wali Kelas' : 'Administrator'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Wali Kelas */}
              {role === 'guru' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Wali Kelas Di</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  >
                    <option value="">Semua Kelas (Umum)</option>
                    {classes.map((cls) => (
                      <option key={cls.name} value={cls.name}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/20"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Custom Delete Confirmation Dialog ────────────────────────── */}
      {confirmDialog.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-700/50 rounded-2xl p-6 max-w-[360px] w-full animate-scale-in"
            style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.30), 0 0 0 1px rgba(239,68,68,0.08)' }}
          >
            {/* Icon */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))', border: '1px solid rgba(239,68,68,0.15)' }}>
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>

              <div>
                <h3 className="text-[15px] font-black text-slate-900 dark:text-white leading-snug">
                  Hapus Akun Pengguna?
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  Akun{' '}
                  <span className="font-bold text-slate-700 dark:text-zinc-200">{confirmDialog.name}</span>
                  {' '}dengan username{' '}
                  <code className="font-mono text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md text-[11px]">
                    @{confirmDialog.username}
                  </code>
                  {' '}akan dihapus secara permanen dan tidak dapat dikembalikan.
                </p>
              </div>

              {/* Warning badge */}
              <div className="w-full flex items-center gap-2 p-3 rounded-xl text-[11px] font-semibold text-amber-700 dark:text-amber-400"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setConfirmDialog({ show: false, username: '', name: '' })}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batalkan
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-red-500/25"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
