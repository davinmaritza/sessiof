'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import SessiofLogo from '@/components/SessiofLogo';

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

export default function StudentDashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ name: '', className: '', absentNo: '' });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [permits, setPermits] = useState<any[]>([]);
  const [settings, setSettings] = useState({ arrivalTime: '06:30', departureTime: '15:00' });

  // Permit Form States
  const [permitStatus, setPermitStatus] = useState<'Sakit' | 'Izin'>('Sakit');
  const [permitReason, setPermitReason] = useState('');
  const [isSubmittingPermit, setIsSubmittingPermit] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const logged = localStorage.getItem('sessiof_student_logged');
    const name = localStorage.getItem('sessiof_student_name');
    const className = localStorage.getItem('sessiof_student_class') || '';
    const absentNo = localStorage.getItem('sessiof_student_absent') || '';
    
    if (logged !== 'true' || !name) {
      router.replace('/login');
    } else {
      setStudentInfo({ name, className: className || '-', absentNo: absentNo || '-' });
      fetchAttendance(name);
      fetchSettings();
      fetchAnnouncements(className);
      fetchPermits(name);
    }
  }, [router]);

  const fetchAttendance = async (studentName: string) => {
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((r: any) => r.Nama === studentName && r.Status !== 'Dihapus');
        setRecords(filtered.reverse());
      }
    } catch (error) { console.error('Error fetching logs:', error); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) setSettings(await res.json());
    } catch (error) { console.error('Error fetching settings:', error); }
  };

  const fetchAnnouncements = async (className: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/announcements', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Filter for all or matches current student's class
        const filtered = data.filter((a: any) => a.class_name === 'Semua' || a.class_name === className);
        setAnnouncements(filtered);
      }
    } catch (e) {
      console.error('Gagal memuat pengumuman:', e);
    }
  };

  const fetchPermits = async (studentName: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/permits', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((p: any) => p.student_name === studentName);
        setPermits(filtered);
      }
    } catch (e) {
      console.error('Gagal memuat data izin:', e);
    }
  };

  const handlePermitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitReason.trim()) return;

    try {
      setIsSubmittingPermit(true);
      const res = await fetch('http://localhost:5000/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentInfo.name,
          class_name: studentInfo.className,
          status: permitStatus,
          reason: permitReason
        })
      });

      if (res.ok) {
        setPermitReason('');
        alert('Surat izin berhasil diajukan! Menunggu persetujuan Wali Kelas.');
        fetchPermits(studentInfo.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPermit(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = records.map(r => ({
      'Nama Siswa': r.Nama,
      'Kelas': r.Kelas || studentInfo.className,
      'No Absen': r['No Absen'] || studentInfo.absentNo,
      'Hari': r.Hari,
      'Tanggal': `${r.Tanggal} ${r.Bulan} ${r.Tahun}`,
      'Waktu Absen': r['Waktu Absen'] || '-',
      'Status': r.Status || 'Hadir'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Kehadiran');
    
    // Fit column widths
    const max_len = Math.max(...dataToExport.map(r => r['Nama Siswa'].length), 15);
    worksheet['!cols'] = [
      { wch: max_len },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 }
    ];

    XLSX.writeFile(workbook, `Laporan_Kehadiran_${studentInfo.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleLogout = () => {
    localStorage.removeItem('sessiof_student_logged');
    localStorage.removeItem('sessiof_student_name');
    localStorage.removeItem('sessiof_student_class');
    localStorage.removeItem('sessiof_student_absent');
    router.push('/login');
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f0f1a' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#7c6fe0' }}></div>
      </div>
    );
  }

  let tepatWaktu = 0, terlambat = 0, sakitIzin = 0, alpa = 0;
  records.forEach(r => {
    if (r.Status === 'Izin' || r.Status === 'Sakit') {
      sakitIzin++;
    } else if (r.Status === 'Alpa') {
      alpa++;
    } else if (r.Status === 'Terlambat') {
      terlambat++;
    } else if (r.Status === 'Hadir') {
      tepatWaktu++;
    } else if (r['Waktu Absen']) {
      if (r['Waktu Absen'] > settings.arrivalTime + ":00") terlambat++;
      else tepatWaktu++;
    }
  });
  const totalLogs = records.length;
  const totalPresent = tepatWaktu + terlambat;
  const presenceRate = totalLogs > 0 ? Math.round((totalPresent / totalLogs) * 100) : 0;

  const statItems = [
    { label: 'Tepat Waktu', value: tepatWaktu, color: '#10b981' },
    { label: 'Terlambat', value: terlambat, color: '#f97316' },
    { label: 'Izin / Sakit', value: sakitIzin, color: '#3b82f6' },
    { label: 'Alpa', value: alpa, color: '#dc4a46' },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 antialiased relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1625 40%, #0f0f1a 100%)' }}>
      
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,77,199,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-5xl w-full mx-auto space-y-6 z-10 relative flex-1">
        {/* Header */}
        <header className="flex justify-between items-center rounded-xl p-4 animate-fade-in" 
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <SessiofLogo size={36} />
            <div>
              <span className="font-semibold text-white text-[14px] block leading-tight">Sessiof</span>
              <span className="text-[11px] font-medium text-[#8a8a9a]">Portal Akses Mandiri Siswa</span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#8a8a9a] hover:text-white text-[13px] font-medium px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Keluar
          </button>
        </header>

        {/* Profile & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scale-in">
          {/* Profile */}
          <div className="rounded-xl p-5 space-y-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-[#6b6b7a] uppercase tracking-widest block">Identitas</span>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-[14px]"
                style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                {studentInfo.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-white text-[14px] leading-snug">{studentInfo.name}</h2>
                <span className="text-[11px] text-[#8a8a9a] block mt-0.5 font-medium">
                  Kelas {studentInfo.className} — Absen {studentInfo.absentNo}
                </span>
              </div>
            </div>
            <div className="rounded-lg p-3.5 space-y-2.5 text-[12px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {statItems.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#8a8a9a] font-medium">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ring */}
          <div className="rounded-xl p-5 flex flex-col items-center justify-center space-y-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-[#6b6b7a] uppercase tracking-widest">Rasio Kehadiran</span>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path strokeWidth="2.8" stroke="rgba(255,255,255,0.06)" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path strokeWidth="2.8" strokeDasharray={`${presenceRate}, 100`} strokeLinecap="round" stroke="#5b4dc7" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }} />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[24px] font-semibold text-white">{presenceRate}%</span>
                <span className="text-[9px] font-medium text-[#6b6b7a] uppercase tracking-widest">Hadir</span>
              </div>
            </div>
            <p className="text-[11px] text-[#6b6b7a] text-center font-medium">Total {totalLogs} hari tercatat</p>
          </div>

          {/* Grafik Kehadiran Pribadi */}
          <div className="rounded-xl p-5 flex flex-col justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-[#6b6b7a] uppercase tracking-widest block">Distribusi Kehadiran</span>
            <div className="space-y-3.5 my-3">
              {statItems.map((item, i) => {
                const percentage = totalLogs > 0 ? Math.round((item.value / totalLogs) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#8a8a9a] font-medium">{item.label} ({item.value}x)</span>
                      <span className="font-semibold text-white">{percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: item.color,
                          boxShadow: `0 0 8px ${item.color}80` 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-[#6b6b7a] flex justify-between items-center pt-2 border-t border-white/5">
              <span>Masuk: {settings.arrivalTime}</span>
              <span>Pulang: {settings.departureTime}</span>
            </div>
          </div>
        </div>

        {/* Announcements & Permits Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Announcements & Logs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Announcements Widget */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <h3 className="text-[14px] font-semibold text-white">Pengumuman Kelas</h3>
              </div>

              {announcements.length === 0 ? (
                <p className="text-xs text-[#6b6b7a] py-2">Belum ada pengumuman untuk kelas Anda.</p>
              ) : (
                <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="rounded-lg p-3.5 space-y-2 border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                        <span className="text-[9px] text-[#6b6b7a]">{ann.date}</span>
                      </div>
                      <p className="text-[11px] text-[#8a8a9a] leading-relaxed whitespace-pre-line">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Logs */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-white">Riwayat Kehadiran</h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: '#8a8a9a' }}>
                    {records.length} Hari
                  </span>
                </div>
                {records.length > 0 && (
                  <button 
                    onClick={exportToExcel}
                    className="text-[11px] font-bold text-white bg-primary hover:bg-primary-light transition-all px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Unduh Excel
                  </button>
                )}
              </div>
              <div className="rounded-lg overflow-hidden max-h-72 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <table className="w-full text-left text-[12px] whitespace-nowrap">
                  <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <tr>
                      <th className="py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b7a]">Tanggal</th>
                      <th className="py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b7a]">Jam Absen</th>
                      <th className="py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-center text-[#6b6b7a]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? records.map((r, idx) => {
                      const statusColor = r.Status === 'Sakit' || r.Status === 'Izin' ? '#3b82f6'
                        : r.Status === 'Alpa' ? '#dc4a46'
                        : r.Status === 'Terlambat' ? '#f97316'
                        : r.Status === 'Hadir' ? '#10b981'
                        : r['Waktu Absen'] && r['Waktu Absen'] > settings.arrivalTime + ":00" ? '#f97316'
                        : '#10b981';
                      const statusBg = r.Status === 'Sakit' || r.Status === 'Izin' ? 'rgba(59,130,246,0.1)'
                        : r.Status === 'Alpa' ? 'rgba(220,74,70,0.1)'
                        : r.Status === 'Terlambat' ? 'rgba(249,115,22,0.1)'
                        : r.Status === 'Hadir' ? 'rgba(16,185,129,0.1)'
                        : r['Waktu Absen'] && r['Waktu Absen'] > settings.arrivalTime + ":00" ? 'rgba(249,115,22,0.1)'
                        : 'rgba(16,185,129,0.1)';
                      return (
                        <tr key={idx} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-3 px-4 font-medium" style={{ color: '#b4b4c4' }}>{r.Tanggal} {r.Bulan} {r.Tahun}</td>
                          <td className="py-3 px-4 font-semibold text-white font-mono">{r['Waktu Absen'] || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold" style={{ background: statusBg, color: statusColor }}>
                              {r.Status || 'Hadir'}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-[#6b6b7a] text-[13px]">Belum ada riwayat absensi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Panel: Permits submission form */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Form Permits */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Formulir Sakit / Izin</h3>
                <p className="text-[11px] text-[#6b6b7a] mt-0.5">Kirim alasan ketidakhadiran resmi ke Wali Kelas.</p>
              </div>

              <form onSubmit={handlePermitSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#8a8a9a] uppercase">Jenis Keterangan</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="Sakit"
                        checked={permitStatus === 'Sakit'}
                        onChange={() => setPermitStatus('Sakit')}
                        className="accent-primary" 
                      />
                      <span>Sakit</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        value="Izin"
                        checked={permitStatus === 'Izin'}
                        onChange={() => setPermitStatus('Izin')}
                        className="accent-primary"
                      />
                      <span>Izin</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#8a8a9a] uppercase">Alasan Detail</label>
                  <textarea
                    required
                    rows={3}
                    value={permitReason}
                    onChange={(e) => setPermitReason(e.target.value)}
                    placeholder="Tulis alasan tidak hadir sekolah..."
                    className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#8a8a9a] uppercase block">Dokumen Lampiran (Simulasi)</label>
                  <div className="border border-dashed border-white/10 rounded-lg p-3 text-center text-[#6b6b7a] text-[11px] bg-white/[0.01]">
                    📎 surat_keterangan.pdf (Terpilih secara default)
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPermit}
                  className="w-full text-white text-[12px] font-bold py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}
                >
                  {isSubmittingPermit ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </form>
            </div>

            {/* List Permits Submitted */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-[13px] font-semibold text-white">Status Pengajuan Izin</h3>
              
              {permits.length === 0 ? (
                <p className="text-[11px] text-[#6b6b7a]">Belum ada pengajuan izin/sakit.</p>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {permits.map((p) => {
                    const isApproved = p.is_approved === 'Approved';
                    const isPending = p.is_approved === 'Pending';
                    const badgeColor = isApproved ? '#2d9d78' : isPending ? '#d97706' : '#dc4a46';
                    const badgeBg = isApproved ? 'rgba(45,157,120,0.1)' : isPending ? 'rgba(217,119,6,0.1)' : 'rgba(220,74,70,0.1)';

                    return (
                      <div key={p.id} className="border border-white/5 rounded-lg p-3 text-[11px] space-y-2 bg-white/[0.01]">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">[{p.status}] {p.date_submitted.split(' ')[0]}</span>
                          <span className="px-2 py-0.5 rounded-md font-bold text-[9px]" style={{ color: badgeColor, background: badgeBg }}>
                            {p.is_approved}
                          </span>
                        </div>
                        <p className="text-[#8a8a9a] leading-snug">Alasan: "{p.reason}"</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      <footer className="max-w-5xl w-full mx-auto px-4 py-5 flex justify-between items-center text-[11px] text-[#4a4a5a] font-medium z-10 relative mt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span>&copy; {new Date().getFullYear()} Sessiof</span>
        <span>Portal Akses Mandiri Siswa</span>
      </footer>
    </main>
  );
}
