import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Users,
  MapPin,
  CheckCircle2,
  Lock,
  ArrowRight,
  UserCheck,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { ProjectLocation } from '../../types';

export const LokasiProyekView: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    addProject,
    updateProject,
    deleteProject,
    users,
    updateUserProjectAssignment,
    userRole,
    currentUser,
    allowedProjects,
  } = useCleaning();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectLocation | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formFloors, setFormFloors] = useState(1);
  const [formManager, setFormManager] = useState('');
  const [formClient, setFormClient] = useState('');

  // User assignment tab state
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'user_access'>('projects');

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    if (showAddModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setEditingProject(null);
    setFormCode(`PRJ-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormAddress('');
    setFormCity('Jakarta');
    setFormFloors(5);
    setFormManager('');
    setFormClient('');
    setShowAddModal(true);
  };

  const openEditModal = (proj: ProjectLocation) => {
    setEditingProject(proj);
    setFormCode(proj.code);
    setFormName(proj.name);
    setFormAddress(proj.address);
    setFormCity(proj.city);
    setFormFloors(proj.totalFloors);
    setFormManager(proj.managerName || '');
    setFormClient(proj.clientName || '');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProject) {
      updateProject(editingProject.id, {
        code: formCode,
        name: formName,
        address: formAddress,
        city: formCity,
        totalFloors: Number(formFloors),
        managerName: formManager,
        clientName: formClient,
      });
    } else {
      addProject({
        code: formCode,
        name: formName,
        address: formAddress,
        city: formCity,
        totalFloors: Number(formFloors),
        managerName: formManager,
        clientName: formClient,
        status: 'active',
      });
    }

    setShowAddModal(false);
  };

  const isSuperAdmin = userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Manajemen Lokasi Proyek</h2>
            {isSuperAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin Access
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Akses Terbatas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Kelola multi-lokasi proyek dan tentukan izin akses proyek untuk setiap pengguna (Supervisor, Petugas, Klien).'
              : `Anda ditugaskan pada ${allowedProjects.length} lokasi proyek yang telah disetujui oleh Super Admin.`}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-medium">
              <button
                onClick={() => setActiveSubTab('projects')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeSubTab === 'projects'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Proyek ({projects.length})
              </button>
              <button
                onClick={() => setActiveSubTab('user_access')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeSubTab === 'user_access'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Atur Hak Akses User
              </button>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Proyek</span>
            </button>
          </div>
        )}
      </div>

      {/* Non-admin restricted notice if not admin */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Kebijakan Hak Akses Proyek</p>
            <p className="mt-0.5 text-amber-800">
              Sebagai pengguna dengan role <span className="font-semibold capitalize">{userRole}</span>, Anda hanya dapat melihat dan mengoperasikan data untuk lokasi proyek yang telah disetujui oleh Super Administrator.
            </p>
          </div>
        </div>
      )}

      {/* VIEW: Projects List */}
      {(!isSuperAdmin || activeSubTab === 'projects') && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama gedung, kota, atau kode proyek..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              Menampilkan {isSuperAdmin ? filteredProjects.length : allowedProjects.length} lokasi proyek
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isSuperAdmin ? filteredProjects : allowedProjects).map((proj) => {
              const isSelected = proj.id === activeProjectId;
              const assignedUsersCount = users.filter((u) => u.assignedProjectIds?.includes(proj.id)).length;

              return (
                <div
                  key={proj.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-100 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs border border-sky-200 shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                            {proj.code}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 mt-1 leading-tight">{proj.name}</h3>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif Dipilih
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveProjectId(proj.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors shrink-0"
                        >
                          Pilih Proyek
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-start gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{proj.address}, {proj.city}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 pt-1">
                        <span>Total Lantai:</span>
                        <span className="font-semibold text-slate-800">{proj.totalFloors} Lantai</span>
                      </div>
                      {proj.clientName && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Klien Gedung:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[180px]">{proj.clientName}</span>
                        </div>
                      )}
                      {proj.managerName && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Facility Manager:</span>
                          <span className="font-semibold text-slate-800">{proj.managerName}</span>
                        </div>
                      )}
                      {isSuperAdmin && (
                        <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                          <span>User Ditugaskan:</span>
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {assignedUsersCount} Pengguna
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Super Admin */}
                  {isSuperAdmin && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => openEditModal(proj)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {projects.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Yakin hapus proyek ${proj.name}?`)) {
                              deleteProject(proj.id);
                            }
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: User Access Configuration (Super Admin Only) */}
      {isSuperAdmin && activeSubTab === 'user_access' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                Matriks Hak Akses Pengguna ke Lokasi Proyek
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih lokasi proyek yang boleh diakses oleh masing-masing user. User hanya dapat melihat dan memilih proyek yang dicentang.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
              {users.length} User Terdaftar
            </span>
          </div>

          <div className="divide-y divide-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5">Nama Pengguna & Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Lokasi Proyek yang Diizinkan</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((usr) => {
                  const isAdminUser = usr.role === 'admin';
                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{usr.name}</div>
                        <div className="text-slate-400 text-[11px]">{usr.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            usr.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-800'
                              : usr.role === 'supervisor'
                              ? 'bg-amber-100 text-amber-800'
                              : usr.role === 'petugas'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {usr.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isAdminUser ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg w-fit">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Semua Proyek (Super Admin Otomatis)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {projects.map((proj) => {
                              const isChecked = usr.assignedProjectIds?.includes(proj.id) || false;
                              return (
                                <label
                                  key={proj.id}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                    isChecked
                                      ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold'
                                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = usr.assignedProjectIds || [];
                                      const next = e.target.checked
                                        ? [...current, proj.id]
                                        : current.filter((id) => id !== proj.id);
                                      updateUserProjectAssignment(usr.id, next);
                                    }}
                                    className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                  />
                                  <span>{proj.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {isAdminUser ? (
                          <span className="text-emerald-600 font-medium">Akses Penuh</span>
                        ) : (usr.assignedProjectIds?.length || 0) > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {usr.assignedProjectIds?.length} Lokasi
                          </span>
                        ) : (
                          <span className="text-rose-500 font-medium">Belum Ditugaskan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Project */}
      {showAddModal && (
        <div
          id="project-modal-backdrop"
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="project-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2 truncate">
                <Building2 className="w-5 h-5 text-sky-600 shrink-0" />
                <span className="truncate">{editingProject ? 'Edit Lokasi Proyek' : 'Tambah Lokasi Proyek Baru'}</span>
              </h3>
              <button
                id="close-project-modal-btn"
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup Jendela Lokasi Proyek"
                className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-2 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Proyek</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                    placeholder="PRJ-..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kota</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Gedung / Proyek</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-semibold"
                  placeholder="Contoh: Menara BCA Grand Indonesia"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="Jl. M.H. Thamrin No. 1..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Lantai Gedung</label>
                  <input
                    type="number"
                    min={1}
                    max={150}
                    required
                    value={formFloors}
                    onChange={(e) => setFormFloors(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Facility Manager</label>
                  <input
                    type="text"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    placeholder="Nama Penanggung Jawab"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Klien / Tenant Utama</label>
                <input
                  type="text"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="PT..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  id="cancel-project-modal-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-semibold min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  {editingProject ? 'Simpan Perubahan' : 'Buat Lokasi Proyek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
