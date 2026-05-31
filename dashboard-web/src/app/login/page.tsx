'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SessiofLogo from '@/components/SessiofLogo';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const adminLogged = localStorage.getItem('sessiof_admin_logged');
    if (adminLogged === 'true') {
      router.replace('/dashboard');
      return;
    }
    const studentLogged = localStorage.getItem('sessiof_student_logged');
    if (studentLogged === 'true') {
      router.replace('/student/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.role === 'admin' || data.role === 'guru') {
          localStorage.setItem('sessiof_admin_logged', 'true');
          localStorage.setItem('sessiof_user_role', data.role);
          localStorage.setItem('sessiof_user_name', data.name);
          localStorage.setItem('sessiof_user_class', data.class_name || '');
          router.push('/dashboard');
        } else if (data.role === 'student') {
          localStorage.setItem('sessiof_student_logged', 'true');
          localStorage.setItem('sessiof_student_name', data.name);
          localStorage.setItem('sessiof_student_class', data.class_name);
          localStorage.setItem('sessiof_student_absent', data.absent_no);
          router.push('/student/dashboard');
        }
      } else {
        setLoginError(data.error || 'Username atau password salah.');
      }
    } catch (error) {
      setLoginError('Tidak dapat terhubung ke server.');
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-5 antialiased relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1625 40%, #0f0f1a 100%)' }}>
      
      {/* Subtle ambient light */}
      <div className="absolute top-[-30%] left-[20%] w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,77,199,0.15) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,111,224,0.12) 0%, transparent 70%)' }} />

      <div className="w-full max-w-[400px] animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex justify-center">
            <SessiofLogo size={48} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight login-title">Masuk ke Sessiof</h1>
          <p className="text-[13px] text-[#8a8a9a] mt-1.5">Sistem absensi presensi wajah sekolah</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7 space-y-5"
          style={{ 
            background: 'rgba(255,255,255,0.04)', 
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)'
          }}>

          {loginError && (
            <div className="flex items-center gap-2.5 rounded-xl p-3.5 text-[13px] font-medium animate-slide-up"
              style={{ background: 'rgba(220,74,70,0.08)', border: '1px solid rgba(220,74,70,0.15)', color: '#f87171' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium block tracking-wide login-label">
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-3 text-[13px] font-medium rounded-xl transition-all duration-200 login-input"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium block tracking-wide login-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-3 pr-10 text-[13px] font-medium rounded-xl transition-all duration-200 login-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b7a] hover:text-white transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-semibold text-[13px] py-3 rounded-xl transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 cursor-pointer mt-2"
              style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </span>
              ) : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center text-[11px] text-[#5a5a6a] font-medium px-1">
          <span>Sessiof v2.0</span>
          <button 
            type="button" 
            onClick={() => router.push('/')} 
            className="hover:text-[#9b91e8] transition-colors"
          >
            Kembali ke beranda
          </button>
        </div>
      </div>
    </main>
  );
}
