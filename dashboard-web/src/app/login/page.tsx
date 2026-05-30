'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const logged = localStorage.getItem('sessiof_admin_logged');
    if (logged === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('sessiof_admin_logged', 'true');
      router.push('/dashboard');
    } else {
      setLoginError('Username atau password admin salah!');
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 antialiased font-sans">
      <div className="bg-white border border-slate-200/80 max-w-md w-full rounded-2xl p-8 shadow-xl space-y-6 hover:shadow-2xl transition-all duration-300">
        
        <div className="text-center space-y-2">
          {/* Logo Sessiof */}
          <div className="mx-auto h-12 w-12 bg-black rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
            S
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Sign in to Sessiof</h1>
          <p className="text-slate-400 text-xs">Aplikasi Absensi Presensi Deteksi Wajah Sekolah</p>
        </div>

        {loginError && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs font-semibold text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Username Admin</label>
            <input
              type="text"
              placeholder="Masukkan username (admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Password Admin</label>
            <input
              type="password"
              placeholder="Masukkan password (admin)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400 transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01]"
          >
            Log In
          </button>
        </form>

      </div>
    </main>
  );
}
