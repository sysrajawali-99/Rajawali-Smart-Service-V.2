import React, { useState, useRef, useEffect } from 'react';
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
  Users,
  Check,
  Layers,
  Info,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE, Company } from '../../types';
import { uploadPhoto, uploadCompanyLogo, getFullUploadUrl } from '../../services/apiService';
import { updateDocumentFavicon, updateDocumentTitle } from '../../utils/dynamicFavicon';

export const CompanyProfileSettingsSection: React.FC = () => {
  const {
    companyProfile,
    updateCompanyProfile,
    resetCompanyProfile,
    activeProject,
    userRole,
    currentCompany,
    companies,
    updateCompany,
    users,
  } = useCleaning();

  const isSuperAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Perusahaan yang sedang dipilih untuk diatur oleh Super Admin
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return currentCompany?.id || companies[0]?.id || 'comp-main';
  });

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || currentCompany || companies[0];

  // Helper untuk memuat data profil perusahaan yang dipilih
  const getCompanyInitialProfile = (comp?: Company): CompanyProfile => {
    if (!comp) return { ...companyProfile };
    return {
      companyName: comp.nama || companyProfile.companyName,
      tagline: comp.tagline || (comp.id === 'comp-main' ? companyProfile.tagline : 'Operational Cleaning Service'),
      documentHeaderTitle:
        comp.documentHeaderTitle ||
        (comp.id === 'comp-main' ? companyProfile.documentHeaderTitle : 'DIVISI OPERASIONAL KEBERSIHAN GEDUNG'),
      address: comp.address || (comp.id === 'comp-main' ? companyProfile.address : 'Area Gedung / Wilayah Operasional'),
      city: comp.city || (comp.id === 'comp-main' ? companyProfile.city : 'Indonesia'),
      phone: comp.phone || (comp.id === 'comp-main' ? companyProfile.phone : '-'),
      email: comp.email || (comp.id === 'comp-main' ? companyProfile.email : '-'),
      website: comp.website || (comp.id === 'comp-main' ? companyProfile.website : '-'),
      logoUrl: comp.logo || (comp.id === 'comp-main' ? companyProfile.logoUrl || '' : ''),
    };
  };

  const [formData, setFormData] = useState<CompanyProfile>(() => getCompanyInitialProfile(selectedCompany));
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'kop_pdf' | 'login_page'>('kop_pdf');
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saat Super Admin mengganti perusahaan yang dipilih di dropdown, sinkronkan data form
  useEffect(() => {
    if (selectedCompany) {
      setFormData(getCompanyInitialProfile(selectedCompany));
    }
  }, [selectedCompanyId, selectedCompany?.logo, selectedCompany?.nama]);

  // Hitung jumlah pengguna yang terafiliasi dengan perusahaan yang sedang dipilih
  const affiliatedUsers = users.filter((u) => {
    const uComp = u.company_id || u.companyId || 'comp-main';
    return uComp === selectedCompanyId;
  });

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Ukuran file logo terlalu besar. Maksimal 25MB.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      const uploadRes = await uploadCompanyLogo(selectedCompanyId, file);
      if (uploadRes.success && uploadRes.logoUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: uploadRes.logoUrl! }));
        await updateCompany(selectedCompanyId, { logo: uploadRes.logoUrl });

        if (selectedCompanyId === 'comp-main' || selectedCompanyId === currentCompany?.id) {
          updateCompanyProfile({ logoUrl: uploadRes.logoUrl }, selectedCompanyId);
          updateDocumentFavicon(uploadRes.logoUrl);
          window.dispatchEvent(new CustomEvent('pwa-icons-updated', { detail: { icon: uploadRes.logoUrl } }));
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }
    } catch (err: any) {
      console.warn('[handleLogoUpload] uploadCompanyLogo notice:', err?.message || err);
    }

    try {
      const uploadedUrl = await uploadPhoto(file);
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: uploadedUrl }));
        await updateCompany(selectedCompanyId, { logo: uploadedUrl });

        if (selectedCompanyId === 'comp-main' || selectedCompanyId === currentCompany?.id) {
          updateCompanyProfile({ logoUrl: uploadedUrl }, selectedCompanyId);
          updateDocumentFavicon(uploadedUrl);
          window.dispatchEvent(new CustomEvent('pwa-icons-updated', { detail: { icon: uploadedUrl } }));
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }
    } catch {
      // fallback to FileReader base64
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setFormData((prev) => ({ ...prev, logoUrl: base64Url }));
        await updateCompany(selectedCompanyId, { logo: base64Url });
        if (selectedCompanyId === 'comp-main' || selectedCompanyId === currentCompany?.id) {
          updateCompanyProfile({ logoUrl: base64Url }, selectedCompanyId);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    await updateCompany(selectedCompanyId, { logo: '' });
    if (selectedCompanyId === 'comp-main' || selectedCompanyId === currentCompany?.id) {
      updateCompanyProfile({ logoUrl: '' }, selectedCompanyId);
      updateDocumentFavicon('/icons/favicon-32.png');
      window.dispatchEvent(new CustomEvent('pwa-icons-updated', { detail: { icon: '/icons/favicon-32.png' } }));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMessage('Akses ditolak: Hanya Super Administrator yang berwenang mengubah profil dan logo perusahaan.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // 1. Simpan ke data perusahaan terkait di state & database server
    await updateCompany(selectedCompanyId, {
      logo: formData.logoUrl,
      nama: formData.companyName,
      tagline: formData.tagline,
      documentHeaderTitle: formData.documentHeaderTitle,
      address: formData.address,
      city: formData.city,
      phone: formData.phone,
      email: formData.email,
      website: formData.website,
    });

    // 2. Jika ini adalah comp-main atau perusahaan pengguna aktif, perbarui juga companyProfile
    if (selectedCompanyId === 'comp-main' || selectedCompanyId === currentCompany?.id) {
      updateCompanyProfile(formData, selectedCompanyId);
      try {
        localStorage.setItem('jti_company_profile', JSON.stringify(formData));
      } catch {}

      if (formData.logoUrl) {
        updateDocumentFavicon(formData.logoUrl);
      }
      if (formData.companyName) {
        updateDocumentTitle(formData.companyName);
      }
      window.dispatchEvent(
        new CustomEvent('pwa-icons-updated', {
          detail: { icon: formData.logoUrl, name: formData.companyName },
        })
      );
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Aksi Super Admin: Terapkan logo ini ke seluruh perusahaan di sistem
  const handleApplyLogoToAll = async () => {
    if (!isSuperAdmin) return;
    if (!formData.logoUrl) {
      setErrorMessage('Silakan tentukan atau unggah logo terlebih dahulu.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const confirmApply = window.confirm(
      `Apakah Anda yakin ingin menerapkan logo ini ke seluruh (${companies.length}) perusahaan yang ada di sistem? Semua pengguna dari seluruh perusahaan akan langsung melihat logo baru ini.`
    );
    if (!confirmApply) return;

    setIsApplyingAll(true);
    try {
      for (const comp of companies) {
        await updateCompany(comp.id, { logo: formData.logoUrl });
      }
      updateCompanyProfile({ logoUrl: formData.logoUrl }, selectedCompanyId);
      window.dispatchEvent(
        new CustomEvent('pwa-icons-updated', {
          detail: { icon: formData.logoUrl, name: formData.companyName },
        })
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleReset = () => {
    resetCompanyProfile();
    setFormData({ ...DEFAULT_COMPANY_PROFILE });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
                Pengaturan Logo & Profil Perusahaan
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                Resmi Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Setiap logo dan identitas kop surat dikonfigurasi langsung oleh <strong>Super Administrator</strong>.
              Semua pengguna (admin perusahaan, supervisor, petugas, dan klien) otomatis melihat logo sesuai perusahaan yang ditetapkan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Reset ke profil perusahaan standar bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Company Selector Card (Khusus Super Admin) */}
      {isSuperAdmin ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50/90 to-indigo-50/80 border border-sky-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <label htmlFor="company-target-selector" className="text-xs font-bold text-slate-800 block">
                Pilih Perusahaan yang Ingin Diatur Logonya:
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pengaturan logo yang Anda simpan akan otomatis diterapkan untuk semua user di perusahaan ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              id="company-target-selector"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-bold text-sky-950 shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer min-w-[200px]"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} {c.id === 'comp-main' ? '(Perusahaan Utama)' : ''}
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-[11px] font-bold shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>{affiliatedUsers.length} User Terafiliasi</span>
            </span>
          </div>
        </div>
      ) : (
        /* Notice for Non-Super Admin: view-only company logo notice */
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-800">
                Perusahaan Akun Anda: {currentCompany?.nama || companyProfile.companyName}
              </p>
              <p className="text-[11px] text-slate-600">
                Logo resmi dan kop surat dokumen Anda dikonfigurasi terpusat oleh <strong>Super Administrator</strong>.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
            ● Terhubung & Sinkron
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Hak Akses Terbatas:</strong> Logo dan profil perusahaan hanya dapat diubah oleh <strong>Super Administrator</strong>. Seluruh akun di perusahaan Anda otomatis menggunakan logo yang telah ditentukan.
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            Logo & identitas untuk "{selectedCompany?.nama || formData.companyName}" berhasil disimpan! Semua {affiliatedUsers.length} pengguna di perusahaan ini otomatis menggunakan logo baru ini secara real-time.
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
                <span>
                  Logo Resmi: <span className="text-sky-700 font-extrabold">{selectedCompany?.nama || 'Perusahaan'}</span>
                </span>
              </label>
              {isSuperAdmin && formData.logoUrl && (
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
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden relative group shadow-2xs">
                {formData.logoUrl ? (
                  <img
                    src={getFullUploadUrl(formData.logoUrl)}
                    alt="Logo Perusahaan"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
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
                {isSuperAdmin && (
                  <>
                    <input
                      ref={fileInputRef}
                      id="company-logo-file-input"
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formData.logoUrl ? 'Ganti File Logo' : 'Unggah Logo Baru'}</span>
                      </button>

                      {formData.logoUrl && companies.length > 1 && (
                        <button
                          type="button"
                          onClick={handleApplyLogoToAll}
                          disabled={isApplyingAll}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Terapkan logo ini untuk semua perusahaan di sistem"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isApplyingAll ? 'Menerapkan...' : 'Terapkan ke Semua Perusahaan'}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
                <p className="text-[11px] text-slate-500">
                  Format gambar: PNG transparan, JPG, WebP, SVG. Disarankan rasio kotak (1:1) atau horizontal proporsional.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="comp-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Resmi Perusahaan (Line 1 Kop Surat)
              </label>
              <input
                id="comp-name"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="Contoh: PT RAJAWALI TALENTA INDONESIA"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-doc-header" className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Judul Dokumen / Divisi (Line 2 Kop Surat)
              </label>
              <input
                id="comp-doc-header"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.documentHeaderTitle}
                onChange={(e) => handleChange('documentHeaderTitle', e.target.value)}
                placeholder="Contoh: MANAJEMEN OPERASIONAL KEBERSIHAN & FASILITAS GEDUNG"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="comp-tagline" className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Slogan (Tampil di Halaman Login)
              </label>
              <input
                id="comp-tagline"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Contoh: Cleaning Operations & Facility Management"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="comp-city" className="block text-xs font-semibold text-slate-700 mb-1">
                Kota Kantor / Wilayah
              </label>
              <input
                id="comp-city"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Contoh: Jakarta Selatan"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Kantor Lengkap
              </label>
              <input
                id="comp-address"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Contoh: Gedung Office Tower Lt. 8, Jl. Jend. Sudirman No. 45"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="comp-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Telepon / Hotline
              </label>
              <input
                id="comp-phone"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Contoh: 021-5558901 / 0812-3456-7890"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="comp-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Perusahaan
              </label>
              <input
                id="comp-email"
                type="email"
                disabled={!isSuperAdmin}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Contoh: info@rajawali-smart.co.id"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="comp-website" className="block text-xs font-semibold text-slate-700 mb-1">
                Website Resmi
              </label>
              <input
                id="comp-website"
                type="text"
                disabled={!isSuperAdmin}
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="Contoh: www.rajawali-smart.co.id"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          {isSuperAdmin && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                * Perubahan langsung disinkronkan ke seluruh user perusahaan {selectedCompany?.nama}.
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Logo & Profil Perusahaan</span>
              </button>
            </div>
          )}
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
                Visual Kop Dokumen: {selectedCompany?.nama || 'Perusahaan'}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Left Logo */}
                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0">
                  {formData.logoUrl ? (
                    <img
                      src={getFullUploadUrl(formData.logoUrl)}
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
                    {formData.companyName?.trim() || selectedCompany?.nama || 'PT RAJAWALI TALENTA INDONESIA'}
                  </h4>
                  {formData.documentHeaderTitle?.trim() && (
                    <p className="text-[8.5px] font-semibold text-blue-900 leading-tight">
                      {formData.documentHeaderTitle.trim()}
                    </p>
                  )}
                  {activeProject?.name?.trim() && (
                    <p className="text-[9.5px] font-bold text-slate-900 leading-tight">
                      {activeProject.name.trim().toUpperCase()}
                    </p>
                  )}
                  {/* Address & City */}
                  {(() => {
                    const addressParts = [formData.address?.trim(), formData.city?.trim()].filter(Boolean);
                    if (addressParts.length === 0) return null;
                    return (
                      <p className="text-[7.5px] text-slate-600 leading-tight">
                        {addressParts.join(', ')}
                      </p>
                    );
                  })()}
                  {/* Contact Info dynamically joined */}
                  {(() => {
                    const contactItems: string[] = [];
                    if (activeProject?.managerName?.trim()) {
                      contactItems.push(`Facility Management: ${activeProject.managerName.trim()}`);
                    }
                    if (formData.phone?.trim() && formData.phone !== '-') {
                      contactItems.push(`Hotline: ${formData.phone.trim()}`);
                    }
                    if (formData.email?.trim() && formData.email !== '-') {
                      contactItems.push(`Email: ${formData.email.trim()}`);
                    }
                    if (formData.website?.trim() && formData.website !== '-') {
                      contactItems.push(`Web: ${formData.website.trim()}`);
                    }
                    if (contactItems.length === 0) return null;
                    return (
                      <p className="text-[7px] text-slate-500 leading-tight">
                        {contactItems.join(' | ')}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Double Horizontal Rule */}
              <div className="pt-1">
                <div className="h-0.5 bg-blue-950 rounded-full" />
                <div className="h-[0.5px] bg-blue-950 mt-[1.5px]" />
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400 italic">
                (Tampilan kop surat ini otomatis diterapkan pada seluruh unduhan PDF laporan kebersihan untuk perusahaan {selectedCompany?.nama})
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
                      src={getFullUploadUrl(formData.logoUrl)}
                      alt="Logo Login"
                      className="w-10 h-10 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-sky-400" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {formData.companyName || selectedCompany?.nama || 'Rajawali Smart Service'}
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {formData.tagline || 'Cleaning Operations & Facility Management System'}
                </p>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Perusahaan: {selectedCompany?.nama}</span>
                <span className="text-emerald-400 font-semibold">● Terhubung</span>
              </div>
            </div>
          )}

          {/* Quick info note */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Multi-Tenant Terpadu: </span>
              Saat Super Admin menyimpan logo untuk perusahaan terpilih, setiap user yang login dengan akun perusahaan tersebut akan otomatis melihat logo ini di Header, Halaman Login, dan Laporan PDF.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
