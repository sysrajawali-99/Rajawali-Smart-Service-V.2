import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Shield,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Jabatan, JabatanPermissionKey, JABATAN_PERMISSIONS_METADATA } from '../../types';

const PERMISSION_KEYS: JabatanPermissionKey[] = [
  'lihat_proyek',
  'isi_ceklist',
  'kelola_ceklist',
  'lihat_laporan',
  'unduh_laporan',
  'kelola_user',
  'kelola_jadwal',
  'terima_notifikasi',
];

export const JabatanManagementSection: React.FC = () => {
  const {
    jabatan,
    users,
    addJabatan,
    updateJabatan,
    deleteJabatan,
    userRole,
    currentUser,
  } = useCleaning();

  const isSuperOrAdmin =
    userRole === 'super_admin' || userRole === 'admin_perusahaan' || userRole === 'admin';

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingJabatan, setEditingJabatan] = useState<Jabatan | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    nama: string;
    keterangan: string;
    permissions: Record<JabatanPermissionKey, boolean>;
  }>({
    nama: '',
    keterangan: '',
    permissions: {
      lihat_proyek: true,
      isi_ceklist: true,
      kelola_ceklist: false,
      lihat_laporan: true,
      unduh_laporan: false,
      kelola_user: false,
      kelola_jadwal: false,
      terima_notifikasi: false,
    },
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered & Paginated items
  const filteredJabatan = useMemo(() => {
    return jabatan.filter((j) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        j.nama.toLowerCase().includes(q) ||
        (j.keterangan && j.keterangan.toLowerCase().includes(q))
      );
    });
  }, [jabatan, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredJabatan.length / itemsPerPage));
  const paginatedJabatan = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJabatan.slice(start, start + itemsPerPage);
  }, [filteredJabatan, currentPage, itemsPerPage]);

  const handleOpenAdd = () => {
    setEditingJabatan(null);
    setFormData({
      nama: '',
      keterangan: '',
      permissions: {
        lihat_proyek: true,
        isi_ceklist: true,
        kelola_ceklist: false,
        lihat_laporan: true,
        unduh_laporan: false,
        kelola_user: false,
        kelola_jadwal: false,
        terima_notifikasi: false,
      },
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: Jabatan) => {
    setEditingJabatan(item);
    setFormData({
      nama: item.nama,
      keterangan: item.keterangan || '',
      permissions: { ...item.permissions },
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showToast('Nama jabatan wajib diisi', 'error');
      return;
    }

    try {
      if (editingJabatan) {
        await updateJabatan(editingJabatan.id, {
          nama: formData.nama.trim(),
          keterangan: formData.keterangan.trim(),
          permissions: formData.permissions,
        });
        showToast(`Jabatan "${formData.nama}" berhasil diperbarui.`);
      } else {
        const companyId = currentUser?.company_id || currentUser?.companyId || 'comp-main';
        await addJabatan({
          company_id: companyId,
          companyId,
          nama: formData.nama.trim(),
          keterangan: formData.keterangan.trim(),
          permissions: formData.permissions,
        });
        showToast(`Jabatan baru "${formData.nama}" berhasil ditambahkan.`);
      }
      setShowModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan jabatan', 'error');
    }
  };

  const handleDelete = async (item: Jabatan) => {
    if (!window.confirm(`Yakin ingin menghapus jabatan "${item.nama}"?`)) return;
    const res = await deleteJabatan(item.id);
    if (res.success) {
      showToast(res.message || `Jabatan "${item.nama}" berhasil dihapus.`);
    } else {
      showToast(res.message || 'Gagal menghapus jabatan.', 'error');
    }
  };

  const handleQuickToggleCell = async (item: Jabatan, permKey: JabatanPermissionKey) => {
    if (!isSuperOrAdmin) return;
    const updatedPerms = {
      ...item.permissions,
      [permKey]: !item.permissions[permKey],
    };
    try {
      await updateJabatan(item.id, { permissions: updatedPerms });
      showToast(`Izin "${JABATAN_PERMISSIONS_METADATA[permKey].label}" untuk ${item.nama} diperbarui.`);
    } catch {
      showToast('Gagal memperbarui izin.', 'error');
    }
  };

  const applyPreset = (preset: 'manajer' | 'spv' | 'petugas' | 'klien' | 'all' | 'none') => {
    if (preset === 'all') {
      const all: any = {};
      PERMISSION_KEYS.forEach((k) => (all[k] = true));
      setFormData((prev) => ({ ...prev, permissions: all }));
    } else if (preset === 'none') {
      const none: any = {};
      PERMISSION_KEYS.forEach((k) => (none[k] = false));
      setFormData((prev) => ({ ...prev, permissions: none }));
    } else if (preset === 'manajer') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          lihat_proyek: true,
          isi_ceklist: true,
          kelola_ceklist: true,
          lihat_laporan: true,
          unduh_laporan: true,
          kelola_user: true,
          kelola_jadwal: true,
          terima_notifikasi: true,
        },
      }));
    } else if (preset === 'spv') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          lihat_proyek: true,
          isi_ceklist: true,
          kelola_ceklist: true,
          lihat_laporan: true,
          unduh_laporan: true,
          kelola_user: false,
          kelola_jadwal: true,
          terima_notifikasi: true,
        },
      }));
    } else if (preset === 'petugas') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          lihat_proyek: true,
          isi_ceklist: true,
          kelola_ceklist: false,
          lihat_laporan: false,
          unduh_laporan: false,
          kelola_user: false,
          kelola_jadwal: false,
          terima_notifikasi: false,
        },
      }));
    } else if (preset === 'klien') {
      setFormData((prev) => ({
        ...prev,
        permissions: {
          lihat_proyek: true,
          isi_ceklist: false,
          kelola_ceklist: false,
          lihat_laporan: true,
          unduh_laporan: true,
          kelola_user: false,
          kelola_jadwal: false,
          terima_notifikasi: false,
        },
      }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Section */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/60 shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Manajemen Jabatan & Matriks Hak Akses
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {jabatan.length} Jabatan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dibuat oleh Admin Perusahaan tanpa batas jumlah. Atur 8 izin operasional dengan centang langsung pada matriks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama jabatan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44 md:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isSuperOrAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jabatan</span>
            </button>
          )}
        </div>
      </div>

      {/* Permissions Legend & Info Strip */}
      <div className="px-5 py-2.5 bg-indigo-50/40 border-b border-indigo-100/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Klik kotak centang pada tabel di bawah untuk menyalakan/mematikan izin secara langsung.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Aktif
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-400">
            <X className="w-3 h-3 text-slate-300" /> Nonaktif
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[10px] text-slate-500">
            Jabatan Bawaan: Manajer Proyek, Supervisor, Petugas Kebersihan, Klien (dapat disesuaikan)
          </span>
        </div>
      </div>

      {/* Interactive Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
              <th className="py-3 px-4 min-w-[190px]">Jabatan & Keterangan</th>
              {PERMISSION_KEYS.map((key) => {
                const meta = JABATAN_PERMISSIONS_METADATA[key];
                return (
                  <th
                    key={key}
                    title={meta.description}
                    className="py-3 px-2 text-center min-w-[95px] max-w-[110px]"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-[95px]">
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-normal">
                        {meta.category.split(' ')[0]}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="py-3 px-3 text-center min-w-[70px]">Pengguna</th>
              <th className="py-3 px-4 text-right min-w-[90px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedJabatan.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Tidak ada jabatan yang sesuai pencarian</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gunakan tombol "Tambah Jabatan" untuk membuat jabatan baru.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedJabatan.map((item) => {
                const assignedUsersCount = users.filter((u) => u.jabatanId === item.id).length;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Jabatan Info */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">
                            {item.nama}
                          </span>
                          {item.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                              Bawaan
                            </span>
                          )}
                        </div>
                        {item.keterangan ? (
                          <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.keterangan}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic mt-0.5">
                            Tanpa keterangan
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 8 Permissions Matrix Checkboxes */}
                    {PERMISSION_KEYS.map((key) => {
                      const isChecked = !!item.permissions?.[key];
                      const meta = JABATAN_PERMISSIONS_METADATA[key];
                      return (
                        <td
                          key={key}
                          className="py-3.5 px-2 text-center align-middle"
                        >
                          <button
                            type="button"
                            disabled={!isSuperOrAdmin}
                            onClick={() => handleQuickToggleCell(item, key)}
                            title={`${meta.label}: ${isChecked ? 'Aktif' : 'Nonaktif'} (Klik untuk mengubah)`}
                            className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600 ring-2 ring-emerald-200/60'
                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200/80 hover:text-slate-500'
                            } ${!isSuperOrAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          >
                            {isChecked ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <X className="w-3 h-3 stroke-[2]" />
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Assigned Users Count */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{assignedUsersCount}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Ubah jabatan & izin"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isSuperOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title={
                              assignedUsersCount > 0
                                ? 'Tidak bisa dihapus: masih digunakan oleh pengguna'
                                : 'Hapus jabatan'
                            }
                            disabled={assignedUsersCount > 0}
                            className={`p-1.5 rounded-lg transition-colors ${
                              assignedUsersCount > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/30 text-xs text-slate-500">
        <div>
          Menampilkan{' '}
          <span className="font-semibold text-slate-800">
            {filteredJabatan.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </span>{' '}
          sampai{' '}
          <span className="font-semibold text-slate-800">
            {Math.min(currentPage * itemsPerPage, filteredJabatan.length)}
          </span>{' '}
          dari <span className="font-semibold text-slate-800">{filteredJabatan.length}</span> jabatan
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === pageNum
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Tambah / Edit Jabatan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingJabatan ? 'Ubah Jabatan & Izin' : 'Tambah Jabatan Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Konfigurasikan nama dan matriks 8 izin operasional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Koordinator Shift, QC Auditor, Kepala Regu"
                  value={formData.nama}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi tugas dan tanggung jawab jabatan ini..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Quick Presets */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Matriks Izin Operasional
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400 mr-1">Preset:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('manajer')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      Manajer
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('spv')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      SPV
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('petugas')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      Petugas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('klien')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      Klien
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('all')}
                      className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium cursor-pointer"
                    >
                      Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {PERMISSION_KEYS.map((key) => {
                    const meta = JABATAN_PERMISSIONS_METADATA[key];
                    const checked = !!formData.permissions[key];
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          checked
                            ? 'bg-white border-indigo-200 shadow-2xs ring-1 ring-indigo-100'
                            : 'bg-white/60 border-slate-200/70 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              permissions: {
                                ...prev.permissions,
                                [key]: e.target.checked,
                              },
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-900 leading-tight">
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {meta.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingJabatan ? 'Simpan Perubahan' : 'Buat Jabatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs z-50 text-white animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-200" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
