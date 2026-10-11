import React, { useState, useMemo, useRef } from 'react';
import {
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Upload,
  Power,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Phone,
  Mail,
  RotateCcw,
  Sparkles,
  ClipboardList,
  MapPin,
  Activity,
  CheckCheck,
  FileText,
  Clock,
  Wrench,
  AlertTriangle,
  Lock,
  Layers,
  History,
  Smartphone,
  Bell,
  BarChart3,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import {
  Company,
  CompanyStatus,
  AppUser,
  FixedUserLevel,
  UserRole,
  UserStatus,
  CompanyFeatures,
  ChecklistLocationCategory,
  DashboardKpiVisibilityConfig,
  ChecklistTemplateItem,
} from '../../types';
import { uploadCompanyLogo } from '../../services/apiService';

// Import komponen lama yang dipertahankan
import { UserManagementSection } from './UserManagementSection';
import { JabatanManagementSection } from './JabatanManagementSection';
import { CompanyProfileSettingsSection } from './CompanyProfileSettingsSection';
import { SuperAdminBulkDeleteSection } from './SuperAdminBulkDeleteSection';
import { AuditTrailModal } from './AuditTrailModal';
import { AuditLogSection } from './AuditLogSection';
import { PwaBrandingSection } from './PwaBrandingSection';
import { NotificationSettingsSection } from './NotificationSettingsSection';

export type PengaturanSubTab =
  | 'company'
  | 'users'
  // Sub-tab lama (disembunyikan tapi dipertahankan)
  | 'all'
  | 'branding'
  | 'notifications'
  | 'log'
  | 'checklist'
  | 'kpi'
  | 'profile'
  | 'jabatan'
  | 'bulk_delete';

const FIXED_LEVELS: {
  level: FixedUserLevel;
  role: UserRole;
  label: string;
  badgeColor: string;
  deskripsi: string;
}[] = [
  {
    level: 'Owner',
    role: 'admin_perusahaan',
    label: 'Owner',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    deskripsi: 'Pemilik perusahaan: Melihat semua data perusahaannya & kelola fitur',
  },
  {
    level: 'Manager',
    role: 'admin_perusahaan',
    label: 'Manager',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    deskripsi: 'Manajer: Melihat semua data operasional perusahaan',
  },
  {
    level: 'Supervisor',
    role: 'supervisor',
    label: 'Supervisor',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    deskripsi: 'Pengawas: Mengelola ceklist, inspeksi, tim & jadwal',
  },
  {
    level: 'Team Leader',
    role: 'supervisor',
    label: 'Team Leader',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    deskripsi: 'Ketua regu: Mengelola ceklist kebersihan & tim lapangan',
  },
  {
    level: 'Petugas',
    role: 'petugas',
    label: 'Petugas',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    deskripsi: 'Petugas kebersihan: Hanya mengisi ceklist area tugas',
  },
  {
    level: 'Klien',
    role: 'klien',
    label: 'Klien',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    deskripsi: 'Klien/Tenant: Hanya melihat laporan proyeknya',
  },
];

const DEFAULT_COMPANY_FEATURES: CompanyFeatures = {
  ceklist: true,
  area: true,
  activity: true,
  inspeksi: true,
  report: true,
  petugas: true,
  shift: true,
  kerusakan: true,
  complaint: true,
};

export const PengaturanView: React.FC<{ initialSubTab?: PengaturanSubTab }> = ({ initialSubTab }) => {
  const {
    userRole,
    currentUser,
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
    projects,
    setActiveTab,
    // Nilai context untuk modul warisan yang dipertahankan
    checklistTemplates,
    kpiConfig,
    rbacPermissions,
    auditLogs,
    jabatan,
  } = useCleaning();

  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const userCompanyId = currentUser?.company_id || currentUser?.companyId || 'comp-main';

  // Sub-tab aktif utama (Hanya Perusahaan dan User)
  const [activeTabMode, setActiveTabMode] = useState<'company' | 'users'>(() => {
    if (initialSubTab === 'users') return 'users';
    return 'company';
  });

  // Opsi lanjutan tersembunyi (Modul rumit lama)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [legacySubTab, setLegacySubTab] = useState<PengaturanSubTab>('profile');

  // Feedback toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ==========================================
  // BAGIAN 1: PERUSAHAAN (Company Management)
  // ==========================================
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [uploadingLogoCompanyId, setUploadingLogoCompanyId] = useState<string | null>(null);

  // File input ref per perusahaan
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [targetCompanyForLogo, setTargetCompanyForLogo] = useState<string | null>(null);

  // Filter daftar perusahaan: Super Admin melihat semua, Admin Perusahaan hanya perusahaannya sendiri
  const visibleCompanies = useMemo(() => {
    if (isSuperAdmin) return companies;
    return companies.filter((c) => c.id === userCompanyId);
  }, [companies, isSuperAdmin, userCompanyId]);

  // Tambah Perusahaan Baru (Khusus Super Admin)
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Hanya Super Administrator yang dapat menambah perusahaan.', 'error');
      return;
    }
    const cleanName = newCompanyName.trim();
    if (!cleanName) return;

    try {
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await addCompany({
        nama: cleanName,
        slug: slug || `comp-${Date.now()}`,
        status: 'aktif',
        features: { ...DEFAULT_COMPANY_FEATURES },
      });

      setNewCompanyName('');
      setShowAddCompanyModal(false);
      showToast(`Perusahaan "${cleanName}" berhasil ditambahkan.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambahkan perusahaan.', 'error');
    }
  };

  // Ubah Nama Perusahaan
  const handleSaveCompanyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    const cleanName = editCompanyName.trim();
    if (!cleanName) return;

    try {
      await updateCompany(editingCompany.id, {
        nama: cleanName,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setEditingCompany(null);
      showToast(`Nama perusahaan berhasil diperbarui menjadi "${cleanName}".`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengubah nama perusahaan.', 'error');
    }
  };

  // Tangguhkan / Aktifkan Perusahaan (Khusus Super Admin)
  const handleToggleCompanyStatus = async (company: Company) => {
    if (!isSuperAdmin) {
      showToast('Hanya Super Administrator yang berhak menangguhkan perusahaan.', 'error');
      return;
    }
    if (company.id === 'comp-main') {
      showToast('Perusahaan Utama (comp-main) tidak dapat ditangguhkan.', 'error');
      return;
    }

    const nextStatus: CompanyStatus = company.status === 'aktif' ? 'ditangguhkan' : 'aktif';
    const confirmMsg =
      nextStatus === 'ditangguhkan'
        ? `Tangguhkan perusahaan "${company.nama}"?\n\nPengguna milik perusahaan ini tidak akan dapat login sampai diaktifkan kembali.`
        : `Aktifkan kembali perusahaan "${company.nama}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateCompany(company.id, { status: nextStatus });
      showToast(
        `Perusahaan "${company.nama}" berhasil ${nextStatus === 'ditangguhkan' ? 'ditangguhkan' : 'diaktifkan kembali'}.`,
        nextStatus === 'ditangguhkan' ? 'info' : 'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengubah status perusahaan.', 'error');
    }
  };

  // Trigger input unggah logo
  const handleTriggerUploadLogo = (companyId: string) => {
    setTargetCompanyForLogo(companyId);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
      logoInputRef.current.click();
    }
  };

  // Unggah LOGO Perusahaan (Cek tipe file PNG/JPG/WEBP & batasi ukuran max 3MB)
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetCompanyForLogo) return;

    // 1. Cek ukuran (Maksimal 3MB)
    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran file logo terlalu besar. Maksimal 3MB.', 'error');
      return;
    }

    // 2. Cek tipe MIME dasar
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Format logo harus berupa file gambar PNG, JPG, atau WEBP.', 'error');
      return;
    }

    setUploadingLogoCompanyId(targetCompanyForLogo);

    try {
      const res = await uploadCompanyLogo(targetCompanyForLogo, file);
      if (res.success && res.logoUrl) {
        await updateCompany(targetCompanyForLogo, { logo: res.logoUrl });
        showToast('Logo perusahaan berhasil diunggah dan disimpan!');
      } else {
        showToast(res.error || 'Gagal mengunggah logo perusahaan.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan saat mengunggah logo.', 'error');
    } finally {
      setUploadingLogoCompanyId(null);
      setTargetCompanyForLogo(null);
    }
  };

  // Tombol Aktif/Nonaktif Fitur Utama Perusahaan (Admin Perusahaan & Super Admin)
  const handleToggleFeature = async (company: Company, featureKey: keyof CompanyFeatures) => {
    const currentFeats: CompanyFeatures = {
      ...DEFAULT_COMPANY_FEATURES,
      ...(company.features || {}),
    };
    const nextVal = !currentFeats[featureKey];
    const updatedFeats: CompanyFeatures = {
      ...currentFeats,
      [featureKey]: nextVal,
    };

    try {
      await updateCompany(company.id, { features: updatedFeats });
      showToast(`Fitur "${featureKey}" untuk ${company.nama} telah ${nextVal ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengubah pengaturan fitur perusahaan.', 'error');
    }
  };

  // ==========================================
  // BAGIAN 2: USER (Pengguna & Level Tetap)
  // ==========================================
  const [userSearch, setUserSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetModalData, setResetModalData] = useState<{ userName: string; tempPass: string } | null>(null);

  // Form Tambah User
  const [addForm, setAddForm] = useState<{
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    company_id: string;
    level: FixedUserLevel;
  }>({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: 'user123',
    company_id: isSuperAdmin ? companies[0]?.id || 'comp-main' : userCompanyId,
    level: 'Petugas',
  });

  // Filter daftar user: Non-superadmin hanya melihat user perusahaannya sendiri
  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      const uComp = u.company_id || u.companyId || 'comp-main';
      if (!isSuperAdmin && uComp !== userCompanyId) return false;

      const q = userSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const matchLevel = filterLevel === 'all' || (u.level || (u.role === 'petugas' ? 'Petugas' : 'Supervisor')) === filterLevel;

      return matchSearch && matchLevel;
    });
  }, [users, isSuperAdmin, userCompanyId, userSearch, filterLevel]);

  // Tambah User Baru
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) {
      showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }

    const targetCompany = isSuperAdmin ? addForm.company_id : userCompanyId;
    const selectedLevelConfig = FIXED_LEVELS.find((l) => l.level === addForm.level);
    const mappedRole: UserRole = selectedLevelConfig ? selectedLevelConfig.role : 'petugas';

    try {
      addUser({
        name: addForm.name.trim(),
        username: addForm.username.trim() || addForm.email.split('@')[0],
        email: addForm.email.trim().toLowerCase(),
        phone: addForm.phone.trim() || undefined,
        password: addForm.password.trim() || 'user123',
        company_id: targetCompany,
        companyId: targetCompany,
        role: mappedRole,
        level: addForm.level,
        status: 'aktif',
        assignedProjectIds: projects.map((p) => p.id),
      });

      setAddForm({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: 'user123',
        company_id: isSuperAdmin ? companies[0]?.id || 'comp-main' : userCompanyId,
        level: 'Petugas',
      });
      setShowAddUserModal(false);
      showToast(`User "${addForm.name}" (Level: ${addForm.level}) berhasil ditambahkan.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambahkan pengguna.', 'error');
    }
  };

  // Simpan Perubahan Edit User
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        level: editingUser.level,
        role: FIXED_LEVELS.find((l) => l.level === editingUser.level)?.role || editingUser.role,
        ...(isSuperAdmin && editingUser.company_id ? { company_id: editingUser.company_id, companyId: editingUser.company_id } : {}),
      });
      setEditingUser(null);
      showToast(`Data pengguna "${editingUser.name}" berhasil diperbarui.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui pengguna.', 'error');
    }
  };

  // Toggle Status Aktif / Nonaktifkan User
  const handleToggleUserStatus = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      showToast('Anda tidak dapat menonaktifkan akun Anda sendiri.', 'error');
      return;
    }
    const isAktif = (user.status || 'aktif') === 'aktif';
    const confirmChange = window.confirm(
      `${isAktif ? 'Nonaktifkan' : 'Aktifkan kembali'} akun pengguna "${user.name}"?\n\n` +
        (isAktif
          ? 'Pengguna akan segera ditolak oleh server dan tidak dapat login.'
          : 'Pengguna akan dapat login kembali.')
    );
    if (!confirmChange) return;

    const res = await toggleUserStatus(user.id);
    if (res.success) {
      showToast(
        res.message || `Akun "${user.name}" berhasil ${res.status === 'nonaktif' ? 'dinonaktifkan' : 'diaktifkan kembali'}.`,
        res.status === 'nonaktif' ? 'info' : 'success'
      );
    } else {
      showToast(res.message || 'Gagal mengubah status akun pengguna.', 'error');
    }
  };

  // Reset Sandi User
  const handleResetUserPassword = async (user: AppUser) => {
    if (!window.confirm(`Reset kata sandi akun "${user.name}"?\n\nSistem akan membuat sandi sementara baru.`)) {
      return;
    }
    const res = await resetUserPassword(user.id);
    if (res.success && res.temporaryPassword) {
      setResetModalData({
        userName: user.name,
        tempPass: res.temporaryPassword,
      });
      showToast(`Kata sandi akun ${user.name} berhasil direset.`);
    } else {
      showToast(res.message || 'Gagal mereset kata sandi.', 'error');
    }
  };

  // Hapus User (Khusus Super Admin)
  const handleDeleteUser = (user: AppUser) => {
    if (!isSuperAdmin) {
      showToast('Hanya Super Administrator yang berhak menghapus akun.', 'error');
      return;
    }
    if (user.id === currentUser?.id) {
      showToast('Tidak bisa menghapus akun Anda sendiri.', 'error');
      return;
    }
    if (!window.confirm(`Hapus permanen akun pengguna "${user.name}"?`)) return;

    const res = deleteUser(user.id);
    if (res.success) {
      showToast(`Akun "${user.name}" berhasil dihapus.`);
    } else {
      showToast(res.message || 'Gagal menghapus akun pengguna.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-5">
      {/* Hidden File Input untuk Unggah Logo Perusahaan */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-rose-900 text-rose-100 border border-rose-700'
              : toast.type === 'info'
              ? 'bg-amber-900 text-amber-100 border border-amber-700'
              : 'bg-emerald-900 text-emerald-100 border border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-300" />
          ) : toast.type === 'info' ? (
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Utama: Bersih dan Sederhana */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pengaturan & Master Data
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {isSuperAdmin ? 'Super Admin' : 'Admin Perusahaan'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Menu disederhanakan: kelola profil perusahaan, unggah logo, dan manajemen pengguna serta level akses.
          </p>
        </div>

        {/* 2 Tab Sederhana: Perusahaan & User */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            id="tab-btn-perusahaan"
            onClick={() => setActiveTabMode('company')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'company'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Perusahaan ({visibleCompanies.length})</span>
          </button>

          <button
            type="button"
            id="tab-btn-user"
            onClick={() => setActiveTabMode('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'users'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. User ({visibleUsers.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PERUSAHAAN (TAMBAH, UBAH NAMA, TANGGUHKAN, UNGGAH LOGO) */}
      {/* ======================================================== */}
      {activeTabMode === 'company' && (
        <div className="space-y-4">
          {/* Top Bar Perusahaan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <span>Manajemen Perusahaan, Logo Resmi & Fitur</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isSuperAdmin
                  ? 'Tambah perusahaan baru, atur logo, status operasional, dan aktifkan fitur yang tersedia.'
                  : 'Kelola identitas perusahaan Anda, unggah logo resmi, dan atur fitur utama yang aktif.'}
              </p>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                id="add-company-btn"
                onClick={() => setShowAddCompanyModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Perusahaan</span>
              </button>
            )}
          </div>

          {/* Daftar Kartu Perusahaan */}
          <div className="grid grid-cols-1 gap-4">
            {visibleCompanies.map((comp) => {
              const isSuspended = comp.status === 'ditangguhkan';
              const isUploading = uploadingLogoCompanyId === comp.id;
              const features = { ...DEFAULT_COMPANY_FEATURES, ...(comp.features || {}) };

              return (
                <div
                  key={comp.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    isSuspended ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    {/* Info Perusahaan & Logo */}
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Logo Container */}
                      <div className="relative group shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-2xs">
                          {comp.logo ? (
                            <img
                              src={comp.logo}
                              alt={comp.nama || 'Logo Perusahaan'}
                              className="w-full h-full object-contain p-1"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Building2 className="w-6 h-6" />
                              <span className="text-[9px] font-bold uppercase mt-0.5">
                                {(comp.nama || comp.slug || 'CP').slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tombol Unggah Logo di Thumbnail */}
                        <button
                          type="button"
                          onClick={() => handleTriggerUploadLogo(comp.id)}
                          disabled={isUploading}
                          title="Unggah LOGO baru (PNG, JPG, WEBP maks 3MB)"
                          className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Detail Nama & Status */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-base">{comp.nama || 'Tanpa Nama'}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSuspended
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {isSuspended ? 'Ditangguhkan' : 'Aktif'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            ID: {comp.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Logo resmi tersimpan di server per perusahaan dan tampil di halaman login saat perusahaan dipilih.
                        </p>
                      </div>
                    </div>

                    {/* Tombol Aksi Perusahaan */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {/* Tombol Unggah Logo Text */}
                      <button
                        type="button"
                        onClick={() => handleTriggerUploadLogo(comp.id)}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>{isUploading ? 'Mengunggah...' : 'Unggah Logo'}</span>
                      </button>

                      {/* Tombol Ubah Nama */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCompany(comp);
                          setEditCompanyName(comp.nama || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ubah Nama</span>
                      </button>

                      {/* Tombol Tangguhkan / Aktifkan (Super Admin Only) */}
                      {isSuperAdmin && comp.id !== 'comp-main' && (
                        <button
                          type="button"
                          onClick={() => handleToggleCompanyStatus(comp)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                            isSuspended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{isSuspended ? 'Aktifkan Kembali' : 'Tangguhkan'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pengaturan Fitur Utama yang Tersedia (Sakelar Aktif/Nonaktif) */}
                  <div className="pt-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        <span>Fitur yang Tersedia untuk Perusahaan Ini:</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Klik sakelar untuk mengaktifkan atau menonaktifkan fitur di sidebar pengguna
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { key: 'ceklist' as const, label: 'Ceklist Kebersihan', icon: ClipboardList },
                        { key: 'area' as const, label: 'Area Cleaning', icon: MapPin },
                        { key: 'activity' as const, label: 'Cleaning Activity', icon: Activity },
                        { key: 'inspeksi' as const, label: 'Inspeksi & QC', icon: CheckCheck },
                        { key: 'report' as const, label: 'Laporan & Report', icon: FileText },
                        { key: 'petugas' as const, label: 'Petugas & Shift', icon: Users },
                        { key: 'kerusakan' as const, label: 'Laporan Kerusakan', icon: Wrench },
                        { key: 'complaint' as const, label: 'Keluhan / Komplain', icon: AlertTriangle },
                      ].map((feat) => {
                        const Icon = feat.icon;
                        const isEnabled = features[feat.key] !== false;
                        return (
                          <button
                            key={feat.key}
                            type="button"
                            onClick={() => handleToggleFeature(comp, feat.key)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isEnabled
                                ? 'bg-sky-50/70 border-sky-200 text-sky-950 font-semibold shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-90'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${isEnabled ? 'text-sky-600' : 'text-slate-400'}`} />
                              <span className="truncate text-xs">{feat.label}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ml-1.5 ${
                                isEnabled ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isEnabled ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USER (TAMBAH, UBAH, NONAKTIFKAN, RESET SANDI, LEVEL TETAP) */}
      {/* ======================================================== */}
      {activeTabMode === 'users' && (
        <div className="space-y-4">
          {/* Top Bar User */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Manajemen Pengguna & Level Hak Akses</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pilih perusahaan dan 6 level tetap: Owner, Manager, Supervisor, Team Leader, Petugas, Klien.
              </p>
            </div>

            <button
              type="button"
              id="add-user-btn"
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah User Baru</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari berdasarkan nama, username, atau email..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Level:</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Level ({users.length})</option>
                {FIXED_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabel Pengguna */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Pengguna & Akun</th>
                    <th className="p-3.5">Perusahaan</th>
                    <th className="p-3.5">Level Akses</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Tidak ada pengguna yang cocok.</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Coba sesuaikan kata kunci pencarian atau ubah filter level.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    visibleUsers.map((u) => {
                      const isAktif = (u.status || 'aktif') === 'aktif';
                      const uCompId = u.company_id || u.companyId || 'comp-main';
                      const compObj = companies.find((c) => c.id === uCompId);
                      const isCurrent = u.id === currentUser?.id;
                      const levelName = u.level || (u.role === 'petugas' ? 'Petugas' : u.role === 'klien' ? 'Klien' : 'Supervisor');
                      const levelMeta = FIXED_LEVELS.find((l) => l.level === levelName);

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors ${
                            !isAktif ? 'bg-rose-50/30 opacity-75' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Nama & Akun */}
                          <td className="p-3.5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  !isAktif
                                    ? 'bg-slate-200 text-slate-500'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {u.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 truncate">{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>@{u.username || u.id}</span>
                                  <span>•</span>
                                  <span className="font-sans text-slate-400">{u.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Perusahaan */}
                          <td className="p-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {compObj?.logo ? (
                                  <img src={compObj.logo} alt={compObj.nama} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                              <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                                {compObj?.nama || uCompId}
                              </span>
                            </div>
                          </td>

                          {/* Level Akses (6 Level Tetap) */}
                          <td className="p-3.5 align-middle">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                levelMeta?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <Briefcase className="w-3 h-3" />
                              <span>{levelName}</span>
                            </span>
                          </td>

                          {/* Status Aktif / Nonaktif */}
                          <td className="p-3.5 align-middle text-center">
                            {isAktif ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="p-3.5 align-middle text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Toggle Status Aktif/Nonaktif */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={isCurrent}
                                title={isAktif ? 'Nonaktifkan Akun' : 'Aktifkan Kembali Akun'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : isAktif
                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              {/* Reset Sandi */}
                              <button
                                type="button"
                                onClick={() => handleResetUserPassword(u)}
                                title="Reset Kata Sandi"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Edit Data User */}
                              <button
                                type="button"
                                onClick={() => setEditingUser(u)}
                                title="Ubah Data User & Level"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Hapus User (Super Admin only) */}
                              {isSuperAdmin && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  title="Hapus Akun Pengguna"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH PERUSAHAAN (Khusus Super Admin) */}
      {/* ======================================================== */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <span>Tambah Perusahaan Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Contoh: PT Rajawali Sukses Mandiri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-sky-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Setelah dibuat, Anda dapat langsung mengunggah logo resmi perusahaan.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Perusahaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL UBAH NAMA PERUSAHAAN */}
      {/* ======================================================== */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-sky-600" />
                <span>Ubah Nama Perusahaan</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH USER (PILIH PERUSAHAAN & 6 LEVEL TETAP) */}
      {/* ======================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Tambah Pengguna Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Nama staf/karyawan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    placeholder="Otomatis dari email jika kosong"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="email@perusahaan.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Awal *</label>
                <input
                  type="text"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Pilih Perusahaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Perusahaan Induk *</label>
                {isSuperAdmin ? (
                  <select
                    value={addForm.company_id}
                    onChange={(e) => setAddForm({ ...addForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                    {companies.find((c) => c.id === userCompanyId)?.nama || userCompanyId}
                  </div>
                )}
              </div>

              {/* Pilih 6 Level Tetap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tingkat / Level Pengguna (6 Level Tetap) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FIXED_LEVELS.map((lvl) => {
                    const isSelected = addForm.level === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, level: lvl.level })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400/40 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {lvl.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{lvl.deskripsi}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDIT DATA USER & LEVEL */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>Ubah Data Pengguna: {editingUser.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Level Pengguna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tingkat / Level Pengguna (6 Level Tetap) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FIXED_LEVELS.map((lvl) => {
                    const isSelected = (editingUser.level || (editingUser.role === 'petugas' ? 'Petugas' : 'Supervisor')) === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, level: lvl.level })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400/40 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                            {lvl.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{lvl.deskripsi}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL HASIL RESET KATA SANDI */}
      {/* ======================================================== */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Kata Sandi Berhasil Direset</h3>
              <p className="text-xs text-slate-500 mt-1">
                Berikut adalah kata sandi sementara untuk akun <strong>{resetModalData.userName}</strong>:
              </p>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-2 font-mono text-sm font-bold text-slate-800 select-all">
              <span>{resetModalData.tempPass}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.tempPass);
                  showToast('Kata sandi disalin ke clipboard!');
                }}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Salin Sandi"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setResetModalData(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BAGIAN TERSIMPAN: MENU LAIN YANG RUMIT DISEMBUNYIKAN      */}
      {/* (KODE & KOMPONEN DIJAGA AGAR TIDAK HILANG / RUSAK)       */}
      {/* ======================================================== */}
      <div className="pt-4 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-100/80 hover:bg-slate-200/70 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Pengaturan Lanjutan & Modul Lama (Disembunyikan)</span>
          </div>
          {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedSettings && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { id: 'profile' as const, label: 'Kop & Profil' },
                { id: 'branding' as const, label: 'PWA Branding' },
                { id: 'notifications' as const, label: 'Web Push' },
                { id: 'log' as const, label: 'Audit Trail' },
                { id: 'bulk_delete' as const, label: 'Hapus Masal' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLegacySubTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    legacySubTab === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {legacySubTab === 'profile' && <CompanyProfileSettingsSection />}
            {legacySubTab === 'branding' && isSuperAdmin && <PwaBrandingSection />}
            {legacySubTab === 'notifications' && <NotificationSettingsSection />}
            {legacySubTab === 'log' && <AuditLogSection />}
            {legacySubTab === 'bulk_delete' && isSuperAdmin && <SuperAdminBulkDeleteSection />}
          </div>
        )}
      </div>
    </div>
  );
};
