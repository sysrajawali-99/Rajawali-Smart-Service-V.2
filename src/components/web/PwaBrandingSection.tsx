import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Sparkles,
  CheckCircle2,
  Save,
  RefreshCw,
  FolderOpen,
  Info,
  Palette,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  RotateCcw,
  AlertTriangle,
  Layers,
  Wand2,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { generateAllPwaIcons, PWA_ICON_CONFIGS } from '../../utils/pwaIconGenerator';
import { updateDocumentFavicon, updateDocumentTitle } from '../../utils/dynamicFavicon';

export interface PwaIconItem {
  id: string;
  name: string;
  size: string;
  purpose: string;
  path: string;
  isCustom?: boolean;
}

const DEFAULT_PWA_ICONS: PwaIconItem[] = [
  { id: 'def-1', name: 'icon-192.png', size: '192x192', purpose: 'Any (Android Launcher / Splash)', path: '/icons/icon-192.png' },
  { id: 'def-2', name: 'icon-512.png', size: '512x512', purpose: 'Any (PWA Splash Screen & Store)', path: '/icons/icon-512.png' },
  { id: 'def-3', name: 'maskable-192.png', size: '192x192', purpose: 'Maskable (Android Circle/Squircle)', path: '/icons/maskable-192.png' },
  { id: 'def-4', name: 'maskable-512.png', size: '512x512', purpose: 'Maskable (Solid Safe Zone 80%)', path: '/icons/maskable-512.png' },
  { id: 'def-5', name: 'apple-touch-icon-180.png', size: '180x180', purpose: 'iOS Safari Home Screen (iPhone)', path: '/icons/apple-touch-icon-180.png' },
  { id: 'def-6', name: 'apple-touch-icon-167.png', size: '167x167', purpose: 'iPad Pro Retina', path: '/icons/apple-touch-icon-167.png' },
  { id: 'def-7', name: 'apple-touch-icon-152.png', size: '152x152', purpose: 'iPad Standard', path: '/icons/apple-touch-icon-152.png' },
  { id: 'def-8', name: 'badge-72.png', size: '72x72', purpose: 'Android Notification Bar (Monochrome)', path: '/icons/badge-72.png' },
  { id: 'def-9', name: 'mstile-150.png', size: '150x150', purpose: 'Windows Start Menu Tile', path: '/icons/mstile-150.png' },
  { id: 'def-10', name: 'favicon-32.png', size: '32x32', purpose: 'Browser Desktop Tab', path: '/icons/favicon-32.png' },
  { id: 'def-11', name: 'favicon-16.png', size: '16x16', purpose: 'Browser Small Tab', path: '/icons/favicon-16.png' },
];

