'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanAttendancePage() {
  const router = useRouter();
  const [challengeStep, setChallengeStep] = useState<number>(-1); // -1: Intro, 0: Center, 1: Flash Challenge, 2: Left, 3: Right, 4: Verifying Face, 5: Success
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [flashColorName, setFlashColorName] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [useCamera, setUseCamera] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Temporary storage for images
  const preFlashImageRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg('');
    setStatus('Menginisialisasi kamera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      setUseCamera(true);
      setChallengeStep(0);
      setStatus('Silakan hadap lurus ke kamera.');
    } catch (err) {
      setErrorMsg('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
      setUseCamera(false);
      setChallengeStep(-1);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  useEffect(() => {
    if (useCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [useCamera, challengeStep]);

  const captureFrame = (): string | null => {
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
        return canvas.toDataURL('image/jpeg');
      }
    }
    return null;
  };

  // Stage 1: Verify Center Pose (Pre-challenge)
  const verifyCenterPose = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    setStatus('Memverifikasi orientasi depan...');
    setErrorMsg('');

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'center.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);
      formData.append('pose', 'center');

      const res = await fetch('http://localhost:5000/api/verify-pose', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('Wajah terdeteksi. Bersiap untuk Tantangan Warna...');
        // Save this image as pre-flash
        preFlashImageRef.current = dataUrl;
        setTimeout(() => {
          setChallengeStep(1);
          runColorChallenge();
        }, 1000);
      } else {
        setErrorMsg(data.error || 'Wajah tidak terdeteksi dengan benar.');
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server verifikasi.');
    }
  };

  // Stage 2: Color Flash Challenge
  const runColorChallenge = () => {
    setErrorMsg('');
    setStatus('Perhatikan layar! Warna acak akan muncul...');
    setCountdown(3);

    const colors = [
      { name: 'red', val: 'rgba(255, 0, 0, 1.0)' },
      { name: 'blue', val: 'rgba(0, 0, 255, 1.0)' },
      { name: 'yellow', val: 'rgba(255, 255, 0, 1.0)' },
      { name: 'purple', val: 'rgba(255, 0, 255, 1.0)' }
    ];
    const selected = colors[Math.floor(Math.random() * colors.length)];
    setFlashColorName(selected.name);

    let currentCount = 3;
    const interval = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(interval);
        setCountdown(null);
        
        // Trigger color flash
        setFlashColor(selected.val);
        
        setTimeout(async () => {
          const flashDataUrl = captureFrame();
          setFlashColor(null);
          
          if (!flashDataUrl || !preFlashImageRef.current) {
            setErrorMsg('Gagal mengambil frame flash.');
            return;
          }

          setStatus('Menganalisis pantulan cahaya warna pada wajah...');
          try {
            const blobPre = await (await fetch(preFlashImageRef.current)).blob();
            const blobFlash = await (await fetch(flashDataUrl)).blob();

            const filePre = new File([blobPre], 'pre_flash.jpg', { type: 'image/jpeg' });
            const fileFlash = new File([blobFlash], 'flash.jpg', { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('pre_flash', filePre);
            formData.append('flash', fileFlash);
            formData.append('color', selected.name);

            const res = await fetch('http://localhost:5000/api/verify-color-challenge', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();

            if (res.ok) {
              setStatus('Liveness valid! Sekarang putar kepala Anda ke KIRI.');
              setChallengeStep(2);
            } else {
              setErrorMsg(data.error || 'Pantulan warna tidak valid. Deteksi keaktifan gagal.');
              // Reset back to center to try again
              setTimeout(() => {
                setChallengeStep(0);
                setStatus('Silakan hadap lurus ke depan untuk mengulangi.');
              }, 3000);
            }
          } catch (err) {
            setErrorMsg('Gagal memproses analisis pantulan warna.');
          }
        }, 150);
      }
    }, 800);
  };

  // Stage 3: Verify Left Pose
  const verifyLeftPose = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    setStatus('Memverifikasi pose kiri...');
    setErrorMsg('');

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'left.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);
      formData.append('pose', 'left');

      const res = await fetch('http://localhost:5000/api/verify-pose', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('Selesai Kiri! Sekarang putar kepala Anda ke KANAN.');
        setChallengeStep(3);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server verifikasi.');
    }
  };

  // Stage 4: Verify Right Pose
  const verifyRightPose = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    setStatus('Memverifikasi pose kanan...');
    setErrorMsg('');

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'right.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);
      formData.append('pose', 'right');

      const res = await fetch('http://localhost:5000/api/verify-pose', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('Pose kanan valid! Hadap depan kembali untuk pencocokan wajah...');
        setChallengeStep(4);
        setTimeout(() => {
          verifyAttendanceFace();
        }, 1500);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server verifikasi.');
    }
  };

  // Stage 5: Final Face Recognition & Logging Attendance
  const verifyAttendanceFace = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;

    setStatus('Mencocokkan biometrik wajah Anda dengan database...');
    setErrorMsg('');

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('http://localhost:5000/api/verify-attendance-face', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        stopCamera();
        setStudentInfo(data);
        setChallengeStep(5);
        setStatus('');
      } else {
        setErrorMsg(data.error || 'Wajah tidak dikenali.');
        setTimeout(() => {
          setChallengeStep(0);
          setStatus('Silakan hadap lurus ke depan untuk mengulangi.');
        }, 3000);
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server absensi.');
    }
  };

  const getStepIndicatorLabel = (step: number) => {
    switch (step) {
      case 0: return 'Deteksi Wajah';
      case 1: return 'Pantulan Cahaya';
      case 2: return 'Menoleh Kiri';
      case 3: return 'Menoleh Kanan';
      case 4: return 'Verifikasi Akhir';
      default: return 'Menunggu';
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-5 antialiased relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #faf8ff 50%, #f5f3ff 100%)' }}>
      
      {/* Dynamic Color Flash Overlay */}
      {flashColor && (
        <div className="fixed inset-0 z-[9999] pointer-events-none transition-all duration-100"
          style={{ backgroundColor: flashColor }} />
      )}
      
      <div className="absolute top-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,77,199,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-xl w-full rounded-2xl p-7 space-y-6 animate-scale-in relative z-10"
        style={{ background: 'rgba(255, 255, 255, 0.75)', border: '1px solid rgba(91, 77, 199, 0.08)', backdropFilter: 'blur(25px)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Header */}
        <div className="text-center space-y-2 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="mx-auto h-11 w-11 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
            <span className="text-xl text-white">🤖</span>
          </div>
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">Absensi Wajah Aktif</h1>
          <p className="text-[12px] text-slate-500">Protokol Verifikasi Liveness & Pose Multi-Sudut.</p>
        </div>

        {/* Status Indicator */}
        {status && (
          <div className="text-[#5b4dc7] bg-[#5b4dc7]/5 border border-[#5b4dc7]/15 rounded-xl p-3 text-[12px] text-center font-semibold animate-slide-up">
            {status}
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="text-red-600 bg-red-500/5 border border-red-500/15 rounded-xl p-3.5 text-[12px] text-center font-semibold animate-shake">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Content Box */}
        <div className="flex flex-col items-center justify-center rounded-xl p-4 min-h-[250px] relative overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
          
          {challengeStep === -1 && (
            <div className="text-center space-y-4 py-6">
              <span className="text-4xl block">🛡️</span>
              <div className="space-y-1.5">
                <h3 className="text-[14px] font-bold text-slate-800">Sistem Absensi Aman</h3>
                <p className="text-[11px] text-slate-500 max-w-[280px] mx-auto">
                  Absensi memerlukan verifikasi liveness (pantulan cahaya layar) dan sensor gerakan kepala untuk menghindari manipulasi foto/video.
                </p>
              </div>
              <button onClick={startCamera}
                className="text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg hover:brightness-110 active:scale-95 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                Mulai Verifikasi Wajah
              </button>
            </div>
          )}

          {challengeStep >= 0 && challengeStep <= 4 && (
            <div className="w-full flex flex-col items-center gap-4">
              {/* Webcam frame */}
              <div className="relative w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden bg-black shadow-inner"
                style={{ border: '2px solid rgba(91,77,199,0.1)' }}>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                
                {/* Direction Guide Overlay */}
                {useCamera && countdown === null && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {challengeStep === 0 && (
                      <div className="flex flex-col items-center justify-center bg-black/55 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-md animate-pulse-soft">
                        <span className="text-white text-2xl">🎯</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest mt-1 animate-pulse">Hadap Depan</span>
                      </div>
                    )}
                    {challengeStep === 2 && (
                      <div className="flex flex-col items-center justify-center bg-black/55 px-4 py-2.5 rounded-xl border border-primary/20 backdrop-blur-md animate-bounce-right">
                        <span className="text-primary-light text-3xl font-black">→</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest mt-1">Menoleh Kiri</span>
                      </div>
                    )}
                    {challengeStep === 3 && (
                      <div className="flex flex-col items-center justify-center bg-black/55 px-4 py-2.5 rounded-xl border border-primary/20 backdrop-blur-md animate-bounce-left">
                        <span className="text-primary-light text-3xl font-black">←</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest mt-1">Menoleh Kanan</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Countdown display */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-20">
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                      Flash Dalam
                    </span>
                    <span className="text-5xl font-black text-white animate-ping">{countdown}</span>
                  </div>
                )}

                {/* Step indicator overlay */}
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider text-white border border-white/5">
                  Langkah {challengeStep + 1} dari 5: {getStepIndicatorLabel(challengeStep)}
                </div>
              </div>

              {/* Action Prompt or Instruction */}
              <div className="text-center space-y-3 w-full">
                <p className="text-[13px] font-black text-slate-800 leading-snug">
                  {challengeStep === 0 && 'Hadap Depan: Posisikan wajah Anda lurus ke kamera'}
                  {challengeStep === 1 && `Tantangan Liveness: Menguji pantulan warna (${flashColorName.toUpperCase()})`}
                  {challengeStep === 2 && 'Hadap Kiri: Putar kepala Anda ke KIRI (45 derajat)'}
                  {challengeStep === 3 && 'Hadap Kanan: Putar kepala Anda ke KANAN (45 derajat)'}
                  {challengeStep === 4 && 'Verifikasi Akhir: Harap diam menghadap depan...'}
                </p>

                {/* Control buttons */}
                {countdown === null && !flashColor && (
                  <div className="flex justify-center w-full">
                    {challengeStep === 0 && (
                      <button onClick={verifyCenterPose}
                        className="text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                        Deteksi Wajah Depan
                      </button>
                    )}
                    {challengeStep === 2 && (
                      <button onClick={verifyLeftPose}
                        className="text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                        Verifikasi Pose Kiri
                      </button>
                    )}
                    {challengeStep === 3 && (
                      <button onClick={verifyRightPose}
                        className="text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                        Verifikasi Pose Kanan
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {challengeStep === 5 && studentInfo && (
            <div className="text-center space-y-4 py-4 w-full animate-fade-in">
              <div className="h-16 w-16 bg-emerald-50 border border-emerald-250 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-3xl">
                ✓
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  {studentInfo.is_duplicate ? 'Sudah Absen' : 'Absen Berhasil'}
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight mt-2">{studentInfo.name}</h3>
                <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
                  Kelas {studentInfo.class_name} | No Absen {studentInfo.absent_no}
                </p>
                <p className="text-[11px] text-slate-500">
                  Absen dicatat pada pukul {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>

              <div className="pt-4 flex gap-3 justify-center">
                <button onClick={() => {
                  setChallengeStep(-1);
                  setStudentInfo(null);
                }} className="text-slate-500 hover:text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  Absen Kembali
                </button>
                <button onClick={() => router.push('/')}
                  className="text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #5b4dc7, #7c6fe0)' }}>
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400 font-semibold"
          style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <span>Sessiof Verification Protocol</span>
          <button onClick={() => router.push('/')} className="hover:text-slate-700 transition-colors cursor-pointer">
            Batal & Keluar
          </button>
        </div>
      </div>
    </main>
  );
}
