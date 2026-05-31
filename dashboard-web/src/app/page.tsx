'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SessiofLogo from '@/components/SessiofLogo';

interface Student {
  name: string;
  class_name: string;
  absent_no: string;
  photo_count: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [isLogged, setIsLogged] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const logged = localStorage.getItem('sessiof_admin_logged');
    if (logged === 'true') {
      setIsLogged(true);
    }

    // Ambil data siswa terdaftar dari server Python untuk mempermudah mengenali "siapa saja orangnya"
    fetch('http://localhost:5000/api/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.students) {
          setStudents(data.students);
        }
      })
      .catch(err => console.error('Gagal mengambil data siswa:', err));
  }, []);

  const avatars = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '👨‍💻', '👩‍💻'];

  // Filter siswa berdasarkan pencarian langsung di landing page agar mudah dicari
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f1f8] via-[#faf7fc] to-[#f5f1f8] text-slate-800 font-sans antialiased overflow-x-hidden relative flex flex-col justify-between transition-colors duration-300">
      
      {/* BACKGROUND GLOWS (TEMA UNGU) */}
      <div className="absolute top-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-primary-light/10 blur-[130px] pointer-events-none"></div>

      {/* HEADER NAVIGASI */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3 group cursor-pointer">
          <SessiofLogo size={40} />
          <span className="font-extrabold text-slate-900 text-xl tracking-tight">sessiof</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-655">
          <Link href="/scan" className="hover:text-primary transition-all duration-200 hover:scale-105">Absensi Wajah</Link>
          <Link href="/enroll" className="hover:text-primary transition-all duration-200 hover:scale-105">Pendaftaran Mandiri</Link>
          <a href="https://github.com/davinmaritza/sessiof" target="_blank" className="hover:text-primary transition-all duration-200 hover:scale-105">Repositori Kode</a>
        </nav>

        <div>
          <Link 
            href={isLogged ? "/dashboard" : "/login"}
            className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-6 py-3 rounded-full transition-all duration-300 shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.03] active:scale-[0.97]"
          >
            {isLogged ? "Masuk Dashboard" : "Mulai Sekarang"}
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-w-7xl w-full mx-auto px-6 py-12 md:py-16 flex flex-col items-center text-center z-10 relative space-y-12">
        <div className="space-y-4 max-w-3xl animate-fade-in">
          <span className="bg-primary-lighter/40 text-primary border border-primary/20 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest inline-block animate-pulse">
            🤖 Didukung Deep Learning AI (YuNet + SFace)
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] text-balance">
            Cara Tercepat & Teraman Mengelola Absensi Siswa
          </h1>
          <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto text-balance">
            Sessiof mendeteksi keaktifan (*liveness detection*) dan mencocokkan wajah siswa secara instan ke database Excel lokal & Google Sheets Cloud tanpa repot.
          </p>
        </div>

        {/* CTA BUTTONS */}
        <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in">
          <Link 
            href="/scan" 
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-8 py-4 rounded-full shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-xl cursor-pointer"
          >
            Mulai Absensi Wajah &rarr;
          </Link>
          <Link 
            href="/enroll" 
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-8 py-4 rounded-full shadow-sm transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
          >
            Pendaftaran Wajah Mandiri
          </Link>
        </div>

        {/* INTERACTIVE PREVIEW PANEL */}
        <div className="w-full max-w-4xl pt-6 animate-slide-in">
          <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-[2rem] p-5 md:p-7 shadow-2xl shadow-slate-200/80 transition-all duration-500 hover:scale-[1.005]">
            <div className="bg-slate-950 rounded-2xl aspect-[16/9] overflow-hidden border border-slate-900 relative shadow-inner flex flex-col justify-between p-4 md:p-6 text-left">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span className="text-[10px] text-slate-500 font-bold ml-2">Monitor Absensi Kamera Live</span>
                </div>
                <span className="text-[9px] font-black text-primary bg-primary/10 px-3 py-0.5 rounded-full tracking-wider animate-pulse">SISTEM AKTIF</span>
              </div>

              {/* Fake Camera Feed representation */}
              <div className="flex-1 flex flex-col md:flex-row gap-5 items-center justify-center my-4">
                <div className="w-full md:w-1/2 aspect-video rounded-xl bg-slate-900 border border-slate-850 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                  {/* Glowing scanner line */}
                  <div className="absolute w-full h-0.5 bg-primary-light top-0 left-0 animate-bounce shadow-md shadow-primary-light"></div>
                  
                  <div className="w-20 h-20 rounded-full border border-primary-light/40 flex items-center justify-center relative bg-slate-950">
                    <span className="text-3xl">👤</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary mt-3 tracking-wide">Pindai Wajah: LIVE [SFace AI]</span>
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">STREAM LIVE</div>
                </div>

                <div className="w-full md:w-1/2 space-y-3">
                  <h4 className="font-extrabold text-white text-xs tracking-wide">Riwayat Kehadiran Terbaru</h4>
                  <div className="space-y-2">
                    <div className="bg-slate-900/50 border border-slate-900 p-3 rounded-xl flex justify-between items-center text-[10px] transition-all hover:translate-x-1">
                      <span className="font-bold text-white">#012 - Davin Maritza (Kelas XII)</span>
                      <span className="text-primary font-black bg-primary/10 px-2.5 py-0.5 rounded">Hadir (07:15)</span>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-900 p-3 rounded-xl flex justify-between items-center text-[10px] transition-all hover:translate-x-1">
                      <span className="font-bold text-white">#004 - Alfarobby (Kelas XII)</span>
                      <span className="text-primary font-black bg-primary/10 px-2.5 py-0.5 rounded">Hadir (07:22)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-[9px] text-slate-500 font-bold tracking-wider">
                <span>MODEL AI: YUNET + SFACE (ONNX)</span>
                <span>STATUS LIVENESS: VERIFIKASI AKTIF</span>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTERED STUDENTS LIST ("Gampang tau orang-orangnya") */}
        <div className="w-full max-w-4xl space-y-6 pt-8 animate-slide-in">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Siapa Saja yang Sudah Terdaftar?</h2>
            <p className="text-xs text-slate-500 font-medium">Cari dan kenali siswa terdaftar beserta jumlah sampel wajah mereka secara real-time.</p>
          </div>

          {/* Search bar for students */}
          <div className="max-w-md mx-auto relative shadow-sm">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input 
              type="text" 
              placeholder="Cari nama siswa atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-5 py-3.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {filteredStudents.length > 0 ? (
              filteredStudents.slice(0, 6).map((student, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-primary-light/50 -translate-y-0 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-lg shadow-sm">
                      {avatars[idx % avatars.length]}
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-xs text-slate-900 block leading-snug">{student.name}</span>
                      <span className="text-[9px] text-slate-450 font-bold block mt-0.5 uppercase tracking-wide">
                        Kelas {student.class_name} | Absen {student.absent_no}
                      </span>
                    </div>
                  </div>
                  <div className="bg-primary/10 text-primary text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                    {student.photo_count} Foto Wajah
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs font-semibold">
                Siswa tidak ditemukan atau belum ada data terdaftar.
              </div>
            )}
          </div>

          {students.length > 6 && (
            <div className="text-center pt-2">
              <Link 
                href="/login" 
                className="text-xs font-black text-primary hover:text-primary-light transition-colors"
              >
                Lihat Selengkapnya ({students.length - 6} Siswa Lainnya) di Portal Admin &rarr;
              </Link>
            </div>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-8 border-t border-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-4 z-10 relative">
        <span className="text-[10px] font-bold text-slate-450">&copy; {new Date().getFullYear()} sessiof Face Intelligence. Hak Cipta Dilindungi.</span>
        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500">
          <Link href="/scan" className="hover:text-primary transition-colors">Absensi Wajah</Link>
          <Link href="/login" className="hover:text-primary transition-colors">Masuk Admin</Link>
          <Link href="/enroll" className="hover:text-primary transition-colors">Daftar Mandiri</Link>
          <a href="https://github.com/davinmaritza/sessiof" target="_blank" className="hover:text-primary transition-colors">Repositori Kode</a>
        </div>
      </footer>

    </div>
  );
}
