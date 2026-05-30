'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import * as XLSX from 'xlsx';

const StudentAvatar = ({ name }: { name: string }) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
      {initials || '?'}
    </div>
  );
};

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

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [actionStatus, setActionStatus] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<AttendanceRecord[]>([]);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const fetchAttendance = async () => {
    try {
      const [resAtt, resStat] = await Promise.all([
        fetch('/api/attendance'),
        fetch('http://localhost:5000/api/status')
      ]);
      if (resAtt.ok && resStat.ok) {
        const attData = await resAtt.json();
        const statData = await resStat.json();
        setRecords(attData.reverse());
        setStudentsData(statData.students || []);
        setSelectedRecords([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Safe search & filtering to prevent crashes on empty/undefined values
  useEffect(() => {
    let rawFiltered = [...records];
    
    if (selectedDate) {
      const [year, monthNum, day] = selectedDate.split('-');
      const dateObj = new Date(selectedDate);
      const indonesianMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthStrIndo = indonesianMonths[parseInt(monthNum) - 1];
      const monthStrEn = englishMonths[parseInt(monthNum) - 1];
      
      const dayStr = String(parseInt(day));
      const dayStrZero = day;
      
      // Filter records for this date first (including 'Dihapus')
      const dateFilteredRecords = records.filter(r => 
        String(r.Tahun) === year &&
        (r.Bulan === monthStrIndo || r.Bulan === monthStrEn) &&
        (String(r.Tanggal) === dayStr || String(r.Tanggal) === dayStrZero)
      );

      // Logged names includes anyone who has a record on this date (even if Status is Dihapus)
      const loggedNames = new Set(dateFilteredRecords.map(r => r.Nama.trim().toLowerCase()));
      
      const missingRecords = studentsData
        .filter(student => !loggedNames.has(student.name.trim().toLowerCase()))
        .map(student => ({
          Nama: student.name,
          Kelas: student.class_name,
          'No Absen': student.absent_no,
          Hari: dateObj.toLocaleDateString('id-ID', { weekday: 'long' }),
          Tanggal: dayStr,
          Bulan: monthStrIndo,
          Tahun: year,
          'Waktu Absen': '-',
          Status: 'Alpa'
        }));
        
      // Show dateFilteredRecords but filter out those marked as 'Dihapus'
      const visibleDateRecords = dateFilteredRecords.filter(r => r.Status !== 'Dihapus');
      rawFiltered = [...visibleDateRecords, ...missingRecords];
    } else {
      if (selectedMonth !== 'Semua') {
        rawFiltered = rawFiltered.filter((r) => r.Bulan && r.Bulan.toString() === selectedMonth);
      }
      rawFiltered = rawFiltered.filter(r => r.Status !== 'Dihapus');
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      rawFiltered = rawFiltered.filter((r) =>
        r.Nama && r.Nama.toString().toLowerCase().includes(q)
      );
    }
    if (selectedClass !== 'Semua') {
      rawFiltered = rawFiltered.filter((r) => r.Kelas && r.Kelas.toString() === selectedClass);
    }
    
    // Sort so Hadir/Izin/Sakit are on top, Alpa on bottom
    rawFiltered.sort((a, b) => {
      if (a.Status === 'Alpa' && b.Status !== 'Alpa') return 1;
      if (a.Status !== 'Alpa' && b.Status === 'Alpa') return -1;
      return 0;
    });

    setFilteredRecords(rawFiltered);
    setCurrentPage(1); // Reset page on filter change
  }, [searchTerm, selectedMonth, selectedClass, selectedDate, records, studentsData]);

  // Calculate paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Master checkbox toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords([...paginatedRecords]);
    } else {
      setSelectedRecords([]);
    }
  };

  // Individual checkbox toggle
  const handleSelectRow = (checked: boolean, record: AttendanceRecord) => {
    if (checked) {
      setSelectedRecords([...selectedRecords, record]);
    } else {
      setSelectedRecords(selectedRecords.filter(r => !(
        r.Nama === record.Nama &&
        r.Tanggal === record.Tanggal &&
        r.Bulan === record.Bulan &&
        r.Tahun === record.Tahun &&
        r['Waktu Absen'] === record['Waktu Absen']
      )));
    }
  };

  const isRowSelected = (record: AttendanceRecord) => {
    return selectedRecords.some(r => (
      r.Nama === record.Nama &&
      r.Tanggal === record.Tanggal &&
      r.Bulan === record.Bulan &&
      r.Tahun === record.Tahun &&
      r['Waktu Absen'] === record['Waktu Absen']
    ));
  };

  // Delete handler for batch deletion
  const handleDeleteSelected = async () => {
    if (selectedRecords.length === 0) return;

    setModalConfig({
      isOpen: true,
      title: 'Hapus Log Absensi',
      message: `Apakah Anda yakin ingin menghapus ${selectedRecords.length} log absensi terpilih?`,
      onConfirm: async () => {
        closeModal();
        setActionStatus('Menghapus log absensi...');
        try {
          const res = await fetch('/api/attendance', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordsToDelete: selectedRecords })
          });
          const data = await res.json();
          if (res.ok) {
            setActionStatus(`Sukses: ${data.message} (${data.count} baris)`);
            fetchAttendance();
          } else {
            setActionStatus(`Gagal: ${data.error}`);
          }
        } catch (error) {
          setActionStatus('Gagal menghubungkan ke server API.');
        }
      }
    });
  };

  // Delete single row directly
  const handleDeleteSingle = async (record: AttendanceRecord) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Log Absensi',
      message: `Hapus log absensi untuk '${record.Nama}' pada jam ${record['Waktu Absen']}?`,
      onConfirm: async () => {
        closeModal();
        setActionStatus('Menghapus log absensi...');
        try {
          const res = await fetch('/api/attendance', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordsToDelete: [record] })
          });
          const data = await res.json();
          if (res.ok) {
            setActionStatus(`Sukses menghapus log ${record.Nama}`);
            fetchAttendance();
          } else {
            setActionStatus(`Gagal: ${data.error}`);
          }
        } catch (error) {
          setActionStatus('Gagal menghubungkan ke server API.');
        }
      }
    });
  };

  const handleStatusChange = async (record: AttendanceRecord, newStatus: string) => {
    setActionStatus(`Menyimpan status ${record.Nama}...`);
    try {
      const payload = {
        Nama: record.Nama,
        Kelas: record.Kelas,
        'No Absen': record['No Absen'],
        Hari: record.Hari,
        Tanggal: record.Tanggal,
        Bulan: record.Bulan,
        Tahun: record.Tahun,
        'Waktu Absen': record['Waktu Absen'],
        Status: newStatus
      };
      
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`Sukses: Status ${record.Nama} diubah menjadi ${newStatus}`);
        fetchAttendance();
      } else {
        setActionStatus(`Gagal: ${data.error}`);
      }
    } catch (error) {
      setActionStatus('Gagal menghubungkan ke server.');
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada log untuk diekspor!');
      return;
    }
    const headers = ['Nama', 'Kelas', 'No Absen', 'Hari', 'Tanggal', 'Bulan', 'Tahun', 'Waktu Absen'];
    const csvRows = [headers.join(',')];

    filteredRecords.forEach(r => {
      const row = [
        `"${r.Nama}"`,
        `"${r.Kelas || '-'}"`,
        `"${r['No Absen'] || '-'}"`,
        `"${r.Hari}"`,
        `"${r.Tanggal}"`,
        `"${r.Bulan}"`,
        `"${r.Tahun}"`,
        `"${r['Waktu Absen']}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sessiof_Attendance_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada log untuk diekspor!');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(filteredRecords);
    
    // Styling the column widths to be very neat
    const colWidths = [
      { wch: 28 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 12 }, // No Absen
      { wch: 12 }, // Hari
      { wch: 10 }, // Tanggal
      { wch: 15 }, // Bulan
      { wch: 10 }, // Tahun
      { wch: 15 }, // Waktu Absen
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Log Absensi');
    XLSX.writeFile(workbook, `Rekap_Absensi_Sessiof_${new Date().toISOString().split('T')[0]}.xlsx`);
  };



  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log Absensi Sekolah</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Daftar Kehadiran</h2>
        </div>
        
        <div className="flex gap-2">
          {selectedRecords.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 hover:scale-[1.01] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Hapus Terpilih ({selectedRecords.length})</span>
            </button>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button 
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Spreadsheet</span>
            </button>
          </div>
        </div>
      </div>

      {actionStatus && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3.5 text-xs font-semibold flex justify-between items-center shadow-sm animate-fade-in">
          <span>{actionStatus}</span>
          <button onClick={() => setActionStatus('')} className="text-emerald-400 hover:text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative w-full flex items-center">
          <svg className="absolute left-3.5 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.0" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari log nama siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all font-medium"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto justify-end flex-wrap">
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-600 font-bold focus:outline-none focus:border-slate-400 cursor-pointer min-w-[130px]"
            >
              <option value="Semua">Semua Kelas</option>
              {Array.from(new Set(records.map((r) => r.Kelas).filter(Boolean))).map((kelas) => (
                <option key={kelas} value={kelas}>{kelas}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-slate-400">▼</span>
          </div>

          <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Filter Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 font-bold focus:outline-none focus:ring-0 cursor-pointer px-2"
            />
            {!selectedDate && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1 text-xs text-slate-600 font-bold focus:outline-none cursor-pointer"
              >
                <option value="Semua">Semua Bulan</option>
                {Array.from(new Set(records.map((r) => r.Bulan).filter(Boolean))).map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Table Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="py-4 px-6 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-350 cursor-pointer accent-primary h-4 w-4"
                  checked={paginatedRecords.length > 0 && selectedRecords.length === paginatedRecords.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="py-4 px-4">Tanggal</th>
              <th className="py-4 px-6">Nama Siswa</th>
              <th className="py-4 px-6">Kelas</th>
              <th className="py-4 px-6">No Absen</th>
              <th className="py-4 px-6">Hari</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Waktu Absen</th>
              <th className="py-4 px-6 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-semibold">
                  Belum ada log absensi yang cocok.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record, index) => {
                const isSelected = isRowSelected(record);
                return (
                  <tr key={index} className={`hover:bg-slate-50/50 transition-all text-xs text-slate-700 ${isSelected ? 'bg-slate-50/30' : ''}`}>
                    <td className="py-4 px-6 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-350 cursor-pointer accent-primary h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(e.target.checked, record)}
                      />
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-400">{record.Tanggal}/{record.Bulan.substring(0,3)}</td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={record.Nama} />
                        <span>{record.Nama}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{record.Kelas || '-'}</td>
                    <td className="py-4 px-6 font-mono font-semibold">{record['No Absen'] || '-'}</td>
                    <td className="py-4 px-6">{record.Hari}</td>
                    <td className="py-4 px-6">
                      <select 
                        value={record.Status || 'Hadir'}
                        onChange={(e) => handleStatusChange(record, e.target.value)}
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer border outline-none appearance-none text-center
                          ${(record.Status || 'Hadir') === 'Hadir' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 
                            (record.Status === 'Alpa' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 
                            (record.Status === 'Izin' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 
                            'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'))}`}
                      >
                        <option value="Hadir">Hadir</option>
                        <option value="Alpa">Alpa</option>
                        <option value="Izin">Izin</option>
                        <option value="Sakit">Sakit</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{record['Waktu Absen']}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteSingle(record)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50 flex items-center justify-center mx-auto"
                        title="Hapus log baris ini"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between items-center text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-3">
            <span>Tampilkan:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              {[10, 20, 25, 30, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal {...modalConfig} onCancel={closeModal} />
    </div>
  );
}
