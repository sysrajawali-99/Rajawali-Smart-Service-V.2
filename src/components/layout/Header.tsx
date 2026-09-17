import React, { useState } from 'react';
import {
  Sparkles,
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  X,
  Lock,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const {
    userRole,
    setUserRole,
    notifications,
    dismissNotification,
    clearAllNotifications,
    triggerDeadlinePushNotification,
    resetToInitialData,
    activeProject,
    setActiveProjectId,
    allowedProjects,
    users,
    setActiveUserId,
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    toggleMobileMenu,
  } = useCleaning();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const roleLabels: Record<UserRole, { title: string; color: string; desc: string }> = {
    admin: {
      title: 'Super Administrator',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      desc: 'Akses penuh ke semua lokasi proyek & hak akses pengguna',
    },
    supervisor: {
      title: 'Supervisor / Pengawas',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: 'Hanya melihat proyek yang ditentukan oleh Super Admin',
    },
    petugas: {
      title: 'Petugas Lapangan',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      desc: 'Hanya melihat proyek yang ditentukan & isi ceklist harian',
    },
    klien: {
      title: 'Klien / Tenant Gedung',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      desc: 'Hanya memantau proyek yang menjadi area kontraknya',
    },
  };

  const getTabInfo = (tab: string): { category: string; label: string } => {
    switch (tab) {
      case 'dashboard':
        return { category: 'Ringkasan', label: 'Dashboard Utama' };
      case 'ceklist':
        return { category: 'Inspeksi Report', label: 'Ceklist Kebersihan Area' };
      case 'area':
        return { category: 'Inspeksi Report', label: 'Area Cleaning' };
      case 'activity':
        return { category: 'Inspeksi Report', label: 'Cleaning Activity' };
      case 'inspeksi':
        return { category: 'Inspeksi Report', label: 'Inspeksi & Control' };
      case 'report':
        return { category: 'Inspeksi Report', label: 'Laporan & Report' };
      case 'petugas':
        return { category: 'Operational Report', label: 'Petugas' };
      case 'shift':
        return { category: 'Operational Report', label: 'Shift' };
      case 'jadwal':
        return { category: 'Operational Report', label: 'Jadwal Cleaning' };
      case 'kerusakan':
      case 'damage-report':
        return { category: 'Operational Report', label: 'Laporan Kerusakan' };
      case 'proyek':
        return { category: 'Operational Report', label: 'Lokasi Proyek' };
      case 'daily-activity':
        return { category: 'Activity Report', label: 'Daily Activity' };
      case 'weekly-activity':
        return { category: 'Activity Report', label: 'Weekly Activity' };
      case 'monthly-activity':
        return { category: 'Activity Report', label: 'Monthly Activity' };
      case 'master-program':
      case 'mcp':
        return { category: 'Activity Report', label: 'Master Cleaning Program' };
      case 'complaint':
        return { category: 'Activity Report', label: 'Complaint' };
      case 'pengaturan':
        return { category: 'Sistem', label: 'Pengaturan & Master Data' };
      default:
        return { category: 'Sistem', label: tab };
    }
  };

  const currentTabInfo = getTabInfo(activeTab);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-4 lg:px-6 flex items-center shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Left: Hamburger (Mobile/Tablet) & Brand / Project Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          {/* Hamburger Menu button for mobile and tablet */}
          <button
            id="header-mobile-menu-toggle"
            onClick={toggleMobileMenu}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
            aria-label="Buka Menu Navigasi"
            title="Buka Menu Navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo icon */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-xs shadow-sky-200 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Brand and Project Info */}
          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                Smart Cleaning
              </h1>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                v2.5
              </span>
            </div>

            {/* Project Picker / Active Project Badge */}
            <div className="relative mt-0.5">
              <button
                id="header-project-picker"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer max-w-full"
                title={activeProject ? `${activeProject.name} (${activeProject.city})` : 'Pilih Proyek'}
              >
                <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-800 group-hover:text-sky-700 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[240px] md:max-w-xs">
                  {activeProject?.name || 'Pilih Proyek'}
                </span>
                {activeProject?.city && (
                  <>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="text-slate-500 hidden sm:inline truncate max-w-[100px]">{activeProject.city}</span>
                  </>
                )}
                {userRole === 'admin' ? (
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0" />
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 font-medium shrink-0">
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    Terbatas
                  </span>
                )}
              </button>

              {/* Project Dropdown */}
              {showProjectDropdown && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {userRole === 'admin' ? 'Pilih Lokasi Proyek' : 'Lokasi Proyek Anda'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {userRole === 'admin'
                          ? 'Super Admin memiliki akses semua lokasi'
                          : 'Ditentukan secara khusus oleh Super Admin'}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {allowedProjects.map((p) => {
                      const isSelected = p.id === activeProject?.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveProjectId(p.id);
                            setShowProjectDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {p.city} • {p.totalFloors} Lantai ({p.code})
                            </p>
                          </div>
                          {isSelected && <span className="text-sky-600 font-bold text-xs">✓</span>}
                        </button>
                      );
                    })}

                    {allowedProjects.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Tidak ada lokasi proyek yang ditugaskan ke akun Anda.
                      </div>
                    )}
                  </div>

                  {userRole === 'admin' && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowProjectDropdown(false);
                          setActiveTab('proyek');
                        }}
                        className="w-full text-center text-xs text-sky-600 font-semibold hover:text-sky-800 py-1 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        + Kelola & Tambah Lokasi Proyek
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Responsive Active Section Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs font-medium">
          <span className="text-slate-500 font-normal">{currentTabInfo.category}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">{currentTabInfo.label}</span>
        </div>

        {/* Right Side: Role Selector, Notifications & Reset Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Role Switcher */}
          <div className="relative">
            <button
              id="header-role-switcher"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 transition-colors shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold leading-tight">
                  Role Aktif
                </span>
                <span className="font-semibold text-slate-800 text-[11px] leading-tight block">
                  {roleLabels[userRole].title.split('/')[0]}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 sm:w-68 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Ganti Role Pengguna
                  </p>
                  <p className="text-xs text-slate-500">Uji hak akses proyek sesuai role</p>
                </div>
                {(['admin', 'supervisor', 'petugas', 'klien'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setUserRole(role);
                      const matchingUser = users.find((u) => u.role === role);
                      if (matchingUser) {
                        setActiveUserId(matchingUser.id);
                      }
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors cursor-pointer ${
                      userRole === role
                        ? 'bg-sky-50 text-sky-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{roleLabels[role].title}</span>
                      {userRole === role && <span className="text-sky-600 text-xs">✓</span>}
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal mt-0.5">
                      {roleLabels[role].desc}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
              title="Notifikasi Operasional"
              aria-label="Notifikasi Operasional"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {unreadNotifs.length > 99 ? '99+' : unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-1.5 w-76 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-800">
                      Notifikasi Sistem
                    </span>
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {notifications.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={triggerDeadlinePushNotification}
                      className="text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline flex items-center gap-1"
                      title="Tes Push Notifikasi Deadline"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Tes Alarm</span>
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-slate-400 hover:text-slate-700"
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs">Tidak ada notifikasi saat ini</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 flex items-start gap-2.5 transition-colors ${
                          notif.read ? 'bg-white' : 'bg-sky-50/40'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'urgent' && (
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                          )}
                          {notif.type === 'warning' && (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                          {notif.type === 'success' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          {notif.type === 'info' && (
                            <Sparkles className="w-4 h-4 text-sky-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {notif.timestamp}
                          </span>
                        </div>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="text-slate-300 hover:text-slate-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset App State */}
          <button
            onClick={resetToInitialData}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Reset Data ke Default Awal"
            aria-label="Reset Data ke Default Awal"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
