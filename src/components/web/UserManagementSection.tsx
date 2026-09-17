import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
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
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { AppUser, UserRole } from '../../types';

export const UserManagementSection: React.FC = () => {
  const {
    userRole,
    projects,
    users,
    addUser,
    updateUser,
    deleteUser,
    updateUserProjectAssignment,
    setActiveTab,
  } = useCleaning();

  const isSuperAdmin = userRole === 'admin';

  // Search and Role Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AppUser | null>(null);

  // Password visibility states
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Add User Form State
  const [addForm, setAddForm] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
    assignedProjectIds: string[];
  }>({
    name: '',
    username: '',
    email: '',
    password: 'petugas123',
    role: 'petugas',
    phone: '',
    assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState<{
    name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    phone: string;
    assignedProjectIds: string[];
  }>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'petugas',
    phone: '',
    assignedProjectIds: [],
  });

  // When opening edit modal
  const handleOpenEdit = (u: AppUser) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      username: u.username || '',
      email: u.email,
      password: u.password || '',
      role: u.role,
      phone: u.phone || '',
      assignedProjectIds: u.assignedProjectIds ? [...u.assignedProjectIds] : [],
    });
  };

  // Counts by role
  const totalUsers = users.length;
  const countPetugas = users.filter((u) => u.role === 'petugas').length;
  const countKlien = users.filter((u) => u.role === 'klien').length;
  const countSpv = users.filter((u) => u.role === 'supervisor').length;
  const countAdmin = users.filter((u) => u.role === 'admin').length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchRole;

      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = (u.phone || '').toLowerCase().includes(q);
      const matchProjects = (u.assignedProjectIds || []).some((projId) => {
        const p = projects.find((proj) => proj.id === projId);
        return p ? p.name.toLowerCase().includes(q) : false;
      });

      return matchRole && (matchName || matchUsername || matchEmail || matchPhone || matchProjects);
    });
  }, [users, roleFilter, searchQuery, projects]);

  // Handle Quick Toggle Project Access in table
  const handleToggleProjectAccess = (userId: string, projId: string) => {
    if (!isSuperAdmin) return;
    const target = users.find((u) => u.id === userId);
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
    if (!isSuperAdmin) return;
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const updated = allowAll ? projects.map((p) => p.id) : [];
    updateUserProjectAssignment(userId, updated);
    showToast(
      allowAll
        ? `Seluruh lokasi proyek (${projects.length} lokasi) diizinkan untuk ${target.name}.`
        : `Semua hak akses lokasi proyek untuk ${target.name} dikosongkan.`
    );
  };

  // Submit Add User
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    if (!addForm.name.trim()) {
      alert('Silakan masukkan Nama Pengguna.');
      return;
    }

    const cleanUsername = (addForm.username.trim() || addForm.name.toLowerCase().replace(/\s+/g, '_')).toLowerCase();

    // Check username uniqueness
    const exists = users.some((u) => (u.username || '').toLowerCase() === cleanUsername);
    if (exists) {
      alert(`Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.`);
      return;
    }

    if (addForm.role !== 'admin' && addForm.assignedProjectIds.length === 0) {
      alert('Harap pilih minimal 1 lokasi proyek yang dapat diakses oleh pengguna ini.');
      return;
    }

    const defaultPass =
      addForm.role === 'admin'
        ? 'admin123'
        : addForm.role === 'supervisor'
        ? 'spv123'
        : addForm.role === 'petugas'
        ? 'petugas123'
        : 'klien123';

    const newUser = addUser({
      name: addForm.name.trim(),
      username: cleanUsername,
      email: addForm.email.trim() || `${cleanUsername}@cleaningops.com`,
      password: addForm.password.trim() || defaultPass,
      role: addForm.role,
      phone: addForm.phone.trim() || undefined,
      assignedProjectIds:
        addForm.role === 'admin' ? projects.map((p) => p.id) : addForm.assignedProjectIds,
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
      phone: '',
      assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
    });
  };

  // Submit Edit User
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isSuperAdmin) return;

    if (!editForm.name.trim()) {
      alert('Silakan masukkan Nama Pengguna.');
      return;
    }

    const cleanUsername = editForm.username.trim().toLowerCase();
    const isDuplicateUsername = users.some(
      (u) => u.id !== editingUser.id && (u.username || '').toLowerCase() === cleanUsername
    );

    if (isDuplicateUsername) {
      alert(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
      return;
    }

    if (editForm.role !== 'admin' && editForm.assignedProjectIds.length === 0) {
      alert('Harap pilih minimal 1 lokasi proyek yang diizinkan untuk pengguna ini.');
      return;
    }

    updateUser(editingUser.id, {
      name: editForm.name.trim(),
      username: cleanUsername || undefined,
      email: editForm.email.trim(),
      password: editForm.password.trim() || undefined,
      role: editForm.role,
      phone: editForm.phone.trim() || undefined,
      assignedProjectIds:
        editForm.role === 'admin' ? projects.map((p) => p.id) : editForm.assignedProjectIds,
    });

    showToast(`Perubahan data akun ${editForm.name} berhasil disimpan.`);
    setEditingUser(null);
  };

  // Confirm Delete User
  const handleConfirmDelete = () => {
    if (!deleteTargetUser || !isSuperAdmin) return;

    const res = deleteUser(deleteTargetUser.id);
    if (res.success) {
      showToast(res.message || `Akun ${deleteTargetUser.name} berhasil dihapus.`);
    } else {
      alert(res.message || 'Gagal menghapus pengguna.');
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
                  Manajemen Pengguna & Hak Akses Lokasi Proyek
                </h3>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-[11px] border border-indigo-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Mode Super Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                    <Lock className="w-3 h-3" />
                    Hanya Lihat (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Super Admin dapat menambahkan atau menghapus user untuk{' '}
                <strong className="text-slate-700 font-semibold">Petugas Lapangan</strong> atau{' '}
                <strong className="text-slate-700 font-semibold">Klien / Tenant</strong>, serta menentukan secara spesifik lokasi proyek mana yang hanya dapat diakses oleh user tersebut.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setAddForm({
                    name: '',
                    username: '',
                    email: '',
                    password: 'petugas123',
                    role: 'petugas',
                    phone: '',
                    assignedProjectIds: projects.length > 0 ? [projects[0].id] : [],
                  });
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Tambah Akun Pengguna Baru"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah User (Petugas / Klien)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('proyek')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Buka Master Gedung / Lokasi Proyek"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Kelola Proyek ({projects.length}) →</span>
            </button>
          </div>
        </div>

        {/* Quick Role Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-slate-200/80">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pengguna</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-bold text-slate-900">{totalUsers}</span>
              <span className="text-[10px] text-slate-400">Akun</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Petugas Lapangan</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-bold text-emerald-900">{countPetugas}</span>
              <span className="text-[10px] text-emerald-600">Roster</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider block">Klien / Tenant</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-bold text-sky-900">{countKlien}</span>
              <span className="text-[10px] text-sky-600">Portal</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">Supervisor (SPV)</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-bold text-amber-900">{countSpv}</span>
              <span className="text-[10px] text-amber-600">QC & Tim</span>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">Super Admin</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-base font-bold text-indigo-900">{countAdmin}</span>
              <span className="text-[10px] text-indigo-600">Akses Penuh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Role ({totalUsers})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('petugas')}
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
            onClick={() => setRoleFilter('klien')}
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
            onClick={() => setRoleFilter('supervisor')}
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
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'admin'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            🛡️ Super Admin ({countAdmin})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              <th className="p-3.5 w-64">Nama & Kredensial Login</th>
              <th className="p-3.5 w-36">Role / Peran</th>
              <th className="p-3.5">
                <div className="flex items-center justify-between">
                  <span>Lokasi Proyek yang Diizinkan (Akses Terbatas)</span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase italic">
                    (klik untuk centang/batalkan)
                  </span>
                </div>
              </th>
              <th className="p-3.5 text-center w-28">Status Akses</th>
              <th className="p-3.5 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Tidak ada pengguna yang sesuai.</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coba sesuaikan kata kunci pencarian atau filter role di atas.
                  </p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isAdmin = u.role === 'admin';
                const assignedCount = u.assignedProjectIds?.length || 0;
                const isAllAssigned = assignedCount === projects.length;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Column 1: User Identity & Credentials */}
                    <td className="p-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-700'
                              : u.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-700'
                              : u.role === 'petugas'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-400">@</span>
                            <span className="font-semibold text-slate-700">{u.username || u.id}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{u.email}</div>
                          {u.phone && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Role Badge */}
                    <td className="p-3.5 align-top">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize border ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                            : u.role === 'supervisor'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : u.role === 'petugas'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-sky-50 border-sky-200 text-sky-800'
                        }`}
                      >
                        {u.role === 'admin'
                          ? 'Super Admin'
                          : u.role === 'supervisor'
                          ? 'Supervisor'
                          : u.role === 'petugas'
                          ? 'Petugas'
                          : 'Klien'}
                      </span>
                    </td>

                    {/* Column 3: Allowed Projects (Interactive Checkboxes / Pills) */}
                    <td className="p-3.5 align-top">
                      {isAdmin ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Semua Proyek ({projects.length} Lokasi) — Akses Super Admin Penuh</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {projects.map((proj) => {
                              const isChecked = u.assignedProjectIds?.includes(proj.id) || false;
                              return (
                                <button
                                  key={proj.id}
                                  type="button"
                                  disabled={!isSuperAdmin}
                                  onClick={() => handleToggleProjectAccess(u.id, proj.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                  } ${isSuperAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                                  title={
                                    isSuperAdmin
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
                                  <span className="truncate max-w-[150px]">{proj.name}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Batch Select for Super Admin */}
                          {isSuperAdmin && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                              <span>Aksi Cepat:</span>
                              <button
                                type="button"
                                onClick={() => handleBatchProjects(u.id, true)}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                              >
                                Pilih Semua
                              </button>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleBatchProjects(u.id, false)}
                                className="text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
                              >
                                Kosongkan Akses
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 4: Access Status */}
                    <td className="p-3.5 align-top text-center">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Penuh</span>
                        </span>
                      ) : assignedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[11px]">
                          <span>{assignedCount} Lokasi</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]" title="Pengguna tidak memiliki akses ke lokasi manapun">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </td>

                    {/* Column 5: Actions */}
                    <td className="p-3.5 align-top text-right">
                      {isSuperAdmin ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Pengguna & Password"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isAdmin && users.filter((x) => x.role === 'admin').length <= 1}
                            onClick={() => setDeleteTargetUser(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isAdmin && users.filter((x) => x.role === 'admin').length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={
                              isAdmin && users.filter((x) => x.role === 'admin').length <= 1
                                ? 'Akun Super Admin utama tidak dapat dihapus'
                                : `Hapus Akun ${u.name}`
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Tambah Pengguna Baru */}
      {showAddModal && isSuperAdmin && (
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
                    Tambahkan akun untuk Petugas, Klien, atau Supervisor beserta pembatasan lokasi
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
              {/* Pilihan Role / Peran */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  1. Pilih Peran / Role Akun <span className="text-rose-500">*</span>
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

                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        role: 'admin',
                        password: addForm.password || 'admin123',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      addForm.role === 'admin'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold ring-2 ring-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🛡️ Super Admin</div>
                    <div className="text-[10px] text-indigo-700 font-medium">Akses Penuh Semua Proyek</div>
                  </button>
                </div>
              </div>

              {/* Data Identitas */}
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-mono">@</span>
                    <input
                      type="text"
                      required
                      placeholder="budi_cln"
                      value={addForm.username}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                        })
                      }
                      className="w-full text-xs pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="budi@cleaningops.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi (Password) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      required
                      placeholder="Password login"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp (Opsional)
                </label>
                <input
                  type="tel"
                  placeholder="0812-3456-7890"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Pemilihan Lokasi Proyek yang Diizinkan */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-bold text-slate-900 block text-xs">
                      2. Tentukan Lokasi Proyek yang Diizinkan <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      User hanya dapat mengakses & melihat data pada proyek yang dicentang di bawah ini.
                    </p>
                  </div>
                  {addForm.role !== 'admin' && (
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

                {addForm.role === 'admin' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Super Admin Memiliki Akses Otomatis ke Seluruh Lokasi</p>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Role Super Admin selalu memiliki izin ke semua gedung dan proyek yang terdaftar di sistem.
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
      {editingUser && isSuperAdmin && (
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
                  <h4 className="font-bold text-slate-900 text-base">Edit Pengguna & Hak Akses</h4>
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
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Peran / Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="petugas">👷 Petugas Lapangan (Cleaning Staff)</option>
                  <option value="klien">🏢 Klien / Tenant (Building Management)</option>
                  <option value="supervisor">📋 Supervisor (SPV Operasional)</option>
                  <option value="admin">🛡️ Super Admin (Akses Penuh)</option>
                </select>
              </div>

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
                    Kata Sandi Baru (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Kosongkan jika tidak diubah"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
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
                  {editForm.role !== 'admin' && (
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

                {editForm.role === 'admin' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Super Admin Memiliki Akses Penuh ke Semua Proyek</p>
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

      {/* Modal Konfirmasi Hapus Pengguna */}
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
                <h4 className="font-bold text-slate-900 text-base">Hapus Akun Pengguna?</h4>
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
                <span className="font-mono text-slate-700">@{deleteTargetUser.username || deleteTargetUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{deleteTargetUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peran (Role):</span>
                <span className="font-semibold text-slate-800 capitalize">{deleteTargetUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Proyek Terhubung:</span>
                <span className="font-semibold text-slate-800">
                  {deleteTargetUser.assignedProjectIds?.length || 0} Lokasi
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium">
              Pengguna ini tidak akan lagi dapat login ke dalam sistem atau mengakses data proyek kebersihan.
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
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Pengguna</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold z-50 animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
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
