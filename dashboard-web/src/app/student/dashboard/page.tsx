'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

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
  const [settings, setSettings] = useState({ arrivalTime: '06:30', departureTime: '15:00' });

  useEffect(() => {
    setIsMounted(true);
    const logged = localStorage.getItem('sessiof_student_logged');
    const name = localStorage.getItem('sessiof_student_name');
    const className = localStorage.getItem('sessiof_student_class');
    const absentNo = localStorage.getItem('sessiof_student_absent');
    if (logged !== 'true' || !name) {
      router.replace('/login');
    } else {
      setStudentInfo({ name, className: className || '-', absentNo: absentNo || '-' });
      fetchAttendance(name);
      fetchSettings();
    }
  }, [router]);

  const fetchAttendance = async (studentName: string) => {
    try {
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((r: any) => r.Nama === studentName && r.Status !== 'Dihapus');
        setRecords(filtered.reverse());
      }
    } catch (error) { console.error('Error fetching logs:', error); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch (error) { console.error('Error fetching settings:', error); }
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
    if (r.Status === 'Izin' || r.Status === 'Sakit') sakitIzin++;
    else if (r.Status === 'Alpa') alpa++;
    else if (r['Waktu Absen']) {
      if (r['Waktu Absen'] > settings.arrivalTime + ":00") terlambat++;
      else tepatWaktu++;
    }
  });
  const totalLogs = records.length;
  const totalPresent = tepatWaktu + terlambat;
  const presenceRate = totalLogs > 0 ? Math.round((totalPresent / totalLogs) * 100) : 0;

  const statItems = [
    { label: 'Tepat Waktu', value: tepatWaktu, color: '#2d9d78' },
    { label: 'Terlambat', value: terlambat, color: '#d97706' },
    { label: 'Izin / Sakit', value: sakitIzin, color: '#3b82f6' },
    { label: 'Alpa', value: alpa, color: '#dc4a46' },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 antialiased relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1625 40%, #0f0f1a 100%)' }}>
      
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,77,199,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-4xl w-full mx-auto space-y-5 z-10 relative flex-1">
        {/* Header */}
        <header className="flex justify-between items-center rounded-xl p-4" 
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-white text-[14px] block leading-tight">Sessiof</span>
              <span className="text-[11px] font-medium text-[#8a8a9a]">Portal Siswa</span>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#8a8a9a] hover:text-white text-[13px] font-medium px-3.5 py-2 rounded-lg transition-all flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Keluar
          </button>
        </header>

        {/* Profile & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Profile */}
          <div className="rounded-xl p-5 space-y-5 animate-slide-up"
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
          <div className="rounded-xl p-5 flex flex-col items-center justify-center space-y-3 animate-slide-up stagger-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-[#6b6b7a] uppercase tracking-widest">Kehadiran</span>
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

          {/* Rules */}
          <div className="rounded-xl p-5 flex flex-col justify-between animate-slide-up stagger-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-[#6b6b7a] uppercase tracking-widest block">Aturan</span>
            <div className="space-y-4 my-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(91,77,199,0.12)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="#7c6fe0" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[12px] font-medium text-white">Batas Tepat Waktu</h4>
                  <p className="text-[11px] text-[#6b6b7a] mt-0.5">Sebelum pukul {settings.arrivalTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(91,77,199,0.12)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="#7c6fe0" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-[12px] font-medium text-white">Batas Pulang</h4>
                  <p className="text-[11px] text-[#6b6b7a] mt-0.5">Setelah pukul {settings.departureTime}</p>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-[#4a4a5a] font-medium block text-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              Ketentuan Absensi Sessiof
            </span>
          </div>
        </div>

        {/* Logs */}
        <div className="rounded-xl p-5 space-y-4 animate-slide-up stagger-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-white">Riwayat Presensi</h3>
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
                    : r['Waktu Absen'] && r['Waktu Absen'] > settings.arrivalTime + ":00" ? '#d97706'
                    : '#2d9d78';
                  const statusBg = r.Status === 'Sakit' || r.Status === 'Izin' ? 'rgba(59,130,246,0.1)'
                    : r.Status === 'Alpa' ? 'rgba(220,74,70,0.1)'
                    : r['Waktu Absen'] && r['Waktu Absen'] > settings.arrivalTime + ":00" ? 'rgba(217,119,6,0.1)'
                    : 'rgba(45,157,120,0.1)';
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

      <footer className="max-w-4xl w-full mx-auto px-4 py-5 flex justify-between items-center text-[11px] text-[#4a4a5a] font-medium z-10 relative mt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span>&copy; {new Date().getFullYear()} Sessiof</span>
        <span>Portal Akses Mandiri Siswa</span>
      </footer>
    </main>
  );
}
