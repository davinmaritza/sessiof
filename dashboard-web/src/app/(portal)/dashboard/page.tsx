'use client';

import { useState, useEffect } from 'react';

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
}

export default function DashboardPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    camera_running: false,
    total_students: 0,
    students: [],
    model_exists: false
  });
  const [actionStatus, setActionStatus] = useState('');
  const [agendaData, setAgendaData] = useState<any>({
    agenda: [],
    academic_calendar: { active_date: 3, events: [] }
  });
  const [settings, setSettings] = useState({
    arrivalTime: '06:30',
    departureTime: '15:00'
  });

  // Get current week dates (Monday to Sunday)
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // How many days to Monday
    
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

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({ title: '', type: 'Online', time: '', icon: '📅' });

  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventForm({ title: '', type: 'Online', time: '', icon: '📅' });
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
      const url = '/api/agenda';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { id: editingEvent.id, ...eventForm } : eventForm;

      const res = await fetch(url, {
        method,
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
    if (!confirm('Apakah Anda yakin ingin menghapus agenda ini?')) return;
    try {
      const res = await fetch(`/api/agenda?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAgenda();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.reverse());
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (error) {
      console.error('Python server offline:', error);
    }
  };

  const fetchAgenda = async () => {
    try {
      const res = await fetch('/api/agenda');
      if (res.ok) {
        const data = await res.json();
        setAgendaData(data);
      }
    } catch (error) {
      console.error('Error fetching agenda:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchServerStatus();
    fetchAgenda();
    fetchSettings();

    const interval = setInterval(() => {
      fetchAttendance();
      fetchServerStatus();
      fetchAgenda();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartCamera = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/start', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchServerStatus();
        setActionStatus(`Sukses: ${data.message}`);
      } else {
        setActionStatus(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      setActionStatus('Gagal menghubungi server Python.');
    }
  };

  const handleStopCamera = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchServerStatus();
        setActionStatus(`Sukses: ${data.message}`);
      } else {
        setActionStatus(`Error: ${data.error || data.message}`);
      }
    } catch (error) {
      setActionStatus('Gagal menghentikan kamera.');
    }
  };

  // Metrics
  const totalStudents = serverStatus.total_students;
  const today = new Date().getDate().toString();
  const presentToday = new Set(
    records.filter((r) => r.Tanggal.toString() === today).map((r) => r.Nama)
  ).size;
  const absentStudents = Math.max(0, totalStudents - presentToday);
  const presenceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : '0.0';

  // Stats calculation from records
  let tepatWaktu = 0;
  let terlambat = 0;
  let sakitIzin = 0;
  
  records.forEach(r => {
    if (r.Status === 'Izin' || r.Status === 'Sakit') {
      sakitIzin++;
    } else if (r['Waktu Absen'] && r.Status !== 'Alpa') {
      // Bandingkan dengan settings.arrivalTime
      // Format Waktu Absen: "07:15:30", Format arrivalTime: "06:30"
      const limit = settings.arrivalTime + ":00";
      if (r['Waktu Absen'] > limit) {
        terlambat++;
      } else {
        tepatWaktu++;
      }
    }
  });
  
  const totalLogs = records.filter(r => r.Status !== 'Alpa').length || 1;
  const tepatWaktuPct = Math.round((tepatWaktu / totalLogs) * 100);
  const terlambatPct = Math.round((terlambat / totalLogs) * 100);
  const sakitIzinPct = Math.round((sakitIzin / totalLogs) * 100);

  // Basic SVG Line Chart logic dynamic from data
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
        if (m >= 0 && m < 12) {
          monthlyCounts[m]++;
        }
      }
    });
    return monthlyCounts;
  };
  const chartData = getMonthlyData();
  
  const generatePath = (data: number[]) => {
    const max = Math.max(...data, 10); // at least 10 for scale
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (d / max) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col xl:flex-row gap-6 animate-fade-in text-slate-800">
      
      {/* LEFT COLUMN: Main Dashboard (70%) */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang, Admin</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Laporan singkat metrik absensi sekolah dan wawasan aktivitas siswa.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {serverStatus.camera_running ? (
              <button onClick={handleStopCamera} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
                🛑 Hentikan Scan
              </button>
            ) : (
              <button onClick={handleStartCamera} className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
                🟢 Mulai Absensi
              </button>
            )}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm cursor-pointer">
              <span>📅 Mar 24 - Mar 29 2025</span>
              <span className="ml-2 text-[10px]">›</span>
            </div>
            <div className="flex items-center justify-center bg-white border border-slate-200 rounded-xl w-9 h-9 shadow-sm cursor-pointer hover:bg-slate-50">
              🔍
            </div>
            <div className="flex items-center justify-center bg-white border border-slate-200 rounded-xl w-9 h-9 shadow-sm cursor-pointer hover:bg-slate-50 relative">
              🔔
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </div>
          </div>
        </div>

        {actionStatus && (
          <div className="bg-primary-lighter/30 border border-primary-light text-primary rounded-xl p-3 text-xs font-bold flex justify-between items-center shadow-sm">
            <span>{actionStatus}</span>
            <button onClick={() => setActionStatus('')} className="hover:text-primary-light">✕</button>
          </div>
        )}

        {/* 3 METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:border-primary-light transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>👥</span> Total Siswa
              </div>
            </div>
            <div className="flex items-end justify-between mt-4">
              <span className="text-3xl font-black text-slate-900">{totalStudents}</span>
              <div className="flex items-center justify-between w-full ml-4 text-[10px] font-bold">
                <span className="text-slate-400">Last Week</span>
                <span className="text-primary">+3.1%</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:border-primary-light transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>📑</span> Hadir Hari Ini
              </div>
            </div>
            <div className="flex items-end justify-between mt-4">
              <span className="text-3xl font-black text-slate-900">{presentToday}</span>
              <div className="flex items-center justify-between w-full ml-4 text-[10px] font-bold">
                <span className="text-slate-400">Last Week</span>
                <span className="text-red-500">-1.1%</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-32 hover:border-primary-light transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>⭐</span> Belum Hadir / Absen
              </div>
            </div>
            <div className="flex items-end justify-between mt-4">
              <span className="text-3xl font-black text-slate-900">{absentStudents}</span>
              <div className="flex items-center justify-between w-full ml-4 text-[10px] font-bold">
                <span className="text-slate-400">Last Week</span>
                <span className="text-primary">+2.0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ATTENDANCE SUMMARY CHART */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-2 items-center">
              <span className="text-sm">📊</span>
              <h3 className="font-bold text-slate-900 text-sm">Ringkasan Absensi</h3>
            </div>
            <span className="text-primary text-xs font-bold cursor-pointer">See Detail</span>
          </div>
          
          <div className="flex flex-wrap items-end gap-8 mb-8 border-b border-slate-100 pb-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 mb-1">Rasio Kehadiran</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{presenceRate}%</span>
                <span className="text-[10px] font-bold text-primary bg-primary-lighter/40 px-1.5 py-0.5 rounded">2.8%</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 mb-1">Total Hadir Hari Ini</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{presentToday}<span className="text-base text-slate-400 font-bold">/{totalStudents}</span></span>
                <span className="text-[10px] font-bold text-primary bg-primary-lighter/40 px-1.5 py-0.5 rounded">1.2%</span>
              </div>
            </div>
            <div className="flex-1 flex justify-end gap-6 text-[10px] font-bold">
              <div className="text-center">
                <div className="text-slate-400 mb-1 flex items-center gap-1 justify-center"><span className="w-2 h-2 rounded-full bg-primary"></span> Tepat Waktu</div>
                <div className="text-sm text-slate-900">{tepatWaktuPct}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 mb-1 flex items-center gap-1 justify-center"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Sakit/Izin</div>
                <div className="text-sm text-slate-900">{sakitIzinPct}%</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 mb-1 flex items-center gap-1 justify-center"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Terlambat</div>
                <div className="text-sm text-slate-900">{terlambatPct}%</div>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-48 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible preserve-aspect-ratio-none">
              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map(val => (
                <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="#f1f5f9" strokeWidth="0.5" />
              ))}
              {/* Lines */}
              <path d={generatePath(chartData)} fill="none" stroke="#758173" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute w-full flex justify-between text-[9px] font-bold text-slate-400 mt-2">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span className="text-primary">Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
            </div>
          </div>
        </div>

        {/* WORK ASSIGNMENT TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div className="flex gap-2 items-center">
              <span className="text-sm">🧑‍💻</span>
              <h3 className="font-bold text-slate-900 text-sm">Log Absensi / Aktivitas</h3>
            </div>
            <span className="text-primary text-xs font-bold cursor-pointer">See Detail</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex gap-2">
              <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3 py-1.5 focus:outline-none">
                <option>7 Hari Terakhir</option>
              </select>
              <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3 py-1.5 focus:outline-none">
                <option>1 Jan - 7 Jan</option>
              </select>
            </div>
            <div className="flex gap-6 border-b border-slate-200 flex-1 px-4 text-xs font-bold text-slate-400">
              <span className="pb-2 border-b-2 border-slate-800 text-slate-800 cursor-pointer">Kehadiran</span>
              <span className="pb-2 cursor-pointer hover:text-slate-600">Sakit / Izin</span>
              <span className="pb-2 cursor-pointer hover:text-slate-600">Lainnya</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3 py-1.5">⧸ Filter</button>
              <button className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3 py-1.5">↕ Sort By</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-2 font-bold w-8"><input type="checkbox" className="rounded" /></th>
                  <th className="py-3 px-2 font-bold">No Absen</th>
                  <th className="py-3 px-2 font-bold">Nama Lengkap</th>
                  <th className="py-3 px-2 font-bold">Kelas</th>
                  <th className="py-3 px-2 font-bold">Waktu Absen</th>
                  <th className="py-3 px-2 font-bold">Tanggal</th>
                  <th className="py-3 px-2 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.length > 0 ? records.slice(0, 5).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2"><input type="checkbox" className="rounded" /></td>
                    <td className="py-3 px-2 text-slate-500 font-medium">#{r['No Absen'] || '000'}</td>
                    <td className="py-3 px-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-lighter/50 flex items-center justify-center text-[10px]">👤</div>
                      <span className="font-bold text-slate-800">{r.Nama}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-500 font-medium">{r.Kelas || 'Umum'}</td>
                    <td className="py-3 px-2 font-bold text-slate-700">{r['Waktu Absen']}</td>
                    <td className="py-3 px-2 font-medium text-slate-500">{r.Tanggal} {r.Bulan}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-primary bg-primary-lighter/30 px-2 py-1 rounded text-[10px] font-bold">Hadir</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">Belum ada data absensi terekam.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Right Sidebar (30%) */}
      <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6">
        
        {/* Work Calendar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <h3 className="font-bold text-slate-900 text-sm">Kalender Akademik</h3>
            </div>
            <button 
              onClick={handleOpenAddEvent}
              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
            >
              <span>+ Tambah</span>
            </button>
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-6 px-2">
            {weekDates.map((item, idx) => (
              <div key={idx} className={`text-center ${item.isToday ? 'text-primary' : ''}`}>
                <div className={`mb-1 ${item.isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center mx-auto shadow-sm shadow-primary/30 font-bold' : ''}`}>{item.dateNum}</div>
                <div>{item.dayLabel}</div>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            {agendaData.academic_calendar.events.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between group py-2 border-b border-slate-50 last:border-0">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0">{event.icon}</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{event.title}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{event.type} &nbsp;&nbsp; {event.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleOpenEditEvent(event, e)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteEvent(event.id, e)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Event Add/Edit Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingEvent ? 'Edit Agenda Akademik' : 'Tambah Agenda Akademik'}
            </h3>
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Agenda</label>
                <input 
                  type="text" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="Contoh: Pembagian Rapor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipe Lokasi</label>
                  <input 
                    type="text" 
                    value={eventForm.type} 
                    onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Contoh: Ruang Kelas, Online"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Waktu</label>
                  <input 
                    type="text" 
                    value={eventForm.time} 
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="Contoh: 08:30 AM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Icon Emoji</label>
                <select 
                  value={eventForm.icon} 
                  onChange={(e) => setEventForm(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="📅">📅 Kalender</option>
                  <option value="🏫">🏫 Sekolah</option>
                  <option value="👨‍🏫">👨‍🏫 Guru</option>
                  <option value="🏢">🏢 Gedung/Kelas</option>
                  <option value="📊">📊 Rapat/Evaluasi</option>
                  <option value="📝">📝 Ujian/Penilaian</option>
                  <option value="🎉">🎉 Event/Perayaan</option>
                  <option value="🏆">🏆 Lomba/Prestasi</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEventModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/20"
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
