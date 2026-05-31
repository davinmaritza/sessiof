'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ClassItem {
  name: string;
  student_count: number;
}

interface Student {
  name: string;
  class_name: string;
  absent_no: string;
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

export default function StatistikKelasPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState({ arrivalTime: '07:00' });
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin');
  const [userClass, setUserClass] = useState('');

  // Month list helper
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const englishMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    // Default to current month and year
    const d = new Date();
    const currentMonthNum = d.getMonth();
    setSelectedMonth(indonesianMonths[currentMonthNum]);
    setSelectedYear(String(d.getFullYear()));

    const role = localStorage.getItem('sessiof_user_role') || 'admin';
    const ucls = localStorage.getItem('sessiof_user_class') || '';
    setUserRole(role);
    setUserClass(ucls);
    if (role === 'guru' && ucls) {
      setSelectedClass(ucls);
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [resCls, resStat, resAtt, resSet] = await Promise.all([
          fetch('http://localhost:5000/api/classes', { cache: 'no-store' }),
          fetch('http://localhost:5000/api/status', { cache: 'no-store' }),
          fetch('/api/attendance', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' })
        ]);

        if (resCls.ok) setClasses(await resCls.json());
        if (resStat.ok) {
          const data = await resStat.json();
          setStudents(data.students || []);
        }
        if (resAtt.ok) setAttendance(await resAtt.json());
        if (resSet.ok) setSettings(await resSet.json());
      } catch (error) {
        console.error('Gagal mengambil data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter students based on selected class
  const filteredStudents = selectedClass === 'Semua' 
    ? students 
    : students.filter(s => s.class_name === selectedClass);

  // Filter records for selected month & year and not deleted
  const monthlyRecords = attendance.filter(r => {
    const recordMonth = r.Bulan ? r.Bulan.toString().trim() : '';
    const recordYear = r.Tahun ? r.Tahun.toString().trim() : '';
    
    // Check if month matches either English or Indonesian name
    const monthIndex = indonesianMonths.indexOf(selectedMonth);
    const matchesMonth = recordMonth.toLowerCase() === selectedMonth.toLowerCase() || 
                         (monthIndex >= 0 && recordMonth.toLowerCase() === englishMonths[monthIndex].toLowerCase());
    
    const matchesYear = recordYear === selectedYear;
    const isNotDeleted = r.Status !== 'Dihapus';

    return matchesMonth && matchesYear && isNotDeleted;
  });

  // Calculate unique "effective school days" (days with any attendance logs in selected month)
  const schoolDays = Array.from(new Set(
    monthlyRecords.map(r => String(r.Tanggal))
  )).sort((a, b) => parseInt(a) - parseInt(b));

  // Compute student-by-student aggregates
  const studentStats = filteredStudents.map(student => {
    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    // Look at logs for each school day
    schoolDays.forEach(day => {
      const dayRecord = monthlyRecords.find(r => 
        r.Nama.trim().toLowerCase() === student.name.trim().toLowerCase() && 
        String(r.Tanggal) === day
      );

      if (dayRecord) {
        const status = dayRecord.Status || 'Hadir';
        if (status === 'Sakit') {
          sakit++;
        } else if (status === 'Izin') {
          izin++;
        } else if (status === 'Alpa') {
          alpa++;
        } else {
          // It's Hadir
          hadir++;
          const time = dayRecord['Waktu Absen'];
          if (time && time !== '-' && time > settings.arrivalTime + ':00') {
            terlambat++;
          }
        }
      } else {
        // No record for this school day means Alpa
        alpa++;
      }
    });

    const totalDays = schoolDays.length;
    const totalPresent = hadir; // includes terlambat
    const rate = totalDays > 0 ? Math.round(((totalPresent - (alpa * 0.5)) / totalDays) * 100) : 100;
    const finalRate = Math.max(0, Math.min(100, rate)); // bound between 0 and 100

    return {
      ...student,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      rate: finalRate
    };
  }).sort((a, b) => parseInt(a.absent_no) - parseInt(b.absent_no));

  // Search filtered student stats
  const searchedStudentStats = studentStats.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.absent_no.includes(searchQuery)
  );

  // Calculate class aggregates
  const totalStudents = studentStats.length;
  const avgPresence = totalStudents > 0 
    ? Math.round(studentStats.reduce((sum, s) => sum + s.rate, 0) / totalStudents)
    : 0;

  const totalHadir = studentStats.reduce((sum, s) => sum + s.hadir, 0);
  const totalTerlambat = studentStats.reduce((sum, s) => sum + s.terlambat, 0);
  const totalSakitIzin = studentStats.reduce((sum, s) => sum + s.sakit + s.izin, 0);
  const totalAlpa = studentStats.reduce((sum, s) => sum + s.alpa, 0);

  // List of students with warning (attendance rate < 85%)
  const warningStudents = studentStats.filter(s => s.rate < 85);

  // Daily attendance trend calculation
  const dailyData = schoolDays.map(day => {
    const presentCount = studentStats.filter(s => {
      const dayRecord = monthlyRecords.find(r => 
        r.Nama.trim().toLowerCase() === s.name.trim().toLowerCase() && 
        String(r.Tanggal) === day
      );
      if (dayRecord) {
        const status = dayRecord.Status || 'Hadir';
        return status !== 'Alpa' && status !== 'Sakit' && status !== 'Izin';
      }
      return false;
    }).length;
    
    return {
      day: `${day}`,
      present: presentCount
    };
  });

  const chartHeight = 80;
  const chartWidth = 600;
  const maxPresent = totalStudents || 1;
  const points = dailyData.map((d, index) => {
    const x = dailyData.length > 1 ? (index / (dailyData.length - 1)) * chartWidth : 0;
    const y = chartHeight - (d.present / maxPresent) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // PDF Generation Function
  const handleDownloadPDF = () => {
    if (selectedClass === 'Semua') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Silakan pilih salah satu kelas spesifik terlebih dahulu untuk mencetak laporan bulanan!', type: 'error' } }));
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. School Header Kop
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LAPORAN BULANAN PRESENSI KEHADIRAN SISWA', 105, 20, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistem Presensi Wajah Pintar — Sessiof', 105, 25, { align: 'center' });
    
    // Draw horizontal divider line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(15, 28, 195, 28);

    // 2. Report Metadata Info
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Kelas: ${selectedClass}`, 15, 36);
    doc.text(`Bulan: ${selectedMonth} ${selectedYear}`, 15, 41);
    doc.text(`Hari Efektif: ${schoolDays.length} Hari`, 15, 46);

    doc.setFont('Helvetica', 'normal');
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`Tanggal Cetak: ${todayStr}`, 195, 36, { align: 'right' });
    doc.text('Wali Kelas: __________________', 195, 41, { align: 'right' });

    // 3. Main Data Table
    const tableHeaders = [['No', 'No Absen', 'Nama Siswa', 'Hadir', 'Terlambat', 'Sakit/Izin', 'Alpa', 'Rasio (%)']];
    const tableData = studentStats.map((s, idx) => [
      idx + 1,
      s.absent_no,
      s.name,
      s.hadir - s.terlambat, // Tepat waktu saja
      s.terlambat,
      s.sakit + s.izin,
      s.alpa,
      `${s.rate}%`
    ]);

    autoTable(doc, {
      startY: 52,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [91, 77, 199], // primary theme color (#5b4dc7)
        textColor: 255,
        fontSize: 9,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 65 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 18, halign: 'center' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      margin: { left: 15, right: 15 }
    });

    // 4. Signatures Area at the bottom
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    const pageHeight = doc.internal.pageSize.height;

    // Check if there is enough space for signatures, otherwise add a new page
    let sigY = finalY + 20;
    if (sigY + 30 > pageHeight) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Mengetahui,', 30, sigY);
    doc.text('Kepala Sekolah', 30, sigY + 5);
    doc.text('( ______________________ )', 30, sigY + 30);

    doc.text('Kota Jakarta, __________________', 140, sigY);
    doc.text('Wali Kelas', 140, sigY + 5);
    doc.text('( ______________________ )', 140, sigY + 30);

    // Save/Download PDF file
    doc.save(`Laporan_Absensi_${selectedClass}_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Excel Generation Function
  const handleDownloadExcel = () => {
    if (selectedClass === 'Semua') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Silakan pilih salah satu kelas spesifik terlebih dahulu untuk mencetak laporan bulanan!', type: 'error' } }));
      return;
    }

    // Format data for Excel export
    const dataToExport = studentStats.map((s, idx) => ({
      'No': idx + 1,
      'No Absen': s.absent_no,
      'Nama Siswa': s.name,
      'Kelas': s.class_name,
      'Hadir (Tepat Waktu)': s.hadir - s.terlambat,
      'Terlambat': s.terlambat,
      'Sakit': s.sakit,
      'Izin': s.izin,
      'Alpa': s.alpa,
      'Rasio Kehadiran (%)': `${s.rate}%`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-fit columns
    const max_len = dataToExport.reduce((acc, row) => {
      Object.keys(row).forEach((key, col_idx) => {
        const val = row[key as keyof typeof row]?.toString() || '';
        acc[col_idx] = Math.max(acc[col_idx] || 0, val.length, key.length);
      });
      return acc;
    }, [] as number[]);
    worksheet['!cols'] = max_len.map(len => ({ wch: len + 3 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Presensi Kelas');
    
    XLSX.writeFile(workbook, `Laporan_Absensi_${selectedClass}_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handleDownloadAllClassesPDF = () => {
    const allClasses = classes.map(c => c.name).filter(name => name !== 'Semua');
    if (allClasses.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Tidak ada data kelas untuk diekspor!', type: 'error' } }));
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    allClasses.forEach((clsName, pageIdx) => {
      if (pageIdx > 0) doc.addPage();

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LAPORAN RINGKASAN PRESENSI KEHADIRAN SISWA', 105, 20, { align: 'center' });
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Sistem Presensi Wajah Pintar — Sessiof', 105, 25, { align: 'center' });
      
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(15, 28, 195, 28);

      const classStudents = students.filter(s => s.class_name === clsName);
      
      const classStats = classStudents.map(student => {
        let hadir = 0, terlambat = 0, sakit = 0, izin = 0, alpa = 0;
        
        schoolDays.forEach(day => {
          const dayRecord = monthlyRecords.find(r => 
            r.Nama.trim().toLowerCase() === student.name.trim().toLowerCase() && 
            String(r.Tanggal) === day
          );
          if (dayRecord) {
            const status = dayRecord.Status || 'Hadir';
            if (status === 'Sakit') sakit++;
            else if (status === 'Izin') izin++;
            else if (status === 'Alpa') alpa++;
            else {
              hadir++;
              const time = dayRecord['Waktu Absen'];
              if (time && time !== '-' && time > settings.arrivalTime + ':00') terlambat++;
            }
          } else {
            alpa++;
          }
        });

        const totalDays = schoolDays.length;
        const rate = totalDays > 0 ? Math.round(((hadir - (alpa * 0.5)) / totalDays) * 100) : 100;
        const finalRate = Math.max(0, Math.min(100, rate));

        return { ...student, hadir, terlambat, sakit, izin, alpa, rate: finalRate };
      }).sort((a, b) => parseInt(a.absent_no) - parseInt(b.absent_no));

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Kelas: ${clsName}`, 15, 36);
      doc.text(`Bulan: ${selectedMonth} ${selectedYear}`, 15, 41);
      doc.text(`Hari Efektif: ${schoolDays.length} Hari`, 15, 46);

      const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFont('Helvetica', 'normal');
      doc.text(`Tanggal Cetak: ${todayStr}`, 140, 36);

      const tableHeaders = [['No', 'No Absen', 'Nama Siswa', 'Hadir', 'Terlambat', 'Sakit/Izin', 'Alpa', 'Rasio (%)']];
      const tableRows = classStats.map((s, idx) => [
        idx + 1,
        s.absent_no,
        s.name,
        s.hadir - s.terlambat,
        s.terlambat,
        s.sakit + s.izin,
        s.alpa,
        `${s.rate}%`
      ]);

      autoTable(doc, {
        startY: 52,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [91, 77, 199] },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 65 },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 18, halign: 'center' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      const sigY = Math.min(235, finalY + 12);
      
      doc.setFontSize(9);
      doc.text('Kepala Sekolah', 30, sigY + 5);
      doc.text('( ______________________ )', 30, sigY + 25);
      
      doc.text('Wali Kelas', 140, sigY + 5);
      doc.text('( ______________________ )', 140, sigY + 25);
    });

    doc.save(`Laporan_Rekap_Semua_Kelas_${selectedMonth}_${selectedYear}.pdf`);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Laporan PDF semua kelas berhasil diunduh!', type: 'success' } }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Portal Statistik Khusus Wali Kelas</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Analisis Kelas & Laporan</h2>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Class Select */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={userRole === 'guru' && !!userClass}
              className="appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 cursor-pointer min-w-[130px] focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {userRole === 'guru' && !!userClass ? (
                <option value={userClass}>{userClass}</option>
              ) : (
                <>
                  <option value="Semua">Semua Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.name} value={cls.name}>{cls.name}</option>
                  ))}
                </>
              )}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
          </div>

          {/* Month Select */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 cursor-pointer min-w-[130px]"
            >
              {indonesianMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
          </div>

          {/* Year Select */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 cursor-pointer min-w-[100px]"
            >
              {Array.from(new Set(attendance.map(r => String(r.Tahun)).filter(Boolean))).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">▼</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 animate-scale-in">
          
          {/* Main Grid: Metrik & Circular Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Circular Progress & Aggregates */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 hover:shadow-md transition-all duration-300">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Rata-Rata Kehadiran Kelas</span>
                <p className="text-xs text-slate-400 mt-1">Target Kurikulum Minimal 90%</p>
              </div>

              <div className="relative flex items-center justify-center">
                {/* SVG Radial Progress */}
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="58" stroke="var(--bg-element)" strokeWidth="10" fill="transparent" />
                  <circle 
                    cx="72" 
                    cy="72" 
                    r="58" 
                    stroke="var(--primary)" 
                    strokeWidth="10" 
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - avgPresence / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{avgPresence}%</span>
                  <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full mt-1 border border-emerald-500/10">Kehadiran</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100 dark:border-zinc-800">
                <div className="text-center">
                  <span className="text-[9px] text-slate-400 block">Hari Efektif</span>
                  <span className="font-extrabold text-slate-900 dark:text-white mt-0.5 block">{schoolDays.length} Hari</span>
                </div>
                <div className="text-center border-l border-slate-100 dark:border-zinc-800">
                  <span className="text-[9px] text-slate-400 block">Total Siswa</span>
                  <span className="font-extrabold text-slate-900 dark:text-white mt-0.5 block">{totalStudents} Siswa</span>
                </div>
              </div>
            </div>

            {/* Metrik Cards Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Scan Hadir Card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Scan Hadir</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">{totalHadir} kali</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400">
                  <span>Siswa terdeteksi hadir secara fisik bulan ini.</span>
                </div>
              </div>

              {/* Terlambat Card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-24 h-24 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Terlambat Akumulatif</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">{totalTerlambat} kali</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400">
                  <span>Melampaui batas kedatangan pukul <strong className="font-bold text-slate-700 dark:text-zinc-300">{settings.arrivalTime}</strong>.</span>
                </div>
              </div>

              {/* Sakit/Izin Card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Sakit / Izin</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">{totalSakitIzin} kali</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400">
                  <span>Berdasarkan verifikasi surat resmi wali kelas.</span>
                </div>
              </div>

              {/* Alpa Card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-24 h-24 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Alpa Akumulatif</span>
                    <span className="text-2xl font-black text-red-500 dark:text-red-400 tracking-tight mt-0.5 block">{totalAlpa} kali</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400">
                  <span>Tidak terdeteksi presensi & tanpa alasan sah.</span>
                </div>
              </div>

            </div>
          </div>

          {/* Daily Attendance Trend Graph */}
          {schoolDays.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tren Kehadiran Harian Kelas</h3>
                <p className="text-xs text-slate-400 mt-1">Grafik jumlah siswa hadir per hari efektif belajar pada bulan {selectedMonth}.</p>
              </div>

              <div className="pt-2">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32 text-primary overflow-visible">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="var(--bg-element)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--bg-element)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--bg-element)" strokeWidth="1" />
                  
                  {/* Area under the line */}
                  {points && (
                    <polygon
                      points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                      fill="url(#chartGrad)"
                    />
                  )}
                  {/* The Line */}
                  {points && (
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      points={points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {/* Data Points */}
                  {dailyData.map((d, index) => {
                    const x = dailyData.length > 1 ? (index / (dailyData.length - 1)) * chartWidth : 0;
                    const y = chartHeight - (d.present / maxPresent) * chartHeight;
                    return (
                      <g key={index} className="group/point">
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          className="fill-white dark:fill-zinc-900 stroke-primary stroke-2 cursor-pointer hover:r-6 transition-all"
                        />
                        <title>{`Tanggal ${d.day}: ${d.present} Siswa Hadir`}</title>
                      </g>
                    );
                  })}
                </svg>
                {/* X-Axis Labels */}
                <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-3 border-t border-slate-100 dark:border-zinc-800 mt-2">
                  <span>Awal Bulan</span>
                  <span>Tengah Bulan</span>
                  <span>Akhir Bulan</span>
                </div>
              </div>
            </div>
          )}

          {/* Export & Actions Section */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition-all duration-300">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ekspor Laporan Bulanan Resmi</h3>
              <p className="text-xs text-slate-400 mt-1">Unduh spreadsheet Excel atau PDF bertanda tangan untuk diserahkan ke Kepala Sekolah.</p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center">
              {/* PDF All Classes Button */}
              {selectedClass === 'Semua' && (
                <button
                  onClick={handleDownloadAllClassesPDF}
                  disabled={classes.filter(c => c.name !== 'Semua').length === 0}
                  className="w-full sm:w-auto bg-purple-650 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border border-purple-700/10"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>Cetak Laporan Semua Kelas</span>
                </button>
              )}

              {/* PDF Button */}
              <button
                onClick={handleDownloadPDF}
                disabled={selectedClass === 'Semua' || studentStats.length === 0}
                className="w-full sm:w-auto bg-red-650 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border border-red-700/10"
                style={{ backgroundColor: 'var(--accent-danger)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>Cetak Laporan PDF</span>
              </button>

              {/* Excel Button */}
              <button
                onClick={handleDownloadExcel}
                disabled={selectedClass === 'Semua' || studentStats.length === 0}
                className="w-full sm:w-auto bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border border-emerald-700/10"
                style={{ backgroundColor: 'var(--accent-success)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5L2.1 14c-.118.99.743 1.8 1.737 1.8h3.336M3.75 3h15M21 21H3.75m16.5-18v11.25a2.25 2.25 0 01-2.25 2.25h-2.25m4.5-13.5h-4.5" />
                </svg>
                <span>Cetak Laporan Excel</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Student Stats Roster Table */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rapor Kehadiran Siswa</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rekap kehadiran siswa di kelas {selectedClass} sepanjang bulan {selectedMonth}</p>
                </div>

                {/* Search Bar inside Card */}
                <div className="relative w-full sm:w-auto">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full sm:w-60 text-xs pl-8.5 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-950 font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-950/50 border-b border-slate-150 dark:border-zinc-800 text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">Absen</th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4 text-center">Hadir</th>
                      <th className="py-3.5 px-4 text-center">Terlambat</th>
                      <th className="py-3.5 px-4 text-center">Sakit/Izin</th>
                      <th className="py-3.5 px-4 text-center">Alpa</th>
                      <th className="py-3.5 px-4 text-center">Rasio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/85">
                    {searchedStudentStats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">Tidak ada data siswa untuk kelas ini.</td>
                      </tr>
                    ) : (
                      searchedStudentStats.map((s) => (
                        <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 dark:text-zinc-500">{s.absent_no}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-zinc-200">{s.name}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-zinc-300">{s.hadir - s.terlambat}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-500">{s.terlambat}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-blue-500">{s.sakit + s.izin}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-red-500 dark:text-red-400">{s.alpa}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border
                              ${s.rate >= 90 
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' 
                                : s.rate >= 80 
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' 
                                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'}`}>
                              {s.rate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning Sidebar (Right) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perhatian Wali Kelas ⚠️</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Siswa dengan rasio kehadiran kritis di bawah 85% bulan ini</p>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {warningStudents.length === 0 ? (
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 text-center py-8 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-xl">
                      🎉 Luar biasa! Seluruh kehadiran siswa terpantau aman bulan ini.
                    </div>
                  ) : (
                    warningStudents.map((s) => (
                      <div key={s.name} className="flex justify-between items-center bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20 rounded-xl p-3.5 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{s.name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold block mt-0.5">Absen {s.absent_no} | Alpa: {s.alpa} hari</p>
                        </div>
                        <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-200/20 shrink-0">
                          {s.rate}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

