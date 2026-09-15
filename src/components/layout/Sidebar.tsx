import React from 'react';
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
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  rolesAllowed?: string[];
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    activeProject,
    currentUser,
  } = useCleaning();

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
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
      id: 'master-program',
      label: 'Master Cleaning Program',
      icon: CalendarRange,
    },
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
      id: 'complaint',
      label: 'Complaint',
      icon: AlertCircle,
    },
    {
      id: 'proyek',
      label: 'Lokasi Proyek',
      icon: Building2,
    },
    {
      id: 'report',
      label: 'Laporan / Report',
      icon: FileText,
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan & Master Data',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto">
      {/* Site Header in Sidebar with dynamic active project */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-800 truncate">{activeProject?.name || 'Proyek'}</p>
            </div>
            <p className="text-[11px] text-slate-500 truncate font-medium">
              {activeProject?.city || 'Jakarta'} • {activeProject?.totalFloors || 1} Lantai
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="p-3 flex-1 space-y-1">
        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 py-1">
          Menu Utama Operasional
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Banner / Profile card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {userRole.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 capitalize truncate">
              {currentUser?.name || userRole}
            </p>
            <p className="text-[10px] text-slate-400 capitalize truncate">
              Role: {userRole} {userRole === 'admin' ? '(Super Admin)' : ''}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
        </div>
      </div>
    </aside>
  );
};