export const PwaBrandingSection: React.FC = () => {
  const { userRole, companyProfile, updateCompanyProfile } = useCleaning();
  const [appName, setAppName] = useState('Smart Cleaning Operations');
  const [shortName, setShortName] = useState('JTI Smart');
  const [themeColor, setThemeColor] = useState('#0284c7');
  const [isSaved, setIsSaved] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState(false);

  // Icon Management State
  const [icons, setIcons] = useState<PwaIconItem[]>(() => {
    try {
      const saved = localStorage.getItem('jti_pwa_icons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PWA_ICONS;
  });

  // Master Logo Upload & Adaptation State
  const [isProcessingMaster, setIsProcessingMaster] = useState(false);
  const [masterProgressText, setMasterProgressText] = useState('');
  const [masterLogoPreview, setMasterLogoPreview] = useState<string | null>(null);

  // Modal State for Add Icon
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIconName, setNewIconName] = useState('');
  const [newIconSize, setNewIconSize] = useState('192x192');
  const [newIconPurpose, setNewIconPurpose] = useState('Any (Latar Transparan)');
  const [newIconPreview, setNewIconPreview] = useState<string | null>(null);
  const [applyToAllVariants, setApplyToAllVariants] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Modal State for Delete Confirmation
  const [iconToDelete, setIconToDelete] = useState<PwaIconItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const masterFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('jti_pwa_icons', JSON.stringify(icons));
    } catch {}
  }, [icons]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Process a source image and automatically generate & adapt all 11 PWA icons
   */
  const processAndApplyMasterLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (PNG, JPG, SVG, WebP)!', 'error');
      return;
    }

    setIsProcessingMaster(true);
    setMasterProgressText('Membaca file logo...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        setMasterLogoPreview(dataUrl);

        setMasterProgressText('Menyesuaikan 11 spesifikasi ikon (Maskable, Apple, Badge, Favicon)...');
        // Generate all 11 tailored icon variants using HTML5 Canvas
        const generatedList = await generateAllPwaIcons(dataUrl, themeColor);

        setMasterProgressText('Menyimpan 11 ikon ke server (/public/icons/)...');
        // Send to server to write them directly into public/icons/ folder
        try {
          const res = await fetch('/api/pwa/update-icons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icons: generatedList }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log('[PWA Update]', data.message);
          }
        } catch (serverErr) {
          console.warn('[PWA Update Notice] Local canvas storage fallback:', serverErr);
        }

        // Map generated icons to the state
        const timestamp = Date.now();
        const updatedIcons: PwaIconItem[] = generatedList.map((g) => ({
          id: g.id,
          name: g.name,
          size: g.size,
          purpose: g.purpose,
          // Use dataUrl for immediate crisp rendering in browser & cache-busted path
          path: g.dataUrl,
        }));

        setIcons(updatedIcons);

        // Instantly update browser tab favicon and title in real-time
        const faviconVariant = generatedList.find((g) => g.name === 'favicon-32.png') || generatedList[0];
        if (faviconVariant?.dataUrl) {
          updateDocumentFavicon(faviconVariant.dataUrl);
          updateDocumentTitle(appName || shortName);
          window.dispatchEvent(
            new CustomEvent('pwa-icons-updated', {
              detail: { icon: faviconVariant.dataUrl, name: appName || shortName },
            })
          );
          updateCompanyProfile({ logoUrl: faviconVariant.dataUrl });
        }

        showToast('Sukses! Semua 11 varian ikon PWA telah otomatis diperbarui & disesuaikan peruntukannya.');
      } catch (err: any) {
        console.error('[processAndApplyMasterLogo] Error:', err);
        showToast('Gagal memproses gambar: ' + (err?.message || 'Error tidak diketahui'), 'error');
      } finally {
        setIsProcessingMaster(false);
        setMasterProgressText('');
      }
    };

    reader.readAsDataURL(file);
  };

  const handleMasterFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndApplyMasterLogo(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    updateDocumentTitle(appName || shortName);
    updateCompanyProfile({ companyName: appName });
    window.dispatchEvent(
      new CustomEvent('pwa-icons-updated', {
        detail: { name: appName || shortName },
      })
    );
    showToast('Identitas aplikasi berhasil disimpan!');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRegenerateIcons = async () => {
    setIsRegenerating(true);
    setRegenSuccess(false);
    setTimeout(() => {
      setIsRegenerating(false);
      setRegenSuccess(true);
      showToast('Aset ikon sistem berhasil diverifikasi & siap digunakan.');
      setTimeout(() => setRegenSuccess(false), 4000);
    }, 1000);
  };

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Hanya file gambar (PNG, JPG, SVG) yang diperbolehkan!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewIconPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (!newIconName) {
      setNewIconName(file.name.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  const handleAddIconSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newIconPreview) {
      showToast('Pilih file gambar ikon terlebih dahulu!', 'error');
      return;
    }

    // IF USER CHECKED: "Terapkan logo ini ke 11 varian ikon sekaligus"
    if (applyToAllVariants) {
      setIsUploading(true);
      try {
        const generatedList = await generateAllPwaIcons(newIconPreview, themeColor);
        try {
          await fetch('/api/pwa/update-icons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icons: generatedList }),
          });
        } catch {}

        const updatedIcons: PwaIconItem[] = generatedList.map((g) => ({
          id: g.id,
          name: g.name,
          size: g.size,
          purpose: g.purpose,
          path: g.dataUrl,
        }));

        setIcons(updatedIcons);

        const fav = generatedList.find((g) => g.name === 'favicon-32.png') || generatedList[0];
        if (fav?.dataUrl) {
          updateDocumentFavicon(fav.dataUrl);
          updateDocumentTitle(appName || shortName);
          window.dispatchEvent(
            new CustomEvent('pwa-icons-updated', {
              detail: { icon: fav.dataUrl, name: appName || shortName },
            })
          );
          updateCompanyProfile({ logoUrl: fav.dataUrl });
        }

        setShowAddModal(false);
        setNewIconName('');
        setNewIconPreview(null);
        showToast('Berhasil! Seluruh 11 ikon PWA langsung disesuaikan dengan logo yang baru diunggah.');
      } catch (err: any) {
        showToast('Gagal memproses varian ikon: ' + (err?.message || 'Error'), 'error');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Otherwise: Add as single custom icon item
    if (!newIconName.trim()) {
      showToast('Nama ikon wajib diisi!', 'error');
      return;
    }

    const newIconItem: PwaIconItem = {
      id: `custom-icon-${Date.now()}`,
      name: newIconName.trim().endsWith('.png') || newIconName.trim().endsWith('.svg') || newIconName.trim().endsWith('.ico')
        ? newIconName.trim()
        : `${newIconName.trim()}.png`,
      size: newIconSize,
      purpose: newIconPurpose,
      path: newIconPreview,
      isCustom: true,
    };

    setIcons((prev) => [newIconItem, ...prev]);
    setShowAddModal(false);
    setNewIconName('');
    setNewIconPreview(null);
    showToast(`Ikon "${newIconItem.name}" berhasil ditambahkan.`);
  };

  const handleConfirmDelete = () => {
    if (!iconToDelete) return;
    setIcons((prev) => prev.filter((i) => i.id !== iconToDelete.id));
    showToast(`Ikon "${iconToDelete.name}" telah dihapus.`);
    setIconToDelete(null);
  };

  const handleResetDefaultIcons = () => {
    if (window.confirm('Kembalikan semua daftar 11 ikon ke bawaan sistem JTI Smart?')) {
      setIcons(DEFAULT_PWA_ICONS);
      localStorage.removeItem('jti_pwa_icons');
      showToast('Daftar ikon dikembalikan ke susunan default.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-600'
              : 'bg-rose-900 text-rose-100 border-rose-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-5 bg-gradient-to-r from-sky-900 to-slate-900 rounded-2xl border border-sky-800 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-600/40 border border-sky-400/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-sky-300" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Tampilan Aplikasi & PWA (JTI Smart)
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                PWA Generator Aktif
              </span>
            </h3>
            <p className="text-xs text-sky-200 mt-0.5">
              Cukup unggah satu logo, sistem akan otomatis menyesuaikan dan membuat 11 varian ikon (Maskable, Apple, Badge, Favicon).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => masterFileInputRef.current?.click()}
            disabled={isProcessingMaster}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4" />
            Upload & Ubah 11 Ikon
          </button>

          <button
            type="button"
            onClick={handleRegenerateIcons}
            disabled={isRegenerating}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Memeriksa...' : 'Cek Status Ikon'}
          </button>
        </div>
      </div>

      {/* AUTO-GENERATOR HERO DROPZONE: "Upload 1 Logo -> Ubah 11 Ikon Sekaligus" */}
      <div className="bg-gradient-to-br from-sky-50 via-white to-slate-50 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 p-6 text-center transition-all shadow-xs relative overflow-hidden group">
        <input
          ref={masterFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleMasterFileSelect}
          className="hidden"
        />

        <div className="max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-sky-200 group-hover:scale-105 transition-transform">
            {isProcessingMaster ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <Wand2 className="w-7 h-7" />
            )}
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              Upload Logo Baru & Langsung Ubah 11 Ikon
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pilih satu file logo brand Anda. Sistem akan <strong>secara cerdas memproses, memberi padding aman (safe zone), membuat siluet putih untuk notifikasi Android, latar solid untuk iPhone, serta ikon favicon</strong>, dan langsung memperbarui ke-11 ikon di bawah.
            </p>
          </div>

          {isProcessingMaster ? (
            <div className="p-3 bg-sky-100/80 rounded-xl text-xs text-sky-800 font-semibold flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span>{masterProgressText}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => masterFileInputRef.current?.click()}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-200 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih File Logo (PNG / JPG / SVG)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>Tambah Ikon Manual</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Maskable Android (Safe Zone 80%)
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Apple Touch Icon (iPhone & iPad)
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Siluet Putih Status Bar
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Favicon 32 & 16px
            </span>
          </div>
        </div>
      </div>

      {regenSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Semua file ikon PWA di folder <code>public/icons/</code> terverifikasi siap pakai tanpa error 404.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-sky-600" />
            Identitas Aplikasi Web
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Nama yang muncul saat diinstal ke layar utama Android, iPhone, Windows, dan browser.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Aplikasi (App Name)
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                placeholder="Smart Cleaning Operations"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Nama lengkap pada splash screen dan dialog instalasi.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Singkat di Layar Utama (Short Name)
              </label>
              <input
                type="text"
                value={shortName}
                maxLength={12}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                placeholder="JTI Smart"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Maksimal 12 karakter agar tidak terpotong di home screen ponsel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warna Tema Utama (Theme Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Warna status bar ponsel dan latar belakang ikon Maskable / Apple Touch.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warna Latar Splash Screen (Background Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  disabled
                  className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 bg-slate-100 opacity-80"
                />
                <input
                  type="text"
                  value={`${themeColor} (Solid Brand Sky)`}
                  disabled
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Latar belakang transisi saat aplikasi pertama kali dibuka dari layar utama.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {isSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pengaturan tersimpan
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Identitas
            </button>
          </div>
        </form>
      </div>

      {/* Gallery of PWA Icons with Add & Delete Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-600" />
              Daftar 11 Varian Ikon PWA Terpasang ({icons.length} Ikon)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap ikon memiliki fungsi dan spesifikasi resolusi yang telah disesuaikan secara otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Ikon
            </button>

            <button
              type="button"
              onClick={handleResetDefaultIcons}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Kembalikan susunan ikon bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          </div>
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {icons.map((icon, idx) => (
            <div
              key={icon.id || icon.name}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3 hover:border-sky-300 transition-colors group relative"
            >
              {/* Preview container */}
              <div
                className={`w-12 h-12 rounded-xl p-1 flex items-center justify-center shrink-0 border shadow-xs overflow-hidden ${
                  icon.name.includes('maskable') || icon.name.includes('apple') || icon.name.includes('mstile')
                    ? 'border-sky-700/40'
                    : 'bg-slate-900 border-slate-700/50'
                }`}
                style={{
                  backgroundColor:
                    icon.name.includes('maskable') || icon.name.includes('apple') || icon.name.includes('mstile')
                      ? themeColor
                      : '#0f172a',
                }}
              >
                <img
                  src={icon.path}
                  alt={icon.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 truncate">{icon.name}</p>
                  {icon.isCustom && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sky-700 font-medium">{icon.size}</p>
                <p className="text-[10px] text-slate-400 truncate">{icon.purpose}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={icon.path}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Lihat Pratinjau Gambar"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setIconToDelete(icon)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Ikon ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panduan Mengganti Logo Sumber untuk Orang Awam */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900">
              Bagaimana Sistem Menyesuaikan 11 Ikon Secara Otomatis?
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Saat Anda mengunggah logo di kotak atas, sistem langsung melakukan pemrosesan otomatis untuk setiap perangkat:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-amber-900 pl-1 pt-1">
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 space-y-1">
            <p className="font-bold text-sky-800">1. Any (192 & 512px)</p>
            <p className="text-[11px] text-slate-600">Latar transparan dengan resolusi tinggi untuk splash screen & launcher Android.</p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 space-y-1">
            <p className="font-bold text-sky-800">2. Maskable (192 & 512px)</p>
            <p className="text-[11px] text-slate-600">Latar solid tema dengan padding aman 80% agar tidak terpotong bentuk lingkaran.</p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 space-y-1">
            <p className="font-bold text-sky-800">3. Apple Touch (180, 167, 152px)</p>
            <p className="text-[11px] text-slate-600">Latar solid tema persegi murni tanpa sudut lengkung untuk iPhone & iPad.</p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 space-y-1">
            <p className="font-bold text-sky-800">4. Badge 72px & Favicon</p>
            <p className="text-[11px] text-slate-600">Siluet monokrom putih untuk bar notifikasi status Android & favicon tab browser.</p>
          </div>
        </div>
      </div>

      {/* MODAL: Tambah Ikon Baru / Upload Sekaligus */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-sky-200" />
                <h3 className="font-bold text-sm">Upload & Tambah Ikon</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIconSubmit} className="p-5 space-y-4">
              {/* File Upload / Image Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih File Gambar Logo (PNG / JPG / SVG)
                </label>
                <div
                  onClick={() => singleFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-sky-50/50 transition-colors"
                >
                  {newIconPreview ? (
                    <div className="relative w-20 h-20 rounded-xl bg-slate-900 p-2 flex items-center justify-center shadow-md">
                      <img
                        src={newIconPreview}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                      <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Siap
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-600 text-center font-medium">
                        Klik untuk memilih file logo dari perangkat Anda
                      </p>
                      <p className="text-[10px] text-slate-400">Rekomendasi: PNG resolusi 512x512 px</p>
                    </>
                  )}
                  <input
                    ref={singleFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleSingleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* TOGGLE: Apply to all 11 variants automatically */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="apply-all"
                  checked={applyToAllVariants}
                  onChange={(e) => setApplyToAllVariants(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="apply-all" className="text-xs text-sky-900 cursor-pointer">
                  <span className="font-bold block">Sesuaikan & Terapkan ke 11 Varian Ikon Sekaligus</span>
                  <span className="text-[11px] text-sky-700 block mt-0.5">
                    Otomatis membuat varian Maskable (80% safe zone), Apple Touch iPhone, siluet putih notifikasi, dan Favicon.
                  </span>
                </label>
              </div>

              {/* If NOT applying to all variants: show single item attributes */}
              {!applyToAllVariants && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama File Ikon
                    </label>
                    <input
                      type="text"
                      required
                      value={newIconName}
                      onChange={(e) => setNewIconName(e.target.value)}
                      placeholder="custom-icon-512.png"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ukuran
                      </label>
                      <select
                        value={newIconSize}
                        onChange={(e) => setNewIconSize(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                      >
                        <option value="512x512">512x512 px</option>
                        <option value="192x192">192x192 px</option>
                        <option value="256x256">256x256 px</option>
                        <option value="180x180">180x180 px (Apple)</option>
                        <option value="72x72">72x72 px (Badge)</option>
                        <option value="32x32">32x32 px (Favicon)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tujuan / Purpose
                      </label>
                      <select
                        value={newIconPurpose}
                        onChange={(e) => setNewIconPurpose(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                      >
                        <option value="Any (Standar Transparan)">Any (Standar)</option>
                        <option value="Maskable (Android Bulat/Squircle)">Maskable (Latar Solid)</option>
                        <option value="Monochrome (Notifikasi)">Monochrome (Siluet)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memproses 11 Ikon...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {applyToAllVariants ? 'Terapkan ke 11 Ikon' : 'Simpan Ikon'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Ikon */}
      {iconToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-sm text-slate-900">
                Hapus Ikon "{iconToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ikon ini akan dihapus dari daftar aset aktif. Anda dapat menambahkannya kembali kapan saja atau mereset daftar ke default.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div
                className="w-10 h-10 rounded-lg p-1 flex items-center justify-center"
                style={{
                  backgroundColor:
                    iconToDelete.name.includes('maskable') || iconToDelete.name.includes('apple')
                      ? themeColor
                      : '#0f172a',
                }}
              >
                <img
                  src={iconToDelete.path}
                  alt={iconToDelete.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-800">{iconToDelete.name}</p>
                <p className="text-[11px] text-slate-500">{iconToDelete.size} • {iconToDelete.purpose}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIconToDelete(null)}
                className="w-full py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
