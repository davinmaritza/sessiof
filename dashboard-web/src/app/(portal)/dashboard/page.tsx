'use client';

import { useState, useEffect, useRef } from 'react';
import AttendanceHeatmap from '@/components/AttendanceHeatmap';

interface Student {
  name: string;
  class_name: string;
  absent_no: string;
  photo_count: number;
}

interface AttendanceRecord {
  Nama: string;
  Kelas?: string;
  'No Absen'?: string | number;
  Hari: string;
  Tanggal: string | number;
  Bulan: string;
  Tahun: string | number;
  'Waktu Absen': string;
  Status?: string;
}

interface ServerStatus {
  camera_running: boolean;
  total_students: number;
  students: Student[];
  model_exists: boolean;
  latest_scan?: {
    name: string;
    class_name: string;
    absent_no: string;
    time: string;
    is_duplicate: boolean;
    timestamp: number;
  } | null;
}

export default function DashboardPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    camera_running: false, total_students: 0, students: [], model_exists: false
  });
  const [actionStatus, setActionStatus] = useState('');
  const [agendaData, setAgendaData] = useState<any>({
    agenda: [], academic_calendar: { active_date: 3, events: [] }
  });
  const [settings, setSettings] = useState({ 
    arrivalTime: '06:30', 
    departureTime: '15:00',
    desktopNotifications: false,
    darkMode: false,
    autoBackup: false
  });
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({ title: '', type: 'Online', time: '', icon: 'calendar' });
  const lastScanTimestampRef = useRef<number>(0);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('Administrator');
  const [userClass, setUserClass] = useState('');

  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      weekDates.push({
        dateNum: date.getDate(),
        dayLabel: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i],
        isToday: date.toDateString() === today.toDateString()
      });
    }
    return weekDates;
  };
  const weekDates = getCurrentWeekDates();

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventForm({ title: '', type: 'Online', time: '', icon: 'calendar' });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setEventForm({ title: event.title, type: event.type, time: event.time, icon: event.icon });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;
    try {
      const isEdit = !!editingEvent;
      const body = isEdit ? { id: editingEvent.id, ...eventForm } : eventForm;
      const res = await fetch('/api/agenda', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setIsEventModalOpen(false);
        fetchAgenda();
      }
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const handleDeleteEvent = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus agenda ini?')) return;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgenda();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const active = data.filter((r: any) => r.Status !== 'Dihapus');
        setRecords(active.reverse());
      }
    } catch (error) { console.error('Error fetching logs:', error); }
  };

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
        if (data.latest_scan && data.latest_scan.timestamp > lastScanTimestampRef.current) {
          if (lastScanTimestampRef.current === 0) {
            lastScanTimestampRef.current = data.latest_scan.timestamp;
          } else {
            lastScanTimestampRef.current = data.latest_scan.timestamp;
            const isDup = data.latest_scan.is_duplicate;
            const studentName = data.latest_scan.name;
            const scanTime = data.latest_scan.time;
            const message = isDup
              ? `Siswa ${studentName} sudah absen hari ini (${scanTime}).`
              : `Absen berhasil: ${studentName} telah hadir (${scanTime}).`;
            const type = isDup ? 'error' : 'success';
            
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
            
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('Sessiof Absensi Wajah', { body: message });
              }
            }
          }
        }
      }
    } catch (error) { console.error('Python server offline:', error); }
  };

  const fetchAgenda = async () => {
    try {
      const res = await fetch('/api/agenda');
      if (res.ok) setAgendaData(await res.json());
    } catch (error) { console.error('Error fetching agenda:', error); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch (error) { console.error('Error fetching settings:', error); }
  };

  useEffect(() => {
    const role = localStorage.getItem('sessiof_user_role') || 'admin';
    const name = localStorage.getItem('sessiof_user_name') || 'Administrator';
    const ucls = localStorage.getItem('sessiof_user_class') || '';
    setUserRole(role);
    setUserName(name);
    setUserClass(ucls);

    fetchAttendance(); fetchServerStatus(); fetchAgenda(); fetchSettings();
    const interval = setInterval(() => { fetchAttendance(); fetchServerStatus(); fetchAgenda(); }, 3000);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    
    return () => clearInterval(interval);
  }, []);

  const handleStartCamera = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/start', { method: 'POST' });
      const data = await res.json();
      setActionStatus(res.ok ? `Sukses: ${data.message}` : `Error: ${data.error || data.message}`);
      fetchServerStatus();
    } catch (error) { setActionStatus('Gagal menghubungi server Python.'); }
  };

  const handleStopCamera = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stop', { method: 'POST' });
      const data = await res.json();
      setActionStatus(res.ok ? `Sukses: ${data.message}` : `Error: ${data.error || data.message}`);
      fetchServerStatus();
    } catch (error) { setActionStatus('Gagal menghentikan kamera.'); }
  };

  // Metrics
  const totalStudents = serverStatus.total_students;
  const today = new Date().getDate().toString();
  const presentToday = new Set(records.filter((r) => r.Tanggal.toString() === today).map((r) => r.Nama)).size;
  const absentStudents = Math.max(0, totalStudents - presentToday);
  const presenceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : '0.0';

  let tepatWaktu = 0, terlambat = 0, sakitIzin = 0;
  records.forEach(r => {
    if (r.Status === 'Izin' || r.Status === 'Sakit') {
      sakitIzin++;
    } else if (r.Status === 'Terlambat') {
      terlambat++;
    } else if (r.Status === 'Hadir') {
      tepatWaktu++;
    } else if (r['Waktu Absen'] && r.Status !== 'Alpa') {
      if (r['Waktu Absen'] > settings.arrivalTime + ":00") terlambat++;
      else tepatWaktu++;
    }
  });
  const totalLogs = records.filter(r => r.Status !== 'Alpa').length || 1;
  const tepatWaktuPct = Math.round((tepatWaktu / totalLogs) * 100);
  const terlambatPct = Math.round((terlambat / totalLogs) * 100);
  const sakitIzinPct = Math.round((sakitIzin / totalLogs) * 100);

  const getMonthlyData = () => {
    const monthlyCounts = new Array(12).fill(0);
    const getMonthIndex = (monthStr: string) => {
      const parsed = parseInt(monthStr);
      if (!isNaN(parsed)) return parsed - 1;
      const names = ['january','february','march','april','may','june','july','august','september','october','november','december'];
      const idNames = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
      const lower = monthStr.toLowerCase();
      let idx = names.findIndex(n => lower.startsWith(n.substring(0,3)));
      if (idx === -1) idx = idNames.findIndex(n => lower.startsWith(n.substring(0,3)));
      return idx;
    };
    records.forEach(r => {
      if (r.Bulan) {
        const m = getMonthIndex(r.Bulan.toString());
        if (m >= 0 && m < 12) monthlyCounts[m]++;
      }
    });
    return monthlyCounts;
  };
  const chartData = getMonthlyData();
  const generatePath = (data: number[]) => {
    const max = Math.max(...data, 10);
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d / max) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };
  const generateAreaPath = (data: number[]) => {
    const max = Math.max(...data, 10);
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d / max) * 100;
      return `${x} ${y}`;
    });
    return `M 0 100 L ${points.map((p, i) => `${i === 0 ? '' : 'L '}${p}`).join(' ')} L 100 100 Z`;
  };

  const StudentInitials = ({ name }: { name: string }) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
        style={{ background: 'var(--primary-surface)', color: 'var(--primary)' }}>
        {initials || '?'}
      </div>
    );
  };

  const metricCards = [
    { label: 'Total Siswa', value: totalStudents, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    )},
    { label: 'Hadir Hari Ini', value: presentToday, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { label: 'Belum Hadir', value: absentStudents, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-7 flex flex-col xl:flex-row gap-6 animate-fade-in">
      
      {/* LEFT COLUMN */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-title)' }}>
              Selamat Datang, {userName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                userRole === 'admin' 
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' 
                  : 'bg-primary-surface text-primary border-primary-lighter dark:border-primary-light/20'
              }`}>
                {userRole === 'admin' ? 'Administrator' : 'Guru / Wali Kelas'}
              </span>
              {userRole === 'guru' && (
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Wali Kelas: <strong className="font-bold">{userClass || 'Semua Kelas (Umum)'}</strong>
                </span>
              )}
            </div>
            <p className="text-[13px] mt-2.5" style={{ color: 'var(--text-muted)' }}>Ringkasan aktivitas absensi hari ini.</p>
          </div>
        </div>

        {actionStatus && (
          <div className="rounded-lg p-3 text-[13px] font-medium flex justify-between items-center animate-slide-up"
            style={{ background: 'var(--primary-surface)', color: 'var(--primary)', border: '1px solid var(--primary-lighter)' }}>
            <span>{actionStatus}</span>
            <button onClick={() => setActionStatus('')} className="hover:opacity-70 ml-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Live Camera */}
        {serverStatus.camera_running && (
          <div className="rounded-xl p-5 flex flex-col md:flex-row gap-5 items-center animate-slide-up"
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
            <div className="w-full md:w-2/3 max-w-3xl aspect-video rounded-lg overflow-hidden bg-black relative">
              <img src="http://localhost:5000/api/video_feed" alt="Live Camera Feed" className="w-full h-full object-cover" />
              <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5 animate-pulse-soft">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> Live
              </span>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-[14px]" style={{ color: 'var(--text-title)' }}>Kamera Absensi Aktif</h4>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Sistem sedang mendeteksi wajah siswa secara real-time menggunakan model deep learning YuNet dan SFace.
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>Menunggu deteksi wajah...</span>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metricCards.map((card, i) => (
            <div key={i} className={`rounded-xl p-5 flex flex-col justify-between h-[120px] transition-all duration-200 hover:shadow-md animate-slide-up stagger-${i+1}`}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
              <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--primary)', opacity: 0.7 }}>{card.icon}</span>
                {card.label}
              </div>
              <span className="text-[28px] font-semibold tracking-tight" style={{ color: 'var(--text-title)' }}>{card.value}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl p-6 animate-slide-up stagger-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-title)' }}>Ringkasan Absensi</h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Tren kehadiran bulanan tahun ini</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-end gap-6 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-element)' }}>
            <div>
              <div className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Rasio Kehadiran</div>
              <span className="text-[22px] font-semibold" style={{ color: 'var(--text-title)' }}>{presenceRate}%</span>
            </div>
            <div>
              <div className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Hadir Hari Ini</div>
              <span className="text-[22px] font-semibold" style={{ color: 'var(--text-title)' }}>{presentToday}<span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>/{totalStudents}</span></span>
            </div>
            <div className="flex-1 flex justify-end gap-5 text-[11px] font-medium">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }}></span> Tepat Waktu
                </div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--text-title)' }}>{tepatWaktuPct}%</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Sakit/Izin
                </div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--text-title)' }}>{sakitIzinPct}%</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--hairline-strong)' }}></span> Terlambat
                </div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--text-title)' }}>{terlambatPct}%</div>
              </div>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full h-44 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map(val => (
                <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="var(--border-element)" strokeWidth="0.3" />
              ))}
              <path d={generateAreaPath(chartData)} fill="url(#chartGrad)" />
              <path d={generatePath(chartData)} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute w-full flex justify-between text-[10px] font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
              {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="p-5 pb-4">
            <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-title)' }}>Log Aktivitas Terbaru</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>5 entri terakhir dari sistem absensi</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-element)' }}>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>No Absen</th>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nama</th>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Kelas</th>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Waktu</th>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tanggal</th>
                  <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.slice(0, 5).map((r, idx) => (
                  <tr key={idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border-element)' }}>
                    <td className="py-3.5 px-5 font-medium" style={{ color: 'var(--text-muted)' }}>#{r['No Absen'] || '—'}</td>
                    <td className="py-3.5 px-5 font-semibold" style={{ color: 'var(--text-title)' }}>
                      <div className="flex items-center gap-2.5">
                        <StudentInitials name={r.Nama} />
                        <span>{r.Nama}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5" style={{ color: 'var(--text-muted)' }}>{r.Kelas || 'Umum'}</td>
                    <td className="py-3.5 px-5 font-mono font-medium" style={{ color: 'var(--text-title)' }}>{r['Waktu Absen']}</td>
                    <td className="py-3.5 px-5" style={{ color: 'var(--text-muted)' }}>{r.Tanggal} {r.Bulan}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider border
                        ${r.Status === 'Hadir' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                          (r.Status === 'Terlambat' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20' : 
                          (r.Status === 'Alpa' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' : 
                          (r.Status === 'Izin' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' : 
                          'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20')))}`}>
                        {r.Status || 'Hadir'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>Belum ada data absensi terekam.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-6">
        {/* Calendar */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-title)' }}>Kalender</h3>
            <button onClick={handleOpenAddEvent} className="text-[12px] font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
              style={{ color: 'var(--primary)', background: 'var(--primary-surface)' }}>
              + Tambah
            </button>
          </div>
          
          <div className="flex justify-between text-[11px] font-medium mb-5 px-1" style={{ color: 'var(--text-muted)' }}>
            {weekDates.map((item, idx) => (
              <div key={idx} className={`text-center ${item.isToday ? '' : ''}`}>
                <div className={`mb-1.5 w-7 h-7 flex items-center justify-center mx-auto rounded-lg font-semibold text-[12px] ${
                  item.isToday ? 'text-white' : ''
                }`} style={item.isToday ? { background: 'var(--primary)' } : { color: 'var(--text-title)' }}>
                  {item.dateNum}
                </div>
                <div style={{ color: item.isToday ? 'var(--primary)' : 'var(--text-muted)' }}>{item.dayLabel}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--border-element)' }}>
            {agendaData.academic_calendar.events.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between group py-1.5">
                <div className="flex gap-2.5 items-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-surface)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-[12px]" style={{ color: 'var(--text-title)' }}>{event.title}</h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{event.type} — {event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleOpenEditEvent(event, e)} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button onClick={(e) => handleDeleteEvent(event.id, e)} className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-400 hover:text-red-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl p-6 space-y-4 animate-scale-in"
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-title)' }}>
              {editingEvent ? 'Edit Agenda' : 'Tambah Agenda'}
            </h3>
            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Judul</label>
                <input type="text" value={eventForm.title} onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  required placeholder="Contoh: Pembagian Rapor" className="w-full px-3.5 py-2.5 text-[13px] rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Lokasi</label>
                  <input type="text" value={eventForm.type} onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Ruang Kelas" className="w-full px-3.5 py-2.5 text-[13px] rounded-lg" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Waktu</label>
                  <input type="text" value={eventForm.time} onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="08:30" className="w-full px-3.5 py-2.5 text-[13px] rounded-lg" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <button type="button" onClick={() => setIsEventModalOpen(false)}
                  className="text-[13px] font-medium px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'var(--bg-element)', color: 'var(--text-body)' }}>
                  Batal
                </button>
                <button type="submit" className="text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Heatmap */}
      <div className="px-6 md:px-8 pb-6">
        <AttendanceHeatmap records={records} />
      </div>
    </div>
  );
}
