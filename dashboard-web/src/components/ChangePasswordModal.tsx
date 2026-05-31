'use client';

import { useState } from 'react';

interface Props {
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ username, onClose, onSuccess }: Props) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 6) s++;
    if (newPassword.length >= 10) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Semua bidang wajib diisi!');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok!');
      return;
    }
    if (oldPassword === newPassword) {
      setError('Password baru harus berbeda dari password lama!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Gagal memperbarui password.');
      }
    } catch {
      setError('Gagal menghubungi server. Pastikan Flask berjalan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-700/50 rounded-2xl p-6 max-w-[380px] w-full animate-scale-in"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(91,77,199,0.10)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Ganti Password</h3>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Akun <span className="font-mono font-bold">@{username}</span></p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-xl mb-4">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Password Lama</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button type="button" onClick={() => setShowOld(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  {showOld
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Password Baru</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 dark:border-zinc-700 rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button type="button" onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  {showNew
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  }
                </svg>
              </button>
            </div>
            {/* Strength Bar */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength ? strengthColor : '#e2e8f0' }} />
                  ))}
                </div>
                <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Konfirmasi Password Baru</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className={`w-full px-3 py-2.5 pr-10 border rounded-xl dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-300 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-red-400 focus:ring-red-400/30'
                    : confirmPassword && newPassword === confirmPassword
                    ? 'border-green-400 focus:ring-green-400/30'
                    : 'border-slate-200 dark:border-zinc-700 focus:ring-primary/30 focus:border-primary/50'
                }`}
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {newPassword === confirmPassword
                    ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
              Batal
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-white text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memperbarui...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Simpan Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
