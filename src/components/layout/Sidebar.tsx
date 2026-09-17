import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Clock,
  CalendarCheck,
  CalendarRange,
  Calendar,
  CalendarClock,
  Activity,
  CheckCheck,
  AlertCircle,
  FileText,
  Settings,
  Building2,
  ClipboardList,
  Wrench,
  ShieldCheck,
  Briefcase,
  Layers,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorBadge: string;
  items: MenuItem[];
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    activeProject,
    currentUser,
    complaints,
    damageReports,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useCleaning();

  const pendingDamageCount = damageReports.filter(
    (r) => r.status === 'dilaporkan' || r.status === 'dalam_penanganan'
  ).length;

  const openComplaintCount = complaints.filter(
    (c) => c.status === 'open' || c.status === 'in_progress'
  ).length;

  const menuGroups: MenuGroup[] = [
    {
      id: 'inspeksi-report',
      title: 'Inspeksi Report',
      icon: ShieldCheck,
      colorBadge: 'bg-sky-100 text-sky-800 border-sky-200',
      items: [
        {
          id: 'ceklist',
          label: 'Ceklist Kebersihan Area',
          icon: ClipboardList,
        },
        {
          id: 'area',
          label: 'Area Cleaning',
          icon: MapPin,
        },
        {
          id: 'activity',
          label: 'Cleaning Activity',
          icon: Activity,
        },
        {
          id: 'inspeksi',
          label: 'Inspeksi & Control',
          icon: CheckCheck,
        },
        {
          id: 'report',
          label: 'Laporan & Report',
          icon: FileText,
        },
      ],
    },
    {
      id: 'operational-report',
      title: 'Operational Report',
      icon: Briefcase,
      colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      items: [
        {
          id: 'petugas',
          label: 'Petugas',
          icon: Users,
        },
        {
          id: 'shift',
          label: 'Shift',
          icon: Clock,
        },
        {
          id: 'jadwal',
          label: 'Jadwal Cleaning',
          icon: CalendarCheck,
        },
        {
          id: 'kerusakan',
          label: 'Laporan Kerusakan',
          icon: Wrench,
          badge: pendingDamageCount > 0 ? pendingDamageCount : undefined,
          badgeColor: 'bg-rose-600 text-white',
        },
        {
          id: 'proyek',
          label: 'Lokasi Proyek',
          icon: Building2,
        },
      ],
    },
    {
      id: 'activity-report',
      title: 'Activity Report',
      icon: CalendarRange,
      colorBadge: 'bg-amber-100 text-amber-800 border-amber-200',
      items: [
        {
          id: 'daily-activity',
          label: 'Daily Activity',
          icon: Calendar,
        },
        {
          id: 'weekly-activity',
          label: 'Weekly Activity',
          icon: CalendarRange,
        },
        {
          id: 'monthly-activity',
          label: 'Monthly Activity',
          icon: CalendarClock,
        },
        {
          id: 'master-program',
          label: 'Master Cleaning Program',
          icon: Layers,
        },
        {
          id: 'complaint',
          label: 'Complaint',
          icon: AlertCircle,
          badge: openComplaintCount > 0 ? openComplaintCount : undefined,
          badgeColor: 'bg-amber-600 text-white',
        },
      ],
    },
  ];

  // Accordion state: only expanded groups show their sub-menus
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((g) => {
      // Expand the group that contains the current active tab
      if (g.items.some((item) => item.id === activeTab)) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  // Automatically expand group when activeTab changes (e.g. from dashboard click)
  useEffect(() => {
    menuGroups.forEach((g) => {
      if (g.items.some((item) => item.id === activeTab)) {
        setExpandedGroups((prev) => ({ ...prev, [g.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay - strictly below header (top-16) */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 top-16 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar Drawer - always below header (top-16 on mobile/tablet, and flex child under header on lg) */}
      <aside
        id="app-sidebar"
        className={`fixed top-16 bottom-0 left-0 z-30 lg:static lg:top-0 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-[calc(100vh-4rem)] lg:h-full overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Project Header card in Sidebar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {activeProject?.name || 'Smart Cleaning'}
              </p>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                {activeProject?.city || 'Indonesia'} • {activeProject?.totalFloors || 1} Lantai
              </p>
            </div>
          </div>

          {/* Close button on mobile/tablet */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 flex-1 space-y-2">
          {/* Main Dashboard Link */}
          <div>
            <button
              id="sidebar-nav-dashboard"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate font-bold">Dashboard Utama</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeTab === 'dashboard'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                Ringkasan
              </span>
            </button>
          </div>

          {/* 3 Collapsible Categorized Menu Groups */}
          {menuGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = !!expandedGroups[group.id];
            const hasActiveChild = group.items.some((item) => item.id === activeTab);

            // Group badge counter (e.g. pending damage reports or open complaints inside group)
            const groupTotalBadge = group.items.reduce(
              (acc, item) => acc + (item.badge || 0),
              0
            );

            return (
              <div
                key={group.id}
                className={`rounded-2xl transition-all border ${
                  hasActiveChild
                    ? 'bg-slate-50/70 border-slate-200/80'
                    : 'bg-white border-transparent'
                }`}
              >
                {/* Clickable Group Header to Toggle Sub-Menus */}
                <button
                  id={`sidebar-group-${group.id}`}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    hasActiveChild
                      ? 'text-sky-900 bg-sky-50/80 hover:bg-sky-100/70'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={`${isExpanded ? 'Sembunyikan' : 'Buka'} sub-menu ${group.title}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        hasActiveChild
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      <GroupIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate uppercase tracking-wider text-[11px] font-bold">
                      {group.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {groupTotalBadge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white animate-pulse">
                        {groupTotalBadge}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${group.colorBadge}`}
                    >
                      {group.items.length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 transition-transform duration-200" />
                    )}
                  </div>
                </button>

                {/* Sub-menu items: ONLY rendered when group is expanded */}
                {isExpanded && (
                  <div className="pl-3.5 pr-2 py-1.5 ml-3.5 border-l-2 border-sky-300/60 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-nav-${item.id}`}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'bg-sky-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                isActive ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                isActive
                                  ? 'bg-white text-rose-600'
                                  : item.badgeColor || 'bg-rose-500 text-white'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pengaturan & Master Data */}
          <div className="pt-2 border-t border-slate-100">
            <button
              id="sidebar-nav-pengaturan"
              onClick={() => handleNavClick('pengaturan')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Settings
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'pengaturan' ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate font-semibold">Pengaturan & Master Data</span>
              </div>
            </button>
          </div>
        </nav>

        {/* User Profile Card Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 mt-auto shrink-0">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {userRole.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 capitalize truncate">
                {currentUser?.name || userRole}
              </p>
              <p className="text-[10px] text-slate-400 capitalize truncate">
                Role: {userRole === 'admin' ? 'Super Admin' : userRole}
              </p>
            </div>
            <div
              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
              title="Aktif"
            />
          </div>
        </div>
      </aside>
    </>
  );
};
