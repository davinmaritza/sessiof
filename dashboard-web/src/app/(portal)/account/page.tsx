'use client';

import { useState, useEffect } from 'react';

export default function AccountManagementPage() {
  const [account, setAccount] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/account')
      .then(res => res.json())
      .then(data => {
        setAccount(prev => ({
          ...prev,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || ''
        }));
      })
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccount(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (account.password && account.password !== account.confirmPassword) {
      setStatus('Kata sandi dan konfirmasi tidak cocok!');
      return;
    }
    setStatus('Menyimpan...');
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('Profil berhasil disimpan!');
        setAccount(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } else {
        setStatus('Gagal menyimpan profil.');
      }
    } catch (e) {
      setStatus('Terjadi kesalahan koneksi.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admin Panel</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Manajemen Akun</h2>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8">
        
        <div className="flex-shrink-0 flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-4xl text-white shadow-md font-bold">
            {account.fullName ? account.fullName[0].toUpperCase() : 'A'}
          </div>
          <button className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            Ganti Foto
          </button>
        </div>

        <div className="flex-1 space-y-6">
          {status && (
            <div className="p-3 bg-primary-lighter/30 text-primary rounded-xl text-xs font-bold">
              {status}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nama Lengkap</label>
              <input 
                type="text" 
                name="fullName"
                value={account.fullName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700" 
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                name="email"
                value={account.email}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700" 
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Nomor Telepon</label>
              <input 
                type="text" 
                name="phone"
                value={account.phone}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700" 
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Role Akses</label>
              <input 
                type="text" 
                value={account.role}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none font-bold text-slate-500 cursor-not-allowed" 
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-900 mb-3">Ganti Kata Sandi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Kata Sandi Baru</label>
                <input 
                  type="password" 
                  name="password"
                  value={account.password}
                  onChange={handleChange}
                  placeholder="Masukkan kata sandi baru (kosongkan jika tidak)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 text-slate-700" 
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={account.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 text-slate-700" 
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              Simpan Profil
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
