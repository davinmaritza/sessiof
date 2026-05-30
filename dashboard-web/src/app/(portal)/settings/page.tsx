'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    arrivalTime: '06:30',
    departureTime: '15:00',
    desktopNotifications: false,
    darkMode: false,
    autoBackup: false
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setStatus('Menyimpan pengaturan...');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setStatus('✅ Pengaturan berhasil disimpan!');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus('❌ Gagal menyimpan pengaturan.');
      }
    } catch (error) {
      setStatus('❌ Gagal menghubungi server.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admin Panel</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Pengaturan (Settings)</h2>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-8">
        
        {/* Pengaturan Waktu Absensi */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Pengaturan Waktu Absensi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <label className="font-bold text-slate-900 text-xs block mb-1">Batas Jam Kedatangan (Tepat Waktu)</label>
              <p className="text-[10px] text-slate-500 font-medium mb-3">Siswa yang hadir setelah jam ini akan dihitung Terlambat.</p>
              <input 
                type="time" 
                value={settings.arrivalTime}
                onChange={(e) => handleChange('arrivalTime', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <label className="font-bold text-slate-900 text-xs block mb-1">Batas Jam Kepulangan</label>
              <p className="text-[10px] text-slate-500 font-medium mb-3">Jam minimal siswa diizinkan pulang.</p>
              <input 
                type="time" 
                value={settings.departureTime}
                onChange={(e) => handleChange('departureTime', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Pengaturan Sistem */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Pengaturan Sistem</h3>
          <div className="space-y-4">
            <div 
              onClick={() => handleChange('desktopNotifications', !settings.desktopNotifications)}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Notifikasi Desktop</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Aktifkan peringatan untuk absensi baru</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.desktopNotifications ? 'bg-primary' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.desktopNotifications ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div 
              onClick={() => handleChange('darkMode', !settings.darkMode)}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Tampilan Mode Gelap</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Ubah tema antarmuka ke mode malam</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.darkMode ? 'bg-primary' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.darkMode ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>
            
            <div 
              onClick={() => handleChange('autoBackup', !settings.autoBackup)}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Otomatisasi Backup Data</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Lakukan backup otomatis mingguan</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.autoBackup ? 'bg-primary' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.autoBackup ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            Simpan Pengaturan
          </button>
          {status && <span className="text-xs font-bold text-slate-600 animate-fade-in">{status}</span>}
        </div>
      </div>
    </div>
  );
}
