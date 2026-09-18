import React, { useState, useRef } from 'react';
import {
  Building2,
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  CheckCircle2,
  FileText,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  Trash2,
  Eye,
  Lock,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from '../../types';

export const CompanyProfileSettingsSection: React.FC = () => {
  const { companyProfile, updateCompanyProfile, resetCompanyProfile, activeProject } = useCleaning();

  const [formData, setFormData] = useState<CompanyProfile>({ ...companyProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'kop_pdf' | 'login_page'>('kop_pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize local state if companyProfile updates from context
  React.useEffect(() => {
    setFormData({ ...companyProfile });
  }, [companyProfile]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setFormData((prev) => ({ ...prev, logoUrl: base64Url }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan pengaturan data perusahaan dan logo ke nilai default awal?')) {
      resetCompanyProfile();
      setFormData({ ...DEFAULT_COMPANY_PROFILE });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div
      id="section-company-profile-settings"
      className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Profil Perusahaan & Kop Surat Dokumen (Export PDF & Login)
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                Resmi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Sesuaikan data identitas perusahaan, unggah logo, dan atur kop surat untuk seluruh formulir ekspor PDF
              (Ceklist Kebersihan, Master Cleaning Program, Activity Report, & Laporan Kerusakan). Perubahan logo dan nama
              perusahaan juga langsung diterapkan secara visual pada halaman Login.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            title="Reset ke profil perusahaan standar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Profil perusahaan, logo, dan kop surat berhasil diperbarui! Perubahan langsung aktif di seluruh laporan PDF dan halaman Login.
          </span>
        </div>
      )}

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs & Logo Upload (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
          {/* Logo Upload Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-600" />
                <span>Logo Resmi Perusahaan (Digunakan pada Kop Surat & Halaman Login)</span>
              </label>
              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Logo</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo Preview Box */}
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden relative group">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo Perusahaan"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-1">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                    <span className="text-[10px] text-slate-400 block mt-1">Belum Ada Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  id="company-logo-file-input"
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.logoUrl ? 'Ganti File Logo' : 'Unggah Logo Baru'}</span>
                </button>
                <p className="text-[11px] text-slate-500">
                  Format yang didukung: PNG, JPG, WebP, SVG transparan. Disarankan rasio proporsional (1:1 atau horizontal) maksimal 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="comp-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Resmi Perusahaan (Institution Line 1)
              </label>
              <input
                id="comp-name"
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Contoh: PT RAJAWALI TALENTA INDONESIA"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold text-slate-800"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-doc-header" className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Judul Dokumen / Divisi (Institution Line 2)
              </label>
              <input
                id="comp-doc-header"
                type="text"
                value={formData.documentHeaderTitle}
                onChange={(e) => handleChange('documentHeaderTitle', e.target.value)}
                placeholder="Contoh: MANAJEMEN OPERASIONAL KEBERSIHAN & FASILITAS GEDUNG"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="comp-tagline" className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Slogan (Tampil di Login)
              </label>
              <input
                id="comp-tagline"
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Contoh: Cleaning Operations & Facility Management System"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="comp-city" className="block text-xs font-semibold text-slate-700 mb-1">
                Kota Kantor Pusat
              </label>
              <input
                id="comp-city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Contoh: Jakarta Selatan"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Kantor Lengkap
              </label>
              <input
                id="comp-address"
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Contoh: Gedung Office Tower Lt. 8, Jl. Jend. Sudirman No. 45"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="comp-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Telepon / Hotline Operasional
              </label>
              <input
                id="comp-phone"
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Contoh: 021-5558901 / 0812-3456-7890"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="comp-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Perusahaan
              </label>
              <input
                id="comp-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Contoh: rajawalitalentaindonesia@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-website" className="block text-xs font-semibold text-slate-700 mb-1">
                Website Resmi
              </label>
              <input
                id="comp-website"
                type="text"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="Contoh: www.rajawali-smart.co.id"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              * Perubahan disimpan otomatis ke penyimpanan lokal sistem.
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Profil Perusahaan</span>
            </button>
          </div>
        </form>

        {/* Right: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Tab Selector for Preview */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              <span>Pratinjau Langsung (Live Preview)</span>
            </span>

            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActivePreviewTab('kop_pdf')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activePreviewTab === 'kop_pdf'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kop PDF
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('login_page')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activePreviewTab === 'login_page'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Halaman Login
              </button>
            </div>
          </div>

          {/* Preview: Kop Surat PDF */}
          {activePreviewTab === 'kop_pdf' && (
            <div className="p-4 rounded-xl border border-slate-300 bg-white shadow-sm space-y-2.5 font-sans">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase text-center border-b border-slate-100 pb-1">
                Visual Kop Surat Dokumen Resmi
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Left Logo */}
                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Kop"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded bg-sky-700 text-white flex flex-col items-center justify-center font-bold text-[9px] leading-tight">
                      <span>RTI</span>
                      <span className="text-[6px] opacity-80">FACILITY</span>
                    </div>
                  )}
                </div>

                {/* Center Text */}
                <div className="flex-1 text-center space-y-0.5">
                  <h4 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-tight leading-snug">
                    {formData.companyName || 'PT RAJAWALI TALENTA INDONESIA'}
                  </h4>
                  <p className="text-[8.5px] font-semibold text-blue-900 leading-tight">
                    {formData.documentHeaderTitle || 'MANAJEMEN OPERASIONAL KEBERSIHAN & FASILITAS GEDUNG'} • KLIEN: {activeProject.clientName.toUpperCase()}
                  </p>
                  <p className="text-[9.5px] font-bold text-slate-900 leading-tight">
                    {activeProject.name.toUpperCase()}
                  </p>
                  <p className="text-[7.5px] text-slate-600 leading-tight">
                    {formData.address}, {formData.city}
                  </p>
                  <p className="text-[7px] text-slate-500 leading-tight">
                    Facility Management: {activeProject.managerName} | Hotline: {formData.phone} | Web: {formData.website}
                  </p>
                </div>
              </div>

              {/* Double Horizontal Rule */}
              <div className="pt-1">
                <div className="h-0.5 bg-blue-950 rounded-full" />
                <div className="h-[0.5px] bg-blue-950 mt-[1.5px]" />
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400 italic">
                (Tampilan kop surat ini otomatis diterapkan pada seluruh unduhan PDF formulir operasional)
              </div>
            </div>
          )}

          {/* Preview: Login Page */}
          {activePreviewTab === 'login_page' && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-white shadow-sm space-y-3">
              <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase text-center border-b border-slate-800 pb-1">
                Visual Header Halaman Login
              </div>

              <div className="text-center pt-2 space-y-2">
                <div className="inline-flex items-center justify-center p-2 rounded-xl bg-white/10 border border-white/20 shadow-md">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Login"
                      className="w-10 h-10 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-sky-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {formData.companyName || 'Rajawali Smart Service'}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {formData.tagline || 'Cleaning Operations & Facility Management System'}
                </p>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Status Login: Siap Digunakan</span>
                <span className="text-emerald-400 font-semibold">● Terhubung</span>
              </div>
            </div>
          )}

          {/* Quick info note */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Kop Surat Dinamis: </span>
              Semua ekspor PDF (Ceklist Area, MCP, Laporan Bulanan, Daily/Weekly, dan Tiket Kerusakan) langsung mereferensikan pengaturan ini secara terpadu.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
