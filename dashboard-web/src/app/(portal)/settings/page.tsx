'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    arrivalTime: '06:30',
    departureTime: '15:00',
    desktopNotifications: false,
    darkMode: false,
    autoBackup: false,
    livenessEnabled: true,
    livenessThreshold: 50,
    gracePeriod: 0,
    whatsappNotificationsEnabled: true,
    webhookEnabled: false,
    webhookUrl: ''
  });
  const [status, setStatus] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/audit-logs');
      if (res.ok) setAuditLogs(await res.json());
    } catch (e) {
      console.error('Gagal memuat log audit:', e);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error(err));

    fetchAuditLogs();
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
        window.dispatchEvent(new Event('settings-updated'));
        
        // Log audit for updating settings
        const adminName = localStorage.getItem('sessiof_user_name') || 'Admin';
        await fetch('http://localhost:5000/api/audit-logs', {
          method: 'GET' # Just refresh logs after save
        });
        
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus('❌ Gagal menyimpan pengaturan.');
      }
    } catch (error) {
      setStatus('❌ Gagal menghubungi server.');
    }
  };

  const handleTestWebhook = async () => {
    if (!settings.webhookUrl.trim()) {
      setWebhookTestStatus('❌ URL Webhook wajib diisi!');
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestStatus('Mengirim payload uji coba...');
    try {
      const res = await fetch('http://localhost:5000/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookTestStatus(`✅ ${data.message}`);
      } else {
        setWebhookTestStatus(`❌ ${data.error || 'Gagal mengirim webhook.'}`);
      }
    } catch (e) {
      setWebhookTestStatus('❌ Gagal menghubungi server.');
    } finally {
      setIsTestingWebhook(false);
      setTimeout(() => setWebhookTestStatus(''), 6000);
    }
  };

  const handleClearAuditLogs = async () => {
    setConfirmClearOpen(false);
    try {
      const adminName = localStorage.getItem('sessiof_user_name') || 'Admin';
      const res = await fetch('http://localhost:5000/api/audit-logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: adminName })
      });
      if (res.ok) {
        fetchAuditLogs();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Log audit berhasil dikosongkan.', type: 'success' } }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admin Panel</span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Pengaturan (Settings)</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-8">

        {/* Pengaturan Waktu Absensi */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2 mb-4">Pengaturan Waktu Absensi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-4">
              <label className="font-bold text-slate-900 dark:text-white text-xs block mb-1">Batas Jam Kedatangan (Tepat Waktu)</label>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mb-3">Siswa yang hadir setelah jam ini akan dihitung Terlambat.</p>
              <input
                type="time"
                value={settings.arrivalTime}
                onChange={(e) => handleChange('arrivalTime', e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-4">
              <label className="font-bold text-slate-900 dark:text-white text-xs block mb-1">Toleransi Keterlambatan (Menit)</label>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mb-3">Batas toleransi tambahan setelah batas kedatangan.</p>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.gracePeriod}
                onChange={(e) => handleChange('gracePeriod', parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-4">
              <label className="font-bold text-slate-900 dark:text-white text-xs block mb-1">Batas Jam Kepulangan</label>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mb-3">Jam minimal siswa diizinkan pulang.</p>
              <input
                type="time"
                value={settings.departureTime}
                onChange={(e) => handleChange('departureTime', e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Pengaturan Sistem */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2 mb-4">Pengaturan Sistem</h3>
          <div className="space-y-4">
            <div
              onClick={() => handleChange('desktopNotifications', !settings.desktopNotifications)}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Notifikasi Desktop</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Aktifkan peringatan untuk absensi baru</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.desktopNotifications ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.desktopNotifications ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div
              onClick={() => handleChange('darkMode', !settings.darkMode)}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Tampilan Mode Gelap</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Ubah tema antarmuka ke mode malam</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.darkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.darkMode ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div
              onClick={() => handleChange('livenessEnabled', !settings.livenessEnabled)}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Verifikasi Liveness (Anti-Spoofing)</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Mencegah manipulasi absensi menggunakan foto/layar HP</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.livenessEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.livenessEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            {settings.livenessEnabled && (
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">Sensitivitas Liveness (Threshold Laplacian)</h4>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{settings.livenessThreshold}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Nilai lebih tinggi mendeteksi kejelasan wajah secara lebih ketat untuk menghindari cetakan foto kertas.</p>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={settings.livenessThreshold}
                  onChange={(e) => handleChange('livenessThreshold', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}

            <div
              onClick={() => handleChange('autoBackup', !settings.autoBackup)}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Otomatisasi Backup Data</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Lakukan backup otomatis mingguan</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.autoBackup ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.autoBackup ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div
              onClick={() => handleChange('whatsappNotificationsEnabled', !settings.whatsappNotificationsEnabled)}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl hover:bg-slate-100/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Notifikasi WhatsApp Orang Tua</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Kirim pesan WhatsApp otomatis ke orang tua ketika absensi terekam</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.whatsappNotificationsEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.whatsappNotificationsEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrasi Webhook */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2 mb-4">📡 Integrasi Webhook (Real-time API)</h3>
          <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Aktifkan Integrasi Webhook</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">Kirim data kehadiran siswa secara otomatis ke server eksternal saat terdeteksi</p>
              </div>
              <button 
                type="button"
                onClick={() => handleChange('webhookEnabled', !settings.webhookEnabled)}
                className={`w-10 h-5 rounded-full relative shadow-inner transition-colors ${settings.webhookEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.webhookEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
              </button>
            </div>

            {settings.webhookEnabled && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">URL Target Webhook</label>
                  <input
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => handleChange('webhookUrl', e.target.value)}
                    placeholder="https://server-anda.com/api/attendance-webhook"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook || !settings.webhookUrl}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🚀 {isTestingWebhook ? 'Mengirim...' : 'Uji Coba Kirim Webhook'}
                  </button>
                  {webhookTestStatus && (
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">{webhookTestStatus}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Aktivitas Admin */}
        <div>
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">🔍 Audit Log Aktivitas Sistem</h3>
            {auditLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-md transition-colors"
              >
                Clear Logs
              </button>
            )}
          </div>
          <div className="border border-slate-200/60 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-zinc-800/10">
            <div className="max-h-[300px] overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              {auditLogs.length > 0 ? (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-3 text-xs border-b border-slate-100 dark:border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                    <span className="text-slate-400 dark:text-zinc-500 font-medium shrink-0 w-32 font-mono">{log.timestamp}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">{log.action}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-md">@{log.user}</span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">IP: {log.ip}</span>
                      </div>
                      <p className="text-slate-500 dark:text-zinc-400 text-[11px] mt-1 font-medium leading-relaxed">{log.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">Belum ada aktivitas administratif tercatat.</div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            onClick={handleSave}
            className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Simpan Pengaturan
          </button>
          {status && <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 animate-fade-in">{status}</span>}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmClearOpen}
        title="Bersihkan Audit Log"
        message="Apakah Anda yakin ingin menghapus semua catatan aktivitas log audit? Tindakan ini permanen."
        confirmText="Hapus Semua"
        cancelText="Batal"
        confirmStyle="danger"
        onConfirm={handleClearAuditLogs}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
