export default function SupportCenterPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl w-full mx-auto animate-fade-in">
      <div className="flex justify-between items-center border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bantuan</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Pusat Dukungan</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* FAQ Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Pertanyaan Umum (FAQ)</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <h4 className="font-bold text-slate-900 text-xs mb-1">Bagaimana cara menambahkan siswa baru?</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Buka menu <strong>Kelola Siswa</strong> di sidebar kiri, lalu klik tombol "Tambah Siswa Baru" di pojok kanan atas. Isi nama lengkap, kelas, dan nomor absen, lalu klik Simpan.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <h4 className="font-bold text-slate-900 text-xs mb-1">Mengapa wajah siswa tidak terdeteksi?</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Pastikan Anda sudah mengunggah foto wajah yang jelas di profil siswa tersebut, lalu klik <strong>Mulai Training Wajah</strong> di halaman Kelola Siswa agar sistem AI memperbarui datanya.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <h4 className="font-bold text-slate-900 text-xs mb-1">Di mana letak log absensi Excel?</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Log absensi Excel disimpan di folder dataset secara otomatis. Anda juga dapat melihat dan menghapusnya secara langsung melalui menu <strong>Absensi & Log</strong> di portal ini.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Hubungi Tim IT</h3>
          
          <form className="space-y-4">
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Perihal Masalah</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 font-bold text-slate-700">
                <option>Sistem Kamera Error</option>
                <option>Data Siswa Hilang</option>
                <option>Gagal Ekspor Data</option>
                <option>Lainnya</option>
              </select>
            </div>
            
            <div>
              <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Deskripsi Lengkap</label>
              <textarea 
                rows={5}
                placeholder="Jelaskan kendala yang Anda alami secara detail..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400 text-slate-700 resize-none"
              ></textarea>
            </div>

            <div className="pt-2">
              <button type="button" className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95">
                Kirim Tiket Dukungan
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">Hotline Darurat IT Sekolah</p>
            <p className="text-sm font-black text-slate-800 mt-1">0811-0000-9999</p>
          </div>
        </div>

      </div>
    </div>
  );
}
