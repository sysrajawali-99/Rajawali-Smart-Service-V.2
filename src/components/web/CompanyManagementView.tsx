import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Shield,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  X,
  Palette,
  Check,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Company, CompanyStatus } from '../../types';

export const CompanyManagementView: React.FC = () => {
  const {
    userRole,
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    users,
    setActiveTab,
  } = useCleaning();

  const isSuperAdmin = userRole === 'super_admin';

  // State pencarian & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CompanyStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Pagination tanpa batas jumlah

  // State Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteTargetCompany, setDeleteTargetCompany] = useState<Company | null>(null);
  const [typedConfirmName, setTypedConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Preset warna identitas
  const PRESET_COLORS = [
    '#0284c7', // Sky blue
    '#2563eb', // Royal blue
    '#4f46e5', // Indigo
    '#7c3aed', // Purple
    '#059669', // Emerald
    '#16a34a', // Green
    '#d97706', // Amber
    '#dc2626', // Red
    '#0f172a', // Slate dark
  ];

  // Form Tambah
  const [addForm, setAddForm] = useState<{
    nama: string;
    slug: string;
    logo: string;
    warna: string;
    status: CompanyStatus;
  }>({
    nama: '',
    slug: '',
    logo: '',
    warna: '#0284c7',
    status: 'aktif',
  });

  // Form Ubah
  const [editForm, setEditForm] = useState<{
    nama: string;
    slug: string;
    logo: string;
    warna: string;
    status: CompanyStatus;
  }>({
    nama: '',
    slug: '',
    logo: '',
    warna: '#0284c7',
    status: 'aktif',
  });

  // Jika bukan Super Admin, tolak akses di tampilan
  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Akses Khusus Super Administrator</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Halaman Manajemen Perusahaan Multi-Tenant hanya dapat diakses oleh akun dengan peran <strong>Super Administrator</strong>.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Kembali ke Dashboard Utama
        </button>
      </div>
    );
  }

  // Statistik Ringkasan Perusahaan
  const totalCompaniesCount = companies.length;
  const activeCount = companies.filter((c) => c.status === 'aktif').length;
  const suspendedCount = companies.filter((c) => c.status === 'ditangguhkan').length;
  const archivedCount = companies.filter((c) => c.status === 'diarsipkan').length;

  // Filter & Search
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchStatus;
      const matchName = c.nama.toLowerCase().includes(q);
      const matchSlug = c.slug.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      return matchStatus && (matchName || matchSlug || matchId);
    });
  }, [companies, statusFilter, searchQuery]);

  // Pagination tanpa batas jumlah
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage));
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Submit Tambah Perusahaan
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nama.trim()) {
      showToast('Nama perusahaan wajib diisi.', 'error');
      return;
    }

    const cleanSlug = (addForm.slug.trim() || addForm.nama.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')).toLowerCase();

    // Cek duplikasi slug
    const duplicate = companies.some((c) => c.slug.toLowerCase() === cleanSlug);
    if (duplicate) {
      showToast(`Slug / kode "${cleanSlug}" sudah dipakai oleh perusahaan lain.`, 'error');
      return;
    }

    const created = await addCompany({
      nama: addForm.nama.trim(),
      slug: cleanSlug,
      logo: addForm.logo.trim() || undefined,
      warna: addForm.warna || '#0284c7',
      status: addForm.status || 'aktif',
    });

    showToast(`Perusahaan "${created.nama}" berhasil ditambahkan.`);
    setShowAddModal(false);
    setAddForm({
      nama: '',
      slug: '',
      logo: '',
      warna: '#0284c7',
      status: 'aktif',
    });
  };

  // Buka Modal Edit
  const handleOpenEdit = (c: Company) => {
    setEditingCompany(c);
    setEditForm({
      nama: c.nama,
      slug: c.slug,
      logo: c.logo || '',
      warna: c.warna || '#0284c7',
      status: c.status,
    });
  };

  // Submit Edit Perusahaan
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    if (!editForm.nama.trim()) {
      showToast('Nama perusahaan wajib diisi.', 'error');
      return;
    }

    const cleanSlug = editForm.slug.trim().toLowerCase();
    const duplicate = companies.some((c) => c.id !== editingCompany.id && c.slug.toLowerCase() === cleanSlug);
    if (duplicate) {
      showToast(`Slug / kode "${cleanSlug}" sudah digunakan oleh perusahaan lain.`, 'error');
      return;
    }

    await updateCompany(editingCompany.id, {
      nama: editForm.nama.trim(),
      slug: cleanSlug,
      logo: editForm.logo.trim() || undefined,
      warna: editForm.warna,
      status: editForm.status,
    });

    showToast(`Data perusahaan "${editForm.nama}" berhasil diperbarui.`);
    setEditingCompany(null);
  };

  // Quick Action: Ubah Status (Tangguhkan / Arsipkan / Aktifkan)
  const handleQuickStatusChange = async (c: Company, newStatus: CompanyStatus) => {
    await updateCompany(c.id, { status: newStatus });
    const label =
      newStatus === 'aktif' ? 'diaktifkan' : newStatus === 'ditangguhkan' ? 'ditangguhkan' : 'diarsipkan';
    showToast(`Perusahaan "${c.nama}" berhasil ${label}.`);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetCompany) return;
    if (deleteTargetCompany.id === 'comp-main') {
      showToast('Perusahaan Utama (comp-main) tidak dapat dihapus.', 'error');
      setDeleteTargetCompany(null);
      return;
    }

    if (typedConfirmName.trim() !== deleteTargetCompany.nama.trim()) {
      showToast('Nama perusahaan yang Anda ketik tidak cocok.', 'error');
      return;
    }

    setIsDeleting(true);
    const res = await deleteCompany(deleteTargetCompany.id, typedConfirmName);
    setIsDeleting(false);

    if (res.success) {
      showToast(res.message || `Perusahaan "${deleteTargetCompany.nama}" berhasil dihapus.`);
      setDeleteTargetCompany(null);
      setTypedConfirmName('');
    } else {
      showToast(res.message || 'Gagal menghapus perusahaan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Manajemen Perusahaan Multi-Tenant
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full tracking-wide">
                  SUPER ADMIN ONLY
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Kelola pendaftaran entitas perusahaan, status akun, dan isolasi tenant tanpa batas jumlah.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Perusahaan</span>
          </button>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Perusahaan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCompaniesCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Semua entitas terdaftar</p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Perusahaan Aktif</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Operasional normal</p>
          </div>

          <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Ditangguhkan</p>
            <p className="text-2xl font-bold text-rose-800 mt-1">{suspendedCount}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Akses login ditolak</p>
          </div>

          <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Diarsipkan</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{archivedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Arsip data histori</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama perusahaan, slug, atau ID..."
            className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'aktif', label: 'Aktif' },
              { key: 'ditangguhkan', label: 'Ditangguhkan' },
              { key: 'diarsipkan', label: 'Diarsipkan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[12px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Perusahaan</th>
                <th className="py-3.5 px-4">Kode / Slug</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Warna Identitas</th>
                <th className="py-3.5 px-4">Pengguna Terdaftar</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600">Tidak ada perusahaan ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Coba gunakan kata kunci pencarian yang berbeda'
                        : 'Belum ada data perusahaan pada filter ini'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((c) => {
                  const companyUsers = users.filter(
                    (u) => (u.company_id || u.companyId) === c.id
                  );
                  const adminCount = companyUsers.filter((u) => u.role === 'admin_perusahaan' || u.role === 'admin').length;
                  const totalUsers = companyUsers.length;
                  const isMainCompany = c.id === 'comp-main';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama & Logo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 overflow-hidden"
                            style={{ backgroundColor: c.warna || '#0284c7' }}
                          >
                            {c.logo ? (
                              <img src={c.logo} alt={c.nama} className="w-full h-full object-cover" />
                            ) : (
                              <span>{c.nama.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{c.nama}</span>
                              {isMainCompany && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                                  UTAMA
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 font-mono text-xs rounded-md">
                          /{c.slug}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {c.status === 'aktif' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Aktif
                          </span>
                        )}
                        {c.status === 'ditangguhkan' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Ditangguhkan
                          </span>
                        )}
                        {c.status === 'diarsipkan' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Diarsipkan
                          </span>
                        )}
                      </td>

                      {/* Warna Identitas */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-xs shrink-0"
                            style={{ backgroundColor: c.warna || '#0284c7' }}
                          />
                          <span className="text-xs text-slate-600 font-mono">{c.warna || '#0284c7'}</span>
                        </div>
                      </td>

                      {/* Pengguna */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800">{totalUsers} pengguna</span>
                          <span className="text-slate-400 ml-1">({adminCount} admin)</span>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ubah */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Ubah Data Perusahaan"
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Tangguhkan / Aktifkan */}
                          {c.status === 'aktif' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(c, 'ditangguhkan')}
                              title="Tangguhkan Perusahaan"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(c, 'aktif')}
                              title="Aktifkan Kembali Perusahaan"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Arsipkan */}
                          {c.status !== 'diarsipkan' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(c, 'diarsipkan')}
                              title="Arsipkan Perusahaan"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Hapus Permanen */}
                          {!isMainCompany && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTargetCompany(c);
                                setTypedConfirmName('');
                              }}
                              title="Hapus Permanen (Ketik Nama)"
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-800">{paginatedCompanies.length}</span> dari{' '}
            <span className="font-semibold text-slate-800">{filteredCompanies.length}</span> perusahaan terdaftar
            (halaman {currentPage} dari {totalPages})
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`min-w-8 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Tambah Perusahaan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tambah Perusahaan Baru</h3>
                  <p className="text-xs text-slate-500">Daftarkan entitas tenant baru ke dalam sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.nama}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddForm((prev) => ({
                      ...prev,
                      nama: val,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
                    }));
                  }}
                  placeholder="Contoh: PT Prima Bersih Abadi"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode / Slug Unik <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 text-slate-500 text-sm rounded-l-xl font-mono">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={addForm.slug}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    placeholder="prima-bersih"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-r-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk identifikasi unik tenant.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Identitas</label>
                <div className="flex items-center gap-2 mb-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAddForm((prev) => ({ ...prev, warna: col }))}
                      className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: col }}
                    >
                      {addForm.warna === col && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={addForm.warna}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, warna: e.target.value }))}
                  placeholder="#0284c7"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (Opsional)</label>
                <input
                  type="text"
                  value={addForm.logo}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://... atau /uploads/..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Perusahaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ubah Perusahaan */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ubah Data Perusahaan</h3>
                  <p className="text-xs text-slate-500">ID: {editingCompany.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode / Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.slug}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operasional</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as CompanyStatus }))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                >
                  <option value="aktif">Aktif (Operasional Penuh)</option>
                  <option value="ditangguhkan">Ditangguhkan (Tolak Akses Login)</option>
                  <option value="diarsipkan">Diarsipkan (Tolak Akses Login & Data Histori)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Identitas</label>
                <div className="flex items-center gap-2 mb-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, warna: col }))}
                      className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: col }}
                    >
                      {editForm.warna === col && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editForm.warna}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, warna: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={editForm.logo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://... atau /uploads/..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Permanen (Ketik Nama Perusahaan) */}
      {deleteTargetCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-base">Hapus Permanen Perusahaan</h3>
                <p className="text-xs text-rose-700 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                Anda akan menghapus entitas perusahaan:
                <div className="font-bold text-slate-900 text-sm mt-1 mb-1">{deleteTargetCompany.nama}</div>
                <div className="text-[11px] text-slate-400">ID: {deleteTargetCompany.id}</div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                Untuk mencegah penghapusan yang tidak disengaja, silakan ketik nama perusahaan persis di bawah ini untuk mengonfirmasi:
                <div className="p-2 bg-slate-100 rounded-lg font-mono font-bold text-slate-800 text-center my-2 select-all">
                  {deleteTargetCompany.nama}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={typedConfirmName}
                  onChange={(e) => setTypedConfirmName(e.target.value)}
                  placeholder="Ketik nama perusahaan di sini..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-slate-300 rounded-xl focus:border-rose-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTargetCompany(null);
                    setTypedConfirmName('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={typedConfirmName.trim() !== deleteTargetCompany.nama.trim() || isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
