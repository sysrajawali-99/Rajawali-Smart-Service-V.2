import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Search,
  Filter,
  Trash2,
  Edit3,
  Check,
  X,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  KeyRound,
  Power,
  Copy,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { AppUser, UserRole, UserStatus, JABATAN_PERMISSIONS_METADATA } from '../../types';

export const UserManagementSection: React.FC = () => {
  const {
    userRole,
    projects,
    users,
    addUser,
    updateUser,
    deleteUser,
    updateUserProjectAssignment,
    toggleUserStatus,
    resetUserPassword,
    companies,
    currentUser,
    jabatan,
  } = useCleaning();

  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isAdminPerusahaan = userRole === 'admin_perusahaan';
  const canManageUsers = isSuperAdmin || isAdminPerusahaan;

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  // Pagination state (Requirement 5)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AppUser | null>(null);

  // Reset Password Modal state (Requirement 4)
  const [resetModalData, setResetModalData] = useState<{
    userName: string;
    temporaryPassword: string;
    copied: boolean;
  } | null>(null);

  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const defaultUserCompany = useMemo(() => {
    return currentUser?.company_id || currentUser?.companyId || 'comp-main';
  }, [currentUser]);

  // Form State: Add User
  const [addForm, setAddForm] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    jabatanId: string;
    phone: string;
    company_id: string;
    assignedProjectIds: string[];
  }>({
    name: '',
    username: '',
    email: '',
    password: 'petugas123',
    role: 'petugas',
    jabatanId: '',
    phone: '',
    company_id: defaultUserCompany,
    assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
  });

  // Form State: Edit User
  const [editForm, setEditForm] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    jabatanId: string;
    status: UserStatus;
    phone: string;
    company_id: string;
    assignedProjectIds: string[];
  }>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'petugas',
    jabatanId: '',
    status: 'aktif',
    phone: '',
    company_id: defaultUserCompany,
    assignedProjectIds: [],
  });

  // Available Jabatan for the company in Add Form
  const addFormJabatanList = useMemo(() => {
    const targetComp = isSuperAdmin ? addForm.company_id : defaultUserCompany;
    return jabatan.filter(
      (j) => (j.company_id || j.companyId || 'comp-main') === targetComp
    );
  }, [jabatan, addForm.company_id, defaultUserCompany, isSuperAdmin]);

  // Available Jabatan for the company in Edit Form
  const editFormJabatanList = useMemo(() => {
    const targetComp = isSuperAdmin ? editForm.company_id : defaultUserCompany;
    return jabatan.filter(
      (j) => (j.company_id || j.companyId || 'comp-main') === targetComp
    );
  }, [jabatan, editForm.company_id, defaultUserCompany, isSuperAdmin]);

  // Helper: Get user's Jabatan label
  const getUserJabatan = (u: AppUser) => {
    if (u.jabatanId) {
      const found = jabatan.find((j) => j.id === u.jabatanId);
      if (found) return found;
    }
    // Fallback to role-based default jabatan
    return jabatan.find(
      (j) =>
        (j.company_id || j.companyId || 'comp-main') ===
          (u.company_id || u.companyId || 'comp-main') &&
        j.defaultRoleCode === u.role
    );
  };

  // Open edit modal
  const handleOpenEdit = (u: AppUser) => {
    setEditingUser(u);
    const uComp = u.company_id || u.companyId || defaultUserCompany;
    const defaultJab = getUserJabatan(u);
    setEditForm({
      name: u.name,
      username: u.username || '',
      email: u.email,
      password: '',
      role: u.role,
      jabatanId: u.jabatanId || defaultJab?.id || '',
      status: u.status || 'aktif',
      phone: u.phone || '',
      company_id: uComp,
      assignedProjectIds: u.assignedProjectIds ? [...u.assignedProjectIds] : [],
    });
  };

  // Counts by role and status
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) {
      return users;
    }
    // Admin Perusahaan only sees users belonging to their own company
    return users.filter(
      (u) => (u.company_id || u.companyId || 'comp-main') === defaultUserCompany
    );
  }, [users, isSuperAdmin, defaultUserCompany]);

  const totalUsers = visibleUsers.length;
  const countAktif = visibleUsers.filter((u) => (u.status || 'aktif') === 'aktif').length;
  const countNonaktif = visibleUsers.filter((u) => u.status === 'nonaktif').length;
  const countPetugas = visibleUsers.filter((u) => u.role === 'petugas').length;
  const countKlien = visibleUsers.filter((u) => u.role === 'klien').length;
  const countSpv = visibleUsers.filter((u) => u.role === 'supervisor').length;
  const countAdmin = visibleUsers.filter(
    (u) => u.role === 'admin' || u.role === 'super_admin' || u.role === 'admin_perusahaan'
  ).length;

  // Filtered users with Search and Filter
  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((u) => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Status filter
      const userStatus = u.status || 'aktif';
      if (statusFilter !== 'all' && userStatus !== statusFilter) return false;

      // Search Query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const jab = getUserJabatan(u);
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      const matchJabatan = jab ? jab.nama.toLowerCase().includes(q) : false;
      const matchStatus = userStatus.toLowerCase().includes(q);
      const matchProjects = (u.assignedProjectIds || []).some((projId) => {
        const p = projects.find((proj) => proj.id === projId);
        return p ? p.name.toLowerCase().includes(q) : false;
      });

      return (
        matchName ||
        matchUsername ||
        matchEmail ||
        matchPhone ||
        matchJabatan ||
        matchStatus ||
        matchProjects
      );
    });
  }, [visibleUsers, roleFilter, statusFilter, searchQuery, projects, jabatan]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, safeCurrentPage, itemsPerPage]);

  // Handle Quick Toggle Project Access in table
  const handleToggleProjectAccess = (userId: string, projId: string) => {
    if (!canManageUsers) return;
    const target = visibleUsers.find((u) => u.id === userId);
    if (!target) return;

    const current = target.assignedProjectIds || [];
    const isChecked = current.includes(projId);
    const updated = isChecked ? current.filter((id) => id !== projId) : [...current, projId];

    updateUserProjectAssignment(userId, updated);
    const proj = projects.find((p) => p.id === projId);
    showToast(
      `${!isChecked ? 'Memberikan akses' : 'Mencabut akses'} proyek "${proj?.name || projId}" untuk ${target.name}.`
    );
  };

  // Handle Batch Set All Projects
  const handleBatchProjects = (userId: string, allowAll: boolean) => {
    if (!canManageUsers) return;
    const target = visibleUsers.find((u) => u.id === userId);
    if (!target) return;

    const updated = allowAll ? projects.map((p) => p.id) : [];
    updateUserProjectAssignment(userId, updated);
    showToast(
      allowAll
        ? `Seluruh lokasi proyek (${projects.length} lokasi) diizinkan untuk ${target.name}.`
        : `Semua hak akses lokasi proyek untuk ${target.name} dikosongkan.`
    );
  };

  // Submit Add User (Requirement 3 & 4)
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;

    if (!addForm.name.trim()) {
      showToast('Silakan masukkan Nama Pengguna.', 'error');
      return;
    }

    const cleanUsername = (
      addForm.username.trim() || addForm.name.toLowerCase().replace(/\s+/g, '_')
    ).toLowerCase();

    // Check username uniqueness
    const exists = users.some((u) => (u.username || '').toLowerCase() === cleanUsername);
    if (exists) {
      showToast(`Username "${cleanUsername}" sudah digunakan akun lain.`, 'error');
      return;
    }

    // Role safety: Admin Perusahaan cannot create Super Admin or other Admin Perusahaan
    if (!isSuperAdmin) {
      if (addForm.role === 'super_admin' || addForm.role === 'admin_perusahaan' || addForm.role === 'admin') {
        showToast('Anda tidak dapat membuat akun dengan peran yang melebihi hak Anda.', 'error');
        return;
      }
    }

    if (
      addForm.role !== 'admin' &&
      addForm.role !== 'super_admin' &&
      addForm.assignedProjectIds.length === 0
    ) {
      showToast('Harap pilih minimal 1 lokasi proyek yang dapat diakses oleh pengguna ini.', 'error');
      return;
    }

    const defaultPass =
      addForm.role === 'super_admin' || addForm.role === 'admin' || addForm.role === 'admin_perusahaan'
        ? 'admin123'
        : addForm.role === 'supervisor'
        ? 'spv123'
        : addForm.role === 'petugas'
        ? 'petugas123'
        : 'klien123';

    // Requirement 5: Satu user hanya punya satu perusahaan induk
    const targetCompanyId = isSuperAdmin ? (addForm.company_id || defaultUserCompany) : defaultUserCompany;

    const newUser = addUser({
      name: addForm.name.trim(),
      username: cleanUsername,
      email: addForm.email.trim() || `${cleanUsername}@cleaningops.com`,
      password: addForm.password.trim() || defaultPass,
      role: addForm.role,
      jabatanId: addForm.jabatanId || undefined,
      status: 'aktif',
      phone: addForm.phone.trim() || undefined,
      company_id: targetCompanyId,
      companyId: targetCompanyId,
      assignedProjectIds:
        addForm.role === 'admin' || addForm.role === 'super_admin'
          ? projects.map((p) => p.id)
          : addForm.assignedProjectIds,
    });

    showToast(`Pengguna baru ${newUser.name} (${newUser.role}) berhasil ditambahkan!`);
    setShowAddModal(false);

    // Reset Form
    setAddForm({
      name: '',
      username: '',
      email: '',
      password: 'petugas123',
      role: 'petugas',
      jabatanId: '',
      phone: '',
      company_id: defaultUserCompany,
      assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
    });
  };

  // Submit Edit User (Requirement 3 & 4)
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !canManageUsers) return;

    if (!editForm.name.trim()) {
      showToast('Silakan masukkan Nama Pengguna.', 'error');
      return;
    }

    // Protect last Super Admin
    if (
      (editingUser.role === 'super_admin' || editingUser.role === 'admin') &&
      editForm.role !== 'super_admin' &&
      editForm.role !== 'admin'
    ) {
      const remainingSuperAdmins = users.filter(
        (u) =>
          (u.role === 'super_admin' || u.role === 'admin') &&
          u.id !== editingUser.id &&
          u.status !== 'nonaktif'
      );
      if (remainingSuperAdmins.length === 0) {
        showToast(
          'Aplikasi menolak menurunkan Super Admin terakhir. Harus ada setidaknya satu Super Admin aktif.',
          'error'
        );
        return;
      }
    }

    // Privilege Escalation check: Admin Perusahaan cannot upgrade to Super Admin
    if (!isSuperAdmin) {
      if (editForm.role === 'super_admin' || editForm.role === 'admin') {
        showToast('Anda tidak dapat menaikkan hak akses menjadi Super Administrator.', 'error');
        return;
      }
    }

    const cleanUsername = editForm.username.trim().toLowerCase();
    const isDuplicateUsername = users.some(
      (u) => u.id !== editingUser.id && (u.username || '').toLowerCase() === cleanUsername
    );

    if (isDuplicateUsername) {
      showToast(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`, 'error');
      return;
    }

    if (
      editForm.role !== 'admin' &&
      editForm.role !== 'super_admin' &&
      editForm.assignedProjectIds.length === 0
    ) {
      showToast('Harap pilih minimal 1 lokasi proyek yang diizinkan untuk pengguna ini.', 'error');
      return;
    }

    const targetCompanyId = isSuperAdmin
      ? (editForm.company_id || defaultUserCompany)
      : (editingUser.company_id || defaultUserCompany);

    updateUser(editingUser.id, {
      name: editForm.name.trim(),
      username: cleanUsername || undefined,
      email: editForm.email.trim(),
      password: editForm.password.trim() || undefined,
      role: editForm.role,
      jabatanId: editForm.jabatanId || undefined,
      status: editForm.status,
      phone: editForm.phone.trim() || undefined,
      company_id: targetCompanyId,
      companyId: targetCompanyId,
      assignedProjectIds:
        editForm.role === 'admin' || editForm.role === 'super_admin'
          ? projects.map((p) => p.id)
          : editForm.assignedProjectIds,
    });

    showToast(`Perubahan data akun ${editForm.name} berhasil disimpan.`);
    setEditingUser(null);
  };

  // Toggle user active / inactive status (Requirement 4)
  const handleToggleStatus = async (user: AppUser) => {
    if (!canManageUsers) return;

    // Tidak boleh menonaktifkan akun sendiri
    if (user.id === currentUser?.id) {
      showToast('Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan saat ini.', 'error');
      return;
    }

    // Admin Perusahaan tidak boleh menonaktifkan Super Admin
    if (!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) {
      showToast('Anda tidak dapat menonaktifkan akun Super Administrator.', 'error');
      return;
    }

    // Tidak boleh menonaktifkan Super Admin terakhir
    if ((user.role === 'super_admin' || user.role === 'admin') && user.status !== 'nonaktif') {
      const remainingSuperAdmins = users.filter(
        (u) =>
          (u.role === 'super_admin' || u.role === 'admin') &&
          u.id !== user.id &&
          u.status !== 'nonaktif'
      );
      if (remainingSuperAdmins.length === 0) {
        showToast(
          'Menolak menonaktifkan Super Admin terakhir. Harus ada setidaknya satu Super Admin aktif.',
          'error'
        );
        return;
      }
    }

    const actionWord = user.status === 'nonaktif' ? 'mengaktifkan kembali' : 'menonaktifkan';
    const confirmChange = window.confirm(
      `Apakah Anda yakin ingin ${actionWord} akun "${user.name}" (@${user.username || user.id})?\n\n` +
        (user.status === 'nonaktif'
          ? 'Pengguna akan dapat login kembali.'
          : 'Pengguna akan segera ditolak oleh server pada semua permintaan dan tidak dapat login lagi sampai diaktifkan kembali.')
    );
    if (!confirmChange) return;

    const res = await toggleUserStatus(user.id);
    if (res.success) {
      showToast(
        res.message ||
          `Akun ${user.name} berhasil ${res.status === 'nonaktif' ? 'dinonaktifkan' : 'diaktifkan kembali'}.`,
        res.status === 'nonaktif' ? 'info' : 'success'
      );
    } else {
      showToast(res.message || 'Gagal mengubah status akun pengguna.', 'error');
    }
  };

  // Reset user password (Requirement 4)
  const handleResetPassword = async (user: AppUser) => {
    if (!canManageUsers) return;

    if (!isSuperAdmin && (user.role === 'super_admin' || user.role === 'admin')) {
      showToast('Anda tidak dapat mereset sandi Super Administrator.', 'error');
      return;
    }

    const confirmReset = window.confirm(
      `Reset kata sandi akun "${user.name}" (@${user.username || user.id})?\n\n` +
        'Sistem akan menghasilkan kata sandi sementara sekali pakai. Pengguna akan diwajibkan mengganti kata sandinya saat login berikutnya.'
    );
    if (!confirmReset) return;

    const res = await resetUserPassword(user.id);
    if (res.success && res.temporaryPassword) {
      setResetModalData({
        userName: user.name,
        temporaryPassword: res.temporaryPassword,
        copied: false,
      });
      showToast(`Kata sandi akun ${user.name} berhasil direset.`);
    } else {
      showToast(res.message || 'Gagal mereset kata sandi pengguna.', 'error');
    }
  };

  // Confirm Permanent Delete User (Requirement 4: Hapus permanen HANYA untuk super_admin)
  const handleConfirmDelete = () => {
    if (!deleteTargetUser) return;
    if (!isSuperAdmin) {
      showToast('Hanya Super Administrator yang dapat menghapus permanen pengguna.', 'error');
      setDeleteTargetUser(null);
      return;
    }

    if (deleteTargetUser.role === 'super_admin' || deleteTargetUser.role === 'admin') {
      const remainingSuperAdmins = users.filter(
        (u) => (u.role === 'super_admin' || u.role === 'admin') && u.id !== deleteTargetUser.id
      );
      if (remainingSuperAdmins.length === 0) {
        showToast(
          'Aplikasi menolak menghapus Super Admin terakhir. Harus ada setidaknya satu Super Admin aktif.',
          'error'
        );
        setDeleteTargetUser(null);
        return;
      }
    }

    const res = deleteUser(deleteTargetUser.id);
    if (res.success) {
      showToast(res.message || `Akun ${deleteTargetUser.name} berhasil dihapus permanen.`);
    } else {
      showToast(res.message || 'Gagal menghapus pengguna.', 'error');
    }
    setDeleteTargetUser(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Manajemen Pengguna, Jabatan & Hak Akses Proyek
                </h3>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-[11px] border border-indigo-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Super Administrator
                  </span>
                ) : isAdminPerusahaan ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold text-[11px] border border-purple-200">
                    <Building2 className="w-3.5 h-3.5" />
                    Admin Perusahaan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                    <Lock className="w-3 h-3" />
                    Hanya Lihat
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Kelola akun staf operasional, pengawas, dan perwakilan klien. Atur jabatan terikat perusahaan, penugasan lokasi proyek, status aktif/nonaktif, dan reset kata sandi sekali pakai.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canManageUsers && (
              <button
                type="button"
                onClick={() => {
                  const defaultJab = addFormJabatanList[0]?.id || '';
                  setAddForm({
                    name: '',
                    username: '',
                    email: '',
                    password: 'petugas123',
                    role: 'petugas',
                    jabatanId: defaultJab,
                    phone: '',
                    company_id: defaultUserCompany,
                    assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
                  });
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => {
              setRoleFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalUsers})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('petugas');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'petugas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            👷 Petugas ({countPetugas})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('supervisor');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'supervisor'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            📋 Supervisor ({countSpv})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('klien');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'klien'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            🏢 Klien ({countKlien})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter('admin');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'admin'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            🛡️ Administrator ({countAdmin})
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === 'aktif' ? 'all' : 'aktif');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'aktif'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
              title="Filter pengguna aktif"
            >
              Aktif ({countAktif})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === 'nonaktif' ? 'all' : 'nonaktif');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'nonaktif'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
              title="Filter pengguna nonaktif"
            >
              Nonaktif ({countNonaktif})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, username, jabatan, email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Users Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5 w-60">Nama & Kredensial</th>
              <th className="p-3.5 w-44">Jabatan & Peran</th>
              <th className="p-3.5 w-24 text-center">Status</th>
              <th className="p-3.5">
                <div className="flex items-center justify-between">
                  <span>Lokasi Proyek yang Diizinkan</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase italic">
                    (penugasan proyek)
                  </span>
                </div>
              </th>
              <th className="p-3.5 text-right w-36">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Tidak ada pengguna yang sesuai kriteria.</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coba sesuaikan kata kunci pencarian atau reset filter role/status di atas.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => {
                const isAdmin =
                  u.role === 'admin' ||
                  u.role === 'super_admin' ||
                  u.role === 'admin_perusahaan';
                const assignedCount = u.assignedProjectIds?.length || 0;
                const jab = getUserJabatan(u);
                const isAktif = (u.status || 'aktif') === 'aktif';
                const isCurrentLoggedIn = u.id === currentUser?.id;

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      !isAktif
                        ? 'bg-rose-50/40 opacity-80 hover:bg-rose-50/70'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Column 1: User Identity & Credentials */}
                    <td className="p-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative ${
                            !isAktif
                              ? 'bg-slate-200 text-slate-500'
                              : u.role === 'super_admin' || u.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-700'
                              : u.role === 'admin_perusahaan'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-700'
                              : u.role === 'petugas'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                          {!isAktif && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"
                              title="Akun Nonaktif"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                              {u.name}
                            </span>
                            {isCurrentLoggedIn && (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-400">@</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {u.username || u.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Jabatan & Peran */}
                    <td className="p-3.5 align-top">
                      <div className="space-y-1">
                        {jab ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[11px]">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[120px]">{jab.nama}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span>Jabatan Standar</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize border ${
                              u.role === 'admin' || u.role === 'super_admin'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : u.role === 'admin_perusahaan'
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : u.role === 'supervisor'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : u.role === 'petugas'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-sky-50 border-sky-200 text-sky-700'
                            }`}
                          >
                            {u.role === 'super_admin'
                              ? 'Super Admin'
                              : u.role === 'admin'
                              ? 'Admin'
                              : u.role === 'admin_perusahaan'
                              ? 'Admin Perusahaan'
                              : u.role === 'supervisor'
                              ? 'Supervisor'
                              : u.role === 'petugas'
                              ? 'Petugas'
                              : 'Klien'}
                          </span>

                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {companies.find(
                                (c) => c.id === (u.company_id || u.companyId)
                              )?.nama || (u.company_id || u.companyId || 'comp-main')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Status Akun (Aktif / Nonaktif) */}
                    <td className="p-3.5 align-top text-center">
                      {isAktif ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Aktif
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] shadow-2xs"
                          title="Pengguna nonaktif: server langsung menolak semua permintaan token"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Column 4: Allowed Projects */}
                    <td className="p-3.5 align-top">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Semua Proyek ({projects.length} Lokasi) — Akses Administrator Penuh</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {projects.map((proj) => {
                              const isChecked = u.assignedProjectIds?.includes(proj.id) || false;
                              return (
                                <button
                                  key={proj.id}
                                  type="button"
                                  disabled={!canManageUsers}
                                  onClick={() => handleToggleProjectAccess(u.id, proj.id)}
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all border ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                  } ${canManageUsers ? 'cursor-pointer' : 'cursor-default'}`}
                                  title={
                                    canManageUsers
                                      ? `Klik untuk ${isChecked ? 'batalkan akses' : 'izinkan akses'} ke ${proj.name}`
                                      : proj.name
                                  }
                                >
                                  <span
                                    className={`w-3 h-3 rounded-xs border flex items-center justify-center text-[9px] ${
                                      isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isChecked && '✓'}
                                  </span>
                                  <span className="truncate max-w-[130px]">{proj.name}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Batch Select */}
                          {canManageUsers && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                              <span>Pilih Cepat:</span>
                              <button
                                type="button"
                                onClick={() => handleBatchProjects(u.id, true)}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                              >
                                Semua Lokasi
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleBatchProjects(u.id, false)}
                                className="text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                              >
                                Kosongkan
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 5: Action Buttons */}
                    <td className="p-3.5 align-top text-right">
                      {canManageUsers ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Tombol NONAKTIFKAN / AKTIFKAN (Requirement 4) */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrentLoggedIn}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isCurrentLoggedIn
                                ? 'text-slate-300 cursor-not-allowed'
                                : isAktif
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={
                              isCurrentLoggedIn
                                ? 'Tidak bisa menonaktifkan akun sendiri'
                                : isAktif
                                ? 'Nonaktifkan Akun Pengguna'
                                : 'Aktifkan Kembali Akun'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Tombol RESET PASSWORD (Requirement 4) */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Reset Kata Sandi (Buat sandi sementara)"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Tombol EDIT DATA */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Pengguna & Jabatan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Tombol HAPUS PERMANEN (Hanya Super Admin) */}
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              disabled={
                                (u.role === 'super_admin' || u.role === 'admin') &&
                                users.filter(
                                  (x) => x.role === 'super_admin' || x.role === 'admin'
                                ).length <= 1
                              }
                              onClick={() => setDeleteTargetUser(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                (u.role === 'super_admin' || u.role === 'admin') &&
                                users.filter(
                                  (x) => x.role === 'super_admin' || x.role === 'admin'
                                ).length <= 1
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                (u.role === 'super_admin' || u.role === 'admin') &&
                                users.filter(
                                  (x) => x.role === 'super_admin' || x.role === 'admin'
                                ).length <= 1
                                  ? 'Super Admin terakhir tidak dapat dihapus'
                                  : `Hapus Permanen Akun ${u.name}`
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Hanya Super Admin yang dapat menghapus permanen pengguna. Gunakan tombol Nonaktifkan."
                            >
                              <Trash2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Requirement 5) */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-500">
          Menampilkan{' '}
          <strong className="text-slate-800 font-semibold">
            {filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1}
          </strong>{' '}
          -{' '}
          <strong className="text-slate-800 font-semibold">
            {Math.min(safeCurrentPage * itemsPerPage, filteredUsers.length)}
          </strong>{' '}
          dari <strong className="text-slate-800 font-semibold">{filteredUsers.length}</strong> pengguna
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                safeCurrentPage <= 1
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-white cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
              if (
                pg === 1 ||
                pg === totalPages ||
                (pg >= safeCurrentPage - 1 && pg <= safeCurrentPage + 1)
              ) {
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      safeCurrentPage === pg
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pg}
                  </button>
                );
              }
              if (pg === 2 && safeCurrentPage > 3) {
                return (
                  <span key="dots-1" className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              if (pg === totalPages - 1 && safeCurrentPage < totalPages - 2) {
                return (
                  <span key="dots-2" className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                safeCurrentPage >= totalPages
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-white cursor-pointer'
              }`}
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Tambah Pengguna Baru */}
      {showAddModal && canManageUsers && (
        <div
          id="add-user-modal-backdrop"
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="add-user-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Tambah Akun Pengguna Baru</h4>
                  <p className="text-xs text-slate-500">
                    Pilih jabatan terikat perusahaan dan tentukan lokasi proyek yang diizinkan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
              {/* Pilihan Peran / Role Akun */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  1. Pilih Peran Dasar / Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        role: 'petugas',
                        password: addForm.password || 'petugas123',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addForm.role === 'petugas'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">👷 Petugas</div>
                    <div className="text-[10px] text-emerald-700 font-medium">Tugas Lapangan & Ceklist</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        role: 'klien',
                        password: addForm.password || 'klien123',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addForm.role === 'klien'
                        ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold ring-2 ring-sky-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🏢 Klien / Tenant</div>
                    <div className="text-[10px] text-sky-700 font-medium">Portal Monitoring Gedung</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        role: 'supervisor',
                        password: addForm.password || 'spv123',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addForm.role === 'supervisor'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">📋 Supervisor</div>
                    <div className="text-[10px] text-amber-700 font-medium">Audit QC & Shift</div>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setAddForm({
                          ...addForm,
                          role: 'admin_perusahaan',
                          password: addForm.password || 'admin123',
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        addForm.role === 'admin_perusahaan'
                          ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold ring-2 ring-purple-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-sm mb-0.5">🏢 Admin Perusahaan</div>
                      <div className="text-[10px] text-purple-700 font-medium">Pengelola 1 Tenant</div>
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setAddForm({
                          ...addForm,
                          role: 'super_admin',
                          password: addForm.password || 'admin123',
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        addForm.role === 'super_admin' || addForm.role === 'admin'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-2 ring-indigo-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-sm mb-0.5">🛡️ Super Admin</div>
                      <div className="text-[10px] text-indigo-700 font-medium">Akses Global Penuh</div>
                    </button>
                  )}
                </div>
              </div>

              {/* Pemilihan Perusahaan Induk (Requirement 5: Satu user hanya punya satu perusahaan induk) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Perusahaan Induk Pengguna <span className="text-rose-500">*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={addForm.company_id}
                    onChange={(e) => {
                      const newComp = e.target.value;
                      const nextJabs = jabatan.filter(
                        (j) => (j.company_id || j.companyId || 'comp-main') === newComp
                      );
                      setAddForm({
                        ...addForm,
                        company_id: newComp,
                        jabatanId: nextJabs[0]?.id || '',
                      });
                    }}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.nama} ({comp.id}) {comp.status !== 'aktif' ? `[${comp.status}]` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium flex items-center justify-between">
                    <span>
                      {companies.find((c) => c.id === defaultUserCompany)?.nama || 'Perusahaan Anda'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">1 Induk Perusahaan</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Satu user terikat tepat pada satu perusahaan induk sesuai standar multi-tenant.
                </p>
              </div>

              {/* Pemilihan Jabatan & Matriks Izin Terkait (Requirement 1 & 4) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  3. Pilih Jabatan (Matriks Hak Akses Izin) <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={addForm.jabatanId}
                    onChange={(e) => setAddForm({ ...addForm, jabatanId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  >
                    <option value="">— Gunakan Izin Standar Berdasarkan Peran —</option>
                    {addFormJabatanList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama} {j.isDefault ? '(Bawaan)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Permissions Preview */}
                  {(() => {
                    const selectedJab = addFormJabatanList.find((j) => j.id === addForm.jabatanId);
                    if (!selectedJab) return null;
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          <span>Izin Aktif pada Jabatan "{selectedJab.nama}":</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(selectedJab.permissions).map(([key, val]) => {
                            const meta =
                              JABATAN_PERMISSIONS_METADATA[key as keyof typeof JABATAN_PERMISSIONS_METADATA];
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  val
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                                }`}
                              >
                                {val ? '✓' : '✗'} {meta?.label || key}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Data Identitas Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    placeholder="otomatis dari nama"
                    value={addForm.username}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      })
                    }
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="nama@cleaningops.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi Awal <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full text-xs pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="0812-3456-7890"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Project Assignments (Requirement 3 & 5) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-900 block text-xs">
                      4. Penugasan Lokasi Proyek yang Diizinkan <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Klien dan petugas hanya melihat proyek dan laporan yang ditugaskan kepada mereka.
                    </p>
                  </div>
                  {addForm.role !== 'admin' && addForm.role !== 'super_admin' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setAddForm({
                            ...addForm,
                            assignedProjectIds: projects.map((p) => p.id),
                          })
                        }
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setAddForm({ ...addForm, assignedProjectIds: [] })}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  )}
                </div>

                {addForm.role === 'admin' || addForm.role === 'super_admin' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Akses Penuh ke Seluruh Lokasi Proyek</p>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Administrator otomatis memiliki akses penuh ke seluruh proyek gedung terdaftar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {projects.map((proj) => {
                      const isChecked = addForm.assignedProjectIds.includes(proj.id);
                      return (
                        <label
                          key={proj.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-semibold ring-1 ring-blue-300'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...addForm.assignedProjectIds, proj.id]
                                : addForm.assignedProjectIds.filter((id) => id !== proj.id);
                              setAddForm({ ...addForm, assignedProjectIds: next });
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{proj.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {proj.city} • {proj.totalFloors} Lantai
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengguna Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {editingUser && canManageUsers && (
        <div
          id="edit-user-modal-backdrop"
          onClick={() => setEditingUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="edit-user-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Edit Pengguna, Jabatan & Izin</h4>
                  <p className="text-xs text-slate-500">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Peran / Role */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Peran / Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="petugas">👷 Petugas Lapangan</option>
                    <option value="klien">🏢 Klien / Tenant</option>
                    <option value="supervisor">📋 Supervisor Operasional</option>
                    {isSuperAdmin && (
                      <>
                        <option value="admin_perusahaan">🏢 Admin Perusahaan</option>
                        <option value="super_admin">🛡️ Super Administrator</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Status Akun */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Status Akun</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as UserStatus })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="aktif">🟢 Aktif (Bisa Login & Beroperasi)</option>
                    <option value="nonaktif">🔴 Nonaktif (Ditolak Server)</option>
                  </select>
                </div>
              </div>

              {/* Pemilihan Jabatan */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Jabatan & Matriks Izin Terkait <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.jabatanId}
                  onChange={(e) => setEditForm({ ...editForm, jabatanId: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                >
                  <option value="">— Gunakan Izin Standar Berdasarkan Peran —</option>
                  {editFormJabatanList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} {j.isDefault ? '(Bawaan)' : ''}
                    </option>
                  ))}
                </select>

                {(() => {
                  const selectedJab = editFormJabatanList.find((j) => j.id === editForm.jabatanId);
                  if (!selectedJab) return null;
                  return (
                    <div className="p-3 mt-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                        <span>Izin Aktif pada Jabatan "{selectedJab.nama}":</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(selectedJab.permissions).map(([key, val]) => {
                          const meta =
                            JABATAN_PERMISSIONS_METADATA[key as keyof typeof JABATAN_PERMISSIONS_METADATA];
                          return (
                            <span
                              key={key}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                val
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                              }`}
                            >
                              {val ? '✓' : '✗'} {meta?.label || key}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Identitas Pengguna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      })
                    }
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ubah Kata Sandi (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Kosongkan jika tidak diganti"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full text-xs pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="0812-3456-7890"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Project Assignments */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-900 block text-xs">
                      Lokasi Proyek yang Diizinkan
                    </label>
                    <p className="text-[11px] text-slate-500">
                      User hanya dapat melihat data pada lokasi proyek yang dicentang.
                    </p>
                  </div>
                  {editForm.role !== 'admin' && editForm.role !== 'super_admin' && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            assignedProjectIds: projects.map((p) => p.id),
                          })
                        }
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, assignedProjectIds: [] })}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  )}
                </div>

                {editForm.role === 'admin' || editForm.role === 'super_admin' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Akses Penuh ke Semua Proyek</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {projects.map((proj) => {
                      const isChecked = editForm.assignedProjectIds.includes(proj.id);
                      return (
                        <label
                          key={proj.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-semibold ring-1 ring-blue-300'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...editForm.assignedProjectIds, proj.id]
                                : editForm.assignedProjectIds.filter((id) => id !== proj.id);
                              setEditForm({ ...editForm, assignedProjectIds: next });
                            }}
                            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{proj.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {proj.city} • {proj.totalFloors} Lantai
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sukses Reset Kata Sandi (Requirement 4) */}
      {resetModalData && (
        <div
          id="reset-password-modal-backdrop"
          onClick={() => setResetModalData(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="reset-password-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Kata Sandi Berhasil Direset</h4>
                <p className="text-xs text-slate-500">Sandi sementara sekali pakai telah dibuat di server</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs text-slate-600">
                Akun: <strong className="text-slate-900">{resetModalData.userName}</strong>
              </div>
              <div className="text-[11px] text-slate-500">Kata Sandi Sementara:</div>
              <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-300 font-mono text-sm font-bold text-slate-900">
                <span>{resetModalData.temporaryPassword}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetModalData.temporaryPassword);
                    setResetModalData({ ...resetModalData, copied: true });
                    setTimeout(() => {
                      setResetModalData((prev) => (prev ? { ...prev, copied: false } : null));
                    }, 2500);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    resetModalData.copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {resetModalData.copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Pengguna akan <strong>diwajibkan mengubah kata sandi baru</strong> pada saat berhasil login pertama kali dengan sandi sementara ini.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Permanen Pengguna (Hanya Super Admin) */}
      {deleteTargetUser && isSuperAdmin && (
        <div
          id="delete-user-modal-backdrop"
          onClick={() => setDeleteTargetUser(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="delete-user-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Hapus Permanen Akun?</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama:</span>
                <span className="font-bold text-slate-900">{deleteTargetUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono text-slate-700">
                  @{deleteTargetUser.username || deleteTargetUser.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{deleteTargetUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peran:</span>
                <span className="font-semibold text-slate-800 capitalize">{deleteTargetUser.role}</span>
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium">
              Data akun akan dihapus permanen dari basis data sistem. Jika hanya ingin mencabut akses tanpa menghapus data, gunakan tombol <strong>Nonaktifkan</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold z-50 animate-in fade-in slide-in-from-bottom-2 border ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : toastMessage.type === 'info'
              ? 'bg-amber-900 text-white border-amber-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              toastMessage.type === 'error'
                ? 'bg-rose-400'
                : toastMessage.type === 'info'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
