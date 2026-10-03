import React, { useState, useEffect } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  Smartphone,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(false);
  const [isSafariBrowser, setIsSafariBrowser] = useState<boolean>(true);
  const [showManualGuide, setShowManualGuide] = useState<boolean>(false);

  useEffect(() => {
    // 1. Device check: Only show on touch devices (mobile & tablet, including iPadOS reporting as MacIntel)
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!hasTouch) {
      return;
    }

    // 2. Standalone check: Do not show if app is already running installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. LocalStorage check for dismissed or postponed state
    const isInstalledAlready = localStorage.getItem('pwa_installed') === 'true';
    if (isInstalledAlready) {
      return;
    }

    const isPermanentlyDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';
    if (isPermanentlyDismissed) {
      return;
    }

    const postponedTime = localStorage.getItem('pwa_prompt_postponed');
    if (postponedTime) {
      const postponedTimestamp = parseInt(postponedTime, 10);
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - postponedTimestamp < SEVEN_DAYS_MS) {
        return;
      }
    }

    // 4. Android/Chrome check for related installed apps
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (relatedApps && relatedApps.length > 0) {
            localStorage.setItem('pwa_installed', 'true');
            setIsVisible(false);
          }
        })
        .catch(() => {});
    }

    // 5. Detect iOS / iPadOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOSDevice(isIOS);

    const isSafari =
      isIOS && ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
    setIsSafariBrowser(isSafari);

    // 6. Listen for beforeinstallprompt on Chromium browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('pwa_installed', 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If it's iOS or Chromium didn't immediately fire event on first visit, show prompt after brief delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          localStorage.setItem('pwa_installed', 'true');
          setIsVisible(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('[PWA] Error launching prompt:', err);
        setShowManualGuide(true);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  const handleMarkInstalled = () => {
    localStorage.setItem('pwa_installed', 'true');
    setIsVisible(false);
  };

  const handlePostpone = () => {
    // Sembunyikan selama 7 hari
    localStorage.setItem('pwa_prompt_postponed', Date.now().toString());
    setIsVisible(false);
  };

  const handleDismissForever = () => {
    // Sembunyikan selamanya
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Mobile: Bottom Sheet | Tablet: Centered Dialog */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        {/* Header with App Branding */}
        <div className="relative bg-gradient-to-r from-sky-600 to-sky-700 px-5 py-4 text-white">
          <button
            type="button"
            onClick={handlePostpone}
            aria-label="Tutup sementara"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/icons/icon-192.png"
                alt="Smart Cleaning Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/40 text-[10px] font-semibold tracking-wide uppercase text-sky-100 mb-0.5">
                <Smartphone className="w-3 h-3" />
                Aplikasi Web Progresif (PWA)
              </div>
              <h3 className="text-base font-bold leading-tight font-heading">
                Smart Cleaning Operations
              </h3>
              <p className="text-xs text-sky-100">Pasang di layar utama untuk akses instan & cepat</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* iOS / iPadOS Instructions */}
          {isIOSDevice ? (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-100 text-xs text-slate-700 space-y-2.5">
                <p className="font-semibold text-sky-900 flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-4 h-4 text-sky-600 shrink-0" />
                  Cara Memasang di iPhone & iPad:
                </p>
                <div className="space-y-2 text-slate-600 pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-xs leading-relaxed">
                      Tekan tombol <strong className="text-slate-800">Bagikan</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline text-sky-600 mx-0.5" /> di bilah bawah
                      layar Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-xs leading-relaxed">
                      Gulir ke bawah dan pilih opsi{' '}
                      <strong className="text-slate-800">"Tambah ke Layar Utama"</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-slate-700 mx-0.5" />.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-xs leading-relaxed">
                      Tekan <strong className="text-sky-700">"Tambah"</strong> di sudut kanan atas.
                    </p>
                  </div>
                </div>
              </div>

              {!isSafariBrowser && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Anda sedang membuka browser pihak ketiga. Jika menu "Tambah ke Layar Utama" tidak
                    ditemukan, buka halaman ini melalui browser resmi <strong>Safari</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Android & Other Chromium Touch Devices */
            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Nikmati kemudahan akses aplikasi kebersihan langsung dari layar utama perangkat Anda
                tanpa membuka browser berulang kali, lebih ringan, dan tetap tersinkronisasi
                real-time.
              </p>

              {/* Direct Install Button */}
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Install Aplikasi Sekarang
                </button>
              ) : showManualGuide ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MoreVertical className="w-3.5 h-3.5 text-sky-600" />
                    Panduan Manual:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                    <li>
                      Ketuk menu titik tiga (<MoreVertical className="w-3 h-3 inline text-slate-700" />) di pojok kanan atas browser.
                    </li>
                    <li>
                      Pilih <strong className="text-slate-800">"Install app"</strong> atau{' '}
                      <strong className="text-slate-800">"Tambahkan ke layar utama"</strong>.
                    </li>
                    <li>Konfirmasi pemasangan untuk membuat pintasan instan.</li>
                  </ol>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Install Aplikasi
                </button>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleMarkInstalled}
              className="w-full py-2 px-3 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sudah Terpasang di Perangkat
            </button>

            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                type="button"
                onClick={handlePostpone}
                className="py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3 text-slate-500" />
                Nanti (7 Hari)
              </button>
              <button
                type="button"
                onClick={handleDismissForever}
                className="py-2 px-3 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                Jangan Tampilkan Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
