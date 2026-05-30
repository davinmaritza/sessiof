'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function EnrollPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<{ name: string }[]>([]);
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [absentNo, setAbsentNo] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [challengeStep, setChallengeStep] = useState<number>(-1); // -1: inactive, 0: center/flash, 1: left, 2: right, 3: completed
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/classes')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setClasses(data); })
      .catch(err => console.error('Failed to load classes:', err));
  }, []);

  useEffect(() => { return () => { stopCamera(); }; }, []);

  const startCamera = async () => {
    setCapturedImages([]);
    setUploadFiles([]);
    setChallengeStep(0);
    setFlashColor(null);
    setCountdown(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      setUseCamera(true);
      setStatus('');
    } catch (err) {
      setStatus('Gagal mengakses kamera. Pastikan izin kamera aktif.');
      setUseCamera(false);
      setChallengeStep(-1);
    }
  };

  useEffect(() => {
    if (useCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [useCamera]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhotoChallenge = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        canvas.width = 300;
        canvas.height = 300;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        fetch(dataUrl).then(res => res.blob()).then(blob => {
          const filename = challengeStep === 0 ? 'center.jpg' : challengeStep === 1 ? 'left.jpg' : 'right.jpg';
          const file = new File([blob], filename, { type: 'image/jpeg' });
          setUploadFiles(prev => [...prev, file]);
          setCapturedImages(prev => [...prev, dataUrl]);
          
          if (challengeStep === 0) {
            setChallengeStep(1);
          } else if (challengeStep === 1) {
            setChallengeStep(2);
          } else if (challengeStep === 2) {
            setChallengeStep(3);
            stopCamera();
          }
        });
      }
    }
  };

  const runFlashChallenge = () => {
    if (challengeStep !== 0) {
      capturePhotoChallenge();
      return;
    }
    
    setCountdown(3);
    const colors = [
      'rgba(255, 0, 128, 0.8)',
      'rgba(0, 128, 255, 0.8)',
      'rgba(255, 230, 0, 0.8)',
      'rgba(147, 51, 234, 0.8)'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    let currentCount = 3;
    const interval = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setFlashColor(randomColor);
        setTimeout(() => {
          capturePhotoChallenge();
          setTimeout(() => {
            setFlashColor(null);
          }, 400);
        }, 100);
      }
    }, 800);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedClass || !absentNo.trim()) {
      setStatus('Lengkapi seluruh formulir data diri.');
      return;
    }
    if (uploadFiles.length < 3) {
      setStatus('Ambil seluruh 3 pose wajah (Depan, Kiri, Kanan) terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Mendaftarkan identitas siswa...');

    try {
      const resStudent = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), class_name: selectedClass, absent_no: absentNo.trim() })
      });
      const dataStudent = await resStudent.json();
      if (!resStudent.ok) {
        setStatus(`Gagal mendaftar: ${dataStudent.error}`);
        setIsSubmitting(false);
        return;
      }

      // Upload all 3 photos sequentially
      for (let i = 0; i < uploadFiles.length; i++) {
        setStatus(`Mengunggah foto pose ke-${i+1} dari 3...`);
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('image', uploadFiles[i]);
        
        const poseName = i === 0 ? 'center' : i === 1 ? 'left' : 'right';
        formData.append('pose', poseName);
        
        const resPhoto = await fetch('http://localhost:5000/api/upload-face', { method: 'POST', body: formData });
        const dataPhoto = await resPhoto.json();
        if (!resPhoto.ok) {
          await fetch(`http://localhost:5000/api/students/${name.trim()}`, { method: 'DELETE' });
          setStatus(`Pendaftaran gagal pada pose ke-${i+1}: ${dataPhoto.error || 'Format gambar salah.'}`);
          setIsSubmitting(false);
          return;
        }
      }

      setStatus('Menyinkronkan pengenal wajah AI...');
      const resTrain = await fetch('http://localhost:5000/api/train', { method: 'POST' });
      
      if (resTrain.ok) {
        setStatus('Pendaftaran berhasil. Wajah Anda terdaftar di sistem.');
        setName(''); setAbsentNo(''); setSelectedClass('');
        setCapturedImages([]); setUploadFiles([]); setChallengeStep(-1);
      } else {
        setStatus('Data tersimpan, namun sinkronisasi AI gagal. Hubungi Admin.');
      }
    } catch (err) {
      setStatus('Gagal menghubungi server absensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-5 antialiased relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1625 40%, #0f0f1a 100%)' }}>
      
      {/* Full-screen Active Color Flash Overlay */}
      {flashColor && (
        <div className="fixed inset-0 z-[9999] pointer-events-none transition-all duration-100"
          style={{ backgroundColor: flashColor }} />
      )}
      
      <div className="absolute top-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,77,199,0.1) 0%, transparent 70%)' }} />

      <div className="max-w-4xl w-full rounded-2xl p-7 space-y-5 animate-scale-in relative z-10"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        
        {/* Header */}
        <div className="text-center space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mx-auto h-10 w-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-white tracking-tight">Registrasi Wajah</h1>
          <p className="text-[13px] text-[#8a8a9a]">Daftarkan data diri dan sampel wajah untuk sistem absensi.</p>
        </div>

        {status && (
          <div className={`rounded-lg p-3.5 text-[13px] font-medium text-center animate-slide-up ${
            status.includes('berhasil') ? 'text-emerald-400' : status.includes('Gagal') || status.includes('tidak') || status.includes('ditolak') ? 'text-red-400' : 'text-[#7c6fe0]'
          }`} style={{ 
            background: status.includes('berhasil') ? 'rgba(45,157,120,0.08)' : status.includes('Gagal') || status.includes('tidak') || status.includes('ditolak') ? 'rgba(220,74,70,0.08)' : 'rgba(91,77,199,0.08)',
            border: `1px solid ${status.includes('berhasil') ? 'rgba(45,157,120,0.15)' : status.includes('Gagal') || status.includes('tidak') || status.includes('ditolak') ? 'rgba(220,74,70,0.15)' : 'rgba(91,77,199,0.15)'}`
          }}>
            {status}
          </div>
        )}

        <form onSubmit={handleEnrollSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#8a8a9a] block tracking-wide">Nama Lengkap</label>
                <input type="text" placeholder="Ketik nama lengkap" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-3 text-[13px] text-white font-medium rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  required disabled={isSubmitting} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#8a8a9a] block tracking-wide">Kelas</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3.5 py-3 text-[13px] text-white font-medium rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  required disabled={isSubmitting}>
                  <option value="" disabled>Pilih Kelas</option>
                  {classes.map((cls, idx) => (<option key={idx} value={cls.name}>{cls.name}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[#8a8a9a] block tracking-wide">Nomor Absen</label>
                <input type="text" placeholder="Contoh: 15" value={absentNo} onChange={(e) => setAbsentNo(e.target.value)}
                  className="w-full px-3.5 py-3 text-[13px] text-white font-medium rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  required disabled={isSubmitting} />
              </div>
            </div>

            {/* Camera / Challenge Preview */}
            <div className="flex flex-col items-center justify-center rounded-xl p-5 relative min-h-[220px] overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
              
              {useCamera ? (
                <div className="w-full flex flex-col items-center gap-3 relative z-10">
                  <div className="relative w-full max-w-[420px] aspect-square rounded-xl overflow-hidden bg-black" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    
                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                        <span className="text-4xl font-black text-white animate-ping">{countdown}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Active Instruction Prompt */}
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Langkah {challengeStep + 1} dari 3
                    </span>
                    <p className="text-[12px] font-bold text-white leading-tight">
                      {challengeStep === 0 && "Hadap Depan: Tetap tegak dan perhatikan kamera"}
                      {challengeStep === 1 && "Hadap Kiri: Putar kepala Anda sedikit ke KIRI"}
                      {challengeStep === 2 && "Hadap Kanan: Putar kepala Anda sedikit ke KANAN"}
                    </p>
                  </div>

                  {countdown === null && !flashColor && (
                    <button type="button" onClick={runFlashChallenge}
                      className="text-white font-medium text-[11px] px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                      {challengeStep === 0 && "Mulai Pindai Depan (Flash)"}
                      {challengeStep === 1 && "Ambil Foto Kiri"}
                      {challengeStep === 2 && "Ambil Foto Kanan"}
                    </button>
                  )}
                </div>
              ) : challengeStep === 3 ? (
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="flex gap-2">
                    {capturedImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative flex flex-col items-center">
                        <img src={imgUrl} alt={`Pose ${idx}`} className="w-16 h-16 object-cover rounded-lg border border-primary/30" />
                        <span className="text-[8px] font-bold text-[#8a8a9a] mt-1">
                          {idx === 0 ? "Depan" : idx === 1 ? "Kiri" : "Kanan"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={startCamera} className="text-[#8a8a9a] hover:text-white text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    Ulangi Pindai Wajah
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center relative z-10">
                  <svg className="w-12 h-12 text-[#4a4a5a]" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <p className="text-[11px] font-medium text-[#6b6b7a]">Verifikasi wajah multi-pose & liveness</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button type="button" onClick={startCamera} disabled={isSubmitting}
                      className="text-white font-medium text-[11px] px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      </svg>
                      Mulai Pindai
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <button type="submit" disabled={isSubmitting}
            className="w-full text-white font-semibold text-[13px] py-3.5 rounded-xl transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses...
              </span>
            ) : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="pt-2 text-center flex justify-between items-center text-[11px] text-[#5a5a6a] font-medium"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span>Sessiof v2.0</span>
          <button type="button" onClick={() => router.push('/login')} className="hover:text-[#9b91e8] transition-colors">
            Masuk Portal
          </button>
        </div>
      </div>
    </main>
  );
}
