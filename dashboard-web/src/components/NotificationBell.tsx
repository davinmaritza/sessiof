'use client';

import { useState, useEffect, useRef } from 'react';

interface ScanNotif {
  id: number;
  name: string;
  class_name: string;
  time: string;
  is_duplicate: boolean;
  timestamp: number;
}

interface Props {
  onNewScan?: (scan: ScanNotif) => void;
}

export default function NotificationBell({ onNewScan }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifs, setNotifs] = useState<ScanNotif[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastTimestampRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Polling for new scans
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/status');
        if (!res.ok) return;
        const data = await res.json();
        const scan = data.latest_scan;

        if (
          scan &&
          !scan.is_duplicate &&
          scan.timestamp > lastTimestampRef.current &&
          lastTimestampRef.current !== 0 // ignore on first load
        ) {
          lastTimestampRef.current = scan.timestamp;

          const newNotif: ScanNotif = { ...scan, id: scan.timestamp };
          setNotifs(prev => [newNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);

          // Browser Push Notification
          if (permission === 'granted') {
            new Notification('📸 Absensi Terdeteksi — Sessiof', {
              body: `${scan.name} (${scan.class_name}) — ${scan.time}`,
              icon: '/sessiof-logo.png',
              badge: '/sessiof-logo.png',
              tag: `scan-${scan.timestamp}`,
            });
          }

          onNewScan?.(newNotif);
        } else if (scan && lastTimestampRef.current === 0) {
          lastTimestampRef.current = scan.timestamp || Date.now();
        }
      } catch {
        // Server offline, no problem
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [permission, onNewScan]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const handleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl transition-all cursor-pointer"
        style={{
          background: isOpen ? 'var(--bg-element)' : 'transparent',
          color: 'var(--text-muted)',
        }}
        title="Notifikasi Real-time"
      >
        <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl border overflow-hidden animate-scale-in z-50"
          style={{
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-element, rgba(0,0,0,0.08))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-element, rgba(0,0,0,0.06))' }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-title)' }}>
                Notifikasi Kamera
              </span>
              {notifs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-primary/10 text-primary">
                  {notifs.length}
                </span>
              )}
            </div>
            {permission !== 'granted' && 'Notification' in window && (
              <button
                onClick={requestPermission}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                Izinkan Notif
              </button>
            )}
          </div>

          {/* Permission Banner */}
          {permission === 'default' && (
            <div className="mx-3 mt-3 flex items-start gap-2.5 p-3 rounded-xl text-[11px]"
              style={{ background: 'rgba(91,77,199,0.06)', border: '1px solid rgba(91,77,199,0.12)' }}>
              <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: 'var(--text-body)' }}>
                  Aktifkan notifikasi browser untuk dapat peringatan real-time saat siswa terdeteksi kamera.
                </p>
                <button onClick={requestPermission}
                  className="mt-1.5 text-primary font-black hover:underline cursor-pointer">
                  Izinkan Sekarang →
                </button>
              </div>
            </div>
          )}

          {permission === 'denied' && (
            <div className="mx-3 mt-3 flex items-center gap-2 p-3 rounded-xl text-[11px] text-amber-700"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="font-semibold">Notifikasi diblokir. Aktifkan di pengaturan browser.</span>
            </div>
          )}

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span className="text-[11px] font-semibold">Belum ada aktivitas scan kamera</span>
                <span className="text-[10px]">Notifikasi muncul otomatis saat kamera aktif</span>
              </div>
            ) : (
              notifs.map((n, i) => (
                <div key={n.id}
                  className="flex items-start gap-3 px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: 'var(--border-element, rgba(0,0,0,0.05))',
                    background: i === 0 ? 'rgba(91,77,199,0.04)' : 'transparent'
                  }}>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                    style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                    {n.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate" style={{ color: 'var(--text-title)' }}>
                      {n.name}
                    </p>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {n.class_name} · {n.time}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                    Hadir
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t flex justify-between items-center"
              style={{ borderColor: 'var(--border-element, rgba(0,0,0,0.06))' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {permission === 'granted' ? '🟢 Notif browser aktif' : '⚪ Notif browser nonaktif'}
              </span>
              <button onClick={() => setNotifs([])}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 cursor-pointer">
                Hapus semua
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
