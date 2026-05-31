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

  const handleDelete = async (userUsername: string) => {
    if (userUsername === 'admin') {
      alert('Akun admin utama tidak boleh dihapus!');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun '${userUsername}'?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/users/${userUsername}`, { method: 'DELETE' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: 'Pengguna berhasil dihapus.', type: 'success' } 
        }));
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus pengguna.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Manajemen Otoritas</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Kelola Akun Pengguna</h2>
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
                            onClick={() => handleDelete(u.username)}
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

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-scale-in">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditMode ? 'Perbarui Akun Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Lengkapi isian kredensial akun pengguna.</p>
            </div>

            {errorMessage && (
              <div className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-2.5 rounded-lg">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi, S.Pd."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Username</label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="budi"
                  className="w-full px-3 py-2 border rounded-lg disabled:opacity-50 dark:bg-zinc-950 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                <input
                  type="password"
                  required={!isEditMode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditMode ? 'Isi hanya jika ingin diganti' : 'Password default'}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Peran (Role)</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="guru"
                      checked={role === 'guru'}
                      onChange={() => setRole('guru')}
                      disabled={isEditMode && username === 'admin'}
                      className="accent-primary"
                    />
                    <span>Guru / Wali Kelas</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      disabled={isEditMode && username === 'admin'}
                      className="accent-primary"
                    />
                    <span>Administrator</span>
                  </label>
                </div>
              </div>

              {role === 'guru' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Wali Kelas Di</label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-950 dark:border-zinc-800 text-xs"
                  >
                    <option value="">Semua Kelas (Umum)</option>
                    {classes.map((cls) => (
                      <option key={cls.name} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-650 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-950 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
