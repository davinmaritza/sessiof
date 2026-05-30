'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    setIsMounted(true);
    const logged = localStorage.getItem('sessiof_admin_logged');
    if (logged !== 'true') {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('sessiof_admin_logged');
    router.push('/login');
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const mainNavItems = [
    { 
      href: '/dashboard', 
      name: 'Dashboard', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      href: '/roster', 
      name: 'Kelola Siswa', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      href: '/kelas', 
      name: 'Kelola Kelas', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      href: '/attendance', 
      name: 'Absensi & Log', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  const othersNavItems = [
    { 
      href: '/settings', 
      name: 'Settings', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      href: '/account', 
      name: 'Account Management', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      href: '/support', 
      name: 'Support Center', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 font-sans antialiased overflow-hidden p-4 md:p-6 relative">
      
      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in ${toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span className="font-bold text-lg">{toast.type === 'success' ? '✨' : '⚠️'}</span>
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70 font-bold">✕</button>
        </div>
      )}

      <div className="flex w-full h-full bg-white/95 backdrop-blur-3xl rounded-[2rem] shadow-2xl shadow-slate-300/50 overflow-hidden border border-white/60">
        {/* SIDEBAR */}
        <aside className="w-64 bg-transparent border-r border-slate-100/50 flex flex-col justify-between py-6 px-5 shrink-0 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Logo Brand "Sessiof" */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                  ✨
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight">Sessiof</span>
                  <span className="text-[10px] text-slate-400 font-medium">Admin Portal</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-bold">↕</span>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input 
                type="text" 
                placeholder="Search here .." 
                className="w-full bg-slate-50 border border-slate-100 text-xs rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-light text-slate-700 placeholder-slate-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">⌘K</span>
            </div>

            {/* Main Navigation */}
            <div>
              <div className="flex justify-between items-center px-1 mb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MAIN</h3>
                <span className="text-[10px] text-slate-400">^</span>
              </div>
              <nav className="space-y-1">
                {mainNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02]'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Others Navigation */}
            <div>
              <div className="flex justify-between items-center px-1 mb-2 mt-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTHERS</h3>
                <span className="text-[10px] text-slate-400">^</span>
              </div>
              <nav className="space-y-1">
                {othersNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02]"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="mt-8 px-1">
            <button 
              onClick={async () => {
                try {
                  const res = await fetch('http://localhost:5000/api/start', { method: 'POST' });
                  const data = await res.json();
                  setToast({ show: true, message: data.message || data.error, type: res.ok ? 'success' : 'error' });
                  setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
                } catch (e) {
                  setToast({ show: true, message: 'Gagal menghubungi server Python. Pastikan backend menyala.', type: 'error' });
                  setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
                }
              }}
              className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-sm">📸</span>
              <span>Mulai Kamera Absen</span>
            </button>
          </div>

          {/* User Profile Footer */}
          <div className="pt-6 mt-auto">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary-light text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  SA
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 text-[11px] block leading-tight truncate">Sessiof Admin</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 truncate">Administrator</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition-colors text-xs p-1"
                title="Logout"
              >
                ↕
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
