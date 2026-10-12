import React, { useState, useMemo } from 'react';
import { useCleaning } from '../../context/CleaningContext';
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
  Zap,
  CheckCircle2,
  Search,
  UserCheck,
  Briefcase,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, instantLogin, companyProfile, users, allProjects, projects } = useCleaning();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null);

  // Instant login filters
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTabMode, setActiveTabMode] = useState<'instant' | 'manual'>('instant');

  // Available projects list for displaying assigned project names
  const projectList = allProjects && allProjects.length > 0 ? allProjects : projects;

  // Filtered users for instant login list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
      const q = userSearchQuery.trim().toLowerCase();
      if (!q) return matchRole;

      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = (u.username || '').toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchProjects = (u.assignedProjectIds || []).some((projId) => {
        const p = projectList.find((proj) => proj.id === projId);
        return p ? p.name.toLowerCase().includes(q) : false;
      });

      return matchRole && (matchName || matchUsername || matchEmail || matchProjects);
    });
  }, [users, selectedRoleFilter, userSearchQuery, projectList]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Silakan masukkan Username atau Email Anda.');
      return;
    }

    if (!password) {
      setErrorMessage('Silakan masukkan Kata Sandi (Password) Anda.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(identifier, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Username/Email atau Password salah.');
      }
    }, 350);
  };

  const handleInstantLogin = (userId: string) => {
    setErrorMessage(null);
    setActiveLoginId(userId);
    setIsLoading(true);

    setTimeout(() => {
      const result = instantLogin(userId);
      setIsLoading(false);
      setActiveLoginId(null);
      if (!result.success) {
        setErrorMessage(result.message || 'Gagal masuk akun instan.');
      }
    }, 300);
  };

  const handleFillCredentials = (username: string, role: UserRole, customPass?: string) => {
    const defaultPass =
      customPass ||
      (role === 'admin' || role === 'super_admin' || role === 'admin_perusahaan'
        ? 'admin123'
        : role === 'supervisor'
        ? 'spv123'
        : role === 'petugas'
        ? 'petugas123'
        : 'klien123');
    setIdentifier(username);
    setPassword(defaultPass);
    setActiveTabMode('manual');
    setErrorMessage(null);
  };

  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return {
          title: 'Super Admin',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          icon: ShieldCheck,
          accentColor: 'from-indigo-600 to-blue-600',
        };
      case 'admin_perusahaan':
        return {
          title: 'Admin Perusahaan',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: ShieldCheck,
          accentColor: 'from-purple-600 to-indigo-600',
        };
      case 'supervisor':
        return {
          title: 'Supervisor',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: UserCheck,
          accentColor: 'from-amber-600 to-orange-600',
        };
      case 'petugas':
        return {
          title: 'Petugas Kebersihan',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: Briefcase,
          accentColor: 'from-emerald-600 to-teal-600',
        };
      case 'klien':
        return {
          title: 'Klien Gedung',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          icon: Building2,
          accentColor: 'from-sky-600 to-cyan-600',
        };
      default:
        return {
          title: role,
          badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
          icon: User,
          accentColor: 'from-slate-600 to-slate-700',
        };
    }
  };

  const superAdminUser = users.find((u) => u.role === 'super_admin' || u.role === 'admin');

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 my-4">
        {/* Header Branding */}
        <div className="text-center mb-6">
          {companyProfile?.logoUrl ? (
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shadow-sky-500/15 mb-3.5 transition-transform hover:scale-105">
              <img
                src={companyProfile.logoUrl}
                alt={companyProfile.companyName || 'Company Logo'}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20 mb-3 border border-white/10">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {companyProfile?.companyName || 'Rajawali Smart Service'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal max-w-md mx-auto leading-relaxed">
            {companyProfile?.tagline || 'Cleaning Operations & Multi-Project Facility Control System'}
          </p>
        </div>

        {/* Super Admin Quick Instant Login Banner */}
        {superAdminUser && (
          <div className="mb-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-700/60 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      Instan Login Utama
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Siap Digunakan
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {superAdminUser.name} (@{superAdminUser.username})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Akses penuh ke semua ({projectList.length}) lokasi proyek, matriks RBAC, dan penugasan lokasi pengguna
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="instant-login-superadmin-btn"
                onClick={() => handleInstantLogin(superAdminUser.id)}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                {isLoading && activeLoginId === superAdminUser.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Masuk Instan Super Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Card: Tabbed between Instant Login & Manual Form */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top Mode Selector Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 sm:p-2 gap-1.5">
            <button
              type="button"
              id="tab-instant-login"
              onClick={() => setActiveTabMode('instant')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTabMode === 'instant'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Instan Login Akun Pengguna ({users.length})</span>
            </button>
            <button
              type="button"
              id="tab-manual-login"
              onClick={() => setActiveTabMode('manual')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTabMode === 'manual'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Form Login Kredensial Manual</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="m-4 sm:m-6 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* TAB 1: INSTANT LOGIN LIST FOR CREATED USERS */}
          {activeTabMode === 'instant' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Feature Information Banner: User Location Restriction Notice */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-semibold">Aturan Pembatasan Lokasi Proyek Aktif:</strong>
                  <span className="ml-1 text-slate-300">
                    Pengguna non-admin (Supervisor, Petugas, Klien) <strong>hanya dapat melihat lokasi proyek yang telah ditentukan oleh Super Admin</strong>. Seluruh data dan menu lokasi proyek lainnya otomatis disembunyikan.
                  </span>
                </div>
              </div>

              {/* Filters & Search Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Role Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {(
                    [
                      { id: 'all', label: 'Semua Akun' },
                      { id: 'admin', label: 'Super Admin' },
                      { id: 'supervisor', label: 'Supervisor' },
                      { id: 'petugas', label: 'Petugas' },
                      { id: 'klien', label: 'Klien' },
                    ] as { id: 'all' | UserRole; label: string }[]
                  ).map((r) => {
                    const count = r.id === 'all' ? users.length : users.filter((u) => u.role === r.id).length;
                    const isActive = selectedRoleFilter === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoleFilter(r.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {r.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Cari nama, role, atau lokasi..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Grid of Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const roleConfig = getRoleConfig(u.role);
                  const RoleIcon = roleConfig.icon;
                  const isLoggingInThis = isLoading && activeLoginId === u.id;

                  // Find assigned projects names
                  const assignedProjects = (u.assignedProjectIds || [])
                    .map((id) => projectList.find((p) => p.id === id))
                    .filter(Boolean);

                  return (
                    <div
                      key={u.id}
                      className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all hover:bg-slate-950/90 group"
                    >
                      <div>
                        {/* Header: Role Badge & Username */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 shrink-0 border border-slate-700">
                              <RoleIcon className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                                {u.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-mono">
                                @{u.username || u.email.split('@')[0]}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${roleConfig.badgeColor}`}
                          >
                            {roleConfig.title}
                          </span>
                        </div>

                        {/* Location Permissions Information */}
                        <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/80 mb-3 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="font-semibold text-slate-300">
                              {u.role === 'admin' ? 'Akses Lokasi:' : 'Lokasi yang Diizinkan:'}
                            </span>
                          </div>

                          {u.role === 'admin' ? (
                            <p className="text-emerald-400 font-medium pl-5 text-[11px]">
                              Semua Lokasi ({projectList.length} Proyek) — Akses Super Admin Penuh
                            </p>
                          ) : assignedProjects.length > 0 ? (
                            <div className="pl-5 space-y-1">
                              {assignedProjects.map((proj) => (
                                <div key={proj?.id} className="flex items-center gap-1.5 text-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                  <span className="font-medium truncate">{proj?.name}</span>
                                  <span className="text-[10px] text-slate-500">({proj?.city})</span>
                                </div>
                              ))}
                              <p className="text-[10px] text-amber-400/80 italic pt-0.5">
                                * Lokasi lain selain di atas disembunyikan
                              </p>
                            </div>
                          ) : (
                            <p className="text-rose-400 pl-5 text-[11px]">
                              Belum ditentukan oleh Super Admin
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => handleInstantLogin(u.id)}
                          disabled={isLoading}
                          className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                        >
                          {isLoggingInThis ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                              <span>Login Instan</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFillCredentials(u.username || u.email, u.role, u.password)}
                          className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title="Isi form login manual dengan kredensial ini"
                        >
                          Isi Form
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                    <User className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium">Tidak ada akun yang cocok dengan pencarian.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL CREDENTIALS FORM */}
          {activeTabMode === 'manual' && (
            <div className="p-6 sm:p-8 max-w-md mx-auto">
              <div className="mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-sky-400" />
                  <span>Masukkan Kredensial Akun</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Masukkan username/email dan kata sandi Anda untuk masuk ke sistem
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Identifier */}
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Username / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoFocus
                      autoComplete="username"
                      placeholder="e.g. superadmin, spv1, petugas1, klien1"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Kata Sandi (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                    <button
                      type="button"
                      id="toggle-password-visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer focus:outline-none transition-colors"
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Hint Credentials */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">Kredensial Default Sistem:</span>
                  <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                    <div>
                      • Super Admin: <span className="font-mono text-sky-300">admin123</span>
                    </div>
                    <div>
                      • Supervisor: <span className="font-mono text-sky-300">spv123</span>
                    </div>
                    <div>
                      • Petugas: <span className="font-mono text-sky-300">petugas123</span>
                    </div>
                    <div>
                      • Klien: <span className="font-mono text-sky-300">klien123</span>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="login-submit-btn"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Masuk ke Sistem</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer Security Notice */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Autentikasi Terenkripsi & Pembatasan Hak Akses Multi-Lokasi</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Total {users.length} Akun Terdaftar • {projectList.length} Lokasi Proyek
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-5 text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} {companyProfile?.companyName || 'Rajawali Smart Service'}. Sistem Operasional Kebersihan Multi-Proyek.
        </div>
      </div>
    </div>
  );
};
