import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Users,
  ClipboardList,
  Wrench,
  CalendarRange,
  AlertCircle,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { UserRole } from '../../../types';
import { getTodayScheduledMcpItems } from '../../../utils/mcpChecklist';

const KlienManpowerSection = lazy(() => import('./KlienManpowerSection').then((m) => ({ default: m.KlienManpowerSection })));
const KlienChecklistSection = lazy(() => import('./KlienChecklistSection').then((m) => ({ default: m.KlienChecklistSection })));
const KlienDamageSection = lazy(() => import('./KlienDamageSection').then((m) => ({ default: m.KlienDamageSection })));
const KlienActivitySection = lazy(() => import('./KlienActivitySection').then((m) => ({ default: m.KlienActivitySection })));
const KlienComplaintSection = lazy(() => import('./KlienComplaintSection').then((m) => ({ default: m.KlienComplaintSection })));

export type KlienSubTab =
  | 'manpower'
  | 'checklist'
  | 'kerusakan'
  | 'activity'
  | 'keluhan';

interface KlienModeViewProps {
  initialSubTab?: string;
}

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Super Admin',
  admin_perusahaan: 'Admin Perusahaan',
  service_manager: 'Service Manager',
  supervisor: 'Supervisor',
  team_leader: 'Team Leader',
  petugas: 'Petugas',
  klien: 'Klien / Tenant',
};

const ROLE_BADGE_CLASS_MAP: Record<UserRole, string> = {
  super_admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  admin_perusahaan: 'bg-sky-50 text-sky-700 border-sky-200',
  service_manager: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  supervisor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  team_leader: 'bg-teal-50 text-teal-700 border-teal-200',
  petugas: 'bg-slate-100 text-slate-700 border-slate-200',
  klien: 'bg-amber-50 text-amber-800 border-amber-200',
};

export const KlienModeView: React.FC<KlienModeViewProps> = ({ initialSubTab }) => {
  const {
    activeProject,
    allowedProjects,
    setActiveProjectId,
    companies,
    projectAssignedUsers,
    cleaners,
    checklistLocations,
    uploadedMcpPrograms,
    complaints,
    damageReports,
    setActiveTab,
    activeTab,
  } = useCleaning();

  // Normalize initialSubTab to our 5 tabs
  const resolveSubTab = (tab?: string): KlienSubTab => {
    if (!tab) return 'manpower';
    if (tab.includes('manpower')) return 'manpower';
    if (tab.includes('checklist')) return 'checklist';
    if (tab.includes('kerusakan') || tab.includes('damage')) return 'kerusakan';
    if (tab.includes('activity')) return 'activity';
    if (tab.includes('keluhan') || tab.includes('complaint')) return 'keluhan';
    return 'manpower';
  };

  const [activeSubTab, setActiveSubTab] = useState<KlienSubTab>(() => resolveSubTab(initialSubTab || activeTab));
  const [showConnectedUsers, setShowConnectedUsers] = useState(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(resolveSubTab(initialSubTab));
    }
  }, [initialSubTab]);

  useEffect(() => {
    setActiveSubTab(resolveSubTab(activeTab));
  }, [activeTab]);

  const handleTabChange = (tab: KlienSubTab) => {
    setActiveSubTab(tab);
    // Keep sidebar and app activeTab synchronized
    setActiveTab(`klien-${tab}`);
  };

  const activeCompany = useMemo(() => {
    const compId = activeProject?.companyId || activeProject?.company_id || '';
    return companies.find((c) => c.id === compId);
  }, [companies, activeProject?.companyId, activeProject?.company_id]);

  const todayMcpItemsCount = useMemo(() => {
    if (!activeProject?.id) return 0;
    return getTodayScheduledMcpItems(uploadedMcpPrograms, checklistLocations, new Date()).length;
  }, [activeProject?.id, uploadedMcpPrograms, checklistLocations]);

  const checklistBadgeCount = checklistLocations.length > 0 ? checklistLocations.length : todayMcpItemsCount;

  // Badge calculations
  const pendingDamageCount = damageReports.filter(
    (r) => r.status === 'dilaporkan' || r.status === 'dalam_penanganan'
  ).length;

  const openComplaintCount = complaints.filter(
    (c) => c.status === 'open' || c.status === 'in_progress'
  ).length;

  const subTabButtons: {
    id: KlienSubTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'manpower',
      label: 'Manpower',
      description: 'Presensi, Shift 1-3, Resign, Plotting',
      icon: Users,
      badge: cleaners.length,
      badgeColor: 'bg-sky-100 text-sky-800',
    },
    {
      id: 'checklist',
      label: 'Checklist Kebersihan',
      description: 'Toilet, Public Area, MCP Harian',
      icon: ClipboardList,
      badge: checklistBadgeCount > 0 ? checklistBadgeCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'kerusakan',
      label: 'Laporan Kerusakan',
      description: 'Tiket fasilitas, foto & status',
      icon: Wrench,
      badge: pendingDamageCount > 0 ? pendingDamageCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'activity',
      label: 'Activity Report',
      description: 'Daily Activity, Special Job, Progres & Laporan',
      icon: CalendarRange,
    },
    {
      id: 'keluhan',
      label: 'Keluhan',
      description: 'Di Buat, Di Kerjakan, Di Selesaikan',
      icon: AlertCircle,
      badge: openComplaintCount > 0 ? openComplaintCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* ACTIVE LOCATION & CONNECTED USERS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-sky-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {activeProject?.id ? activeProject.name : 'Lokasi Proyek Belum Dipilih'}
                </h2>
                {activeProject?.id && activeProject.code && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {activeProject.code}
                  </span>
                )}
                {activeCompany?.nama && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    {activeCompany.nama}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                {activeProject?.id ? (
                  <>
                    {activeProject.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {activeProject.city}
                      </span>
                    )}
                    {activeProject.clientName && (
                      <span>
                        Tenant: <strong className="font-semibold text-slate-700">{activeProject.clientName}</strong>
                      </span>
                    )}
                    <span>
                      Pengelola: <strong className="font-semibold text-slate-700">{activeProject.managerName || '-'}</strong>
                    </span>
                  </>
                ) : (
                  <span>Silakan pilih lokasi proyek atau hubungi Administrator untuk penugasan akses lokasi.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {allowedProjects.length > 1 && (
              <div className="relative">
                <select
                  aria-label="Pilih Lokasi Proyek Klien Mode"
                  value={activeProject?.id || ''}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                >
                  {allowedProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} {proj.city ? `(${proj.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeProject?.id && (
              <button
                type="button"
                onClick={() => setShowConnectedUsers((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Tim &amp; User Terhubung ({projectAssignedUsers.length})</span>
                {showConnectedUsers ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE CONNECTED USERS PANEL FOR SELECTED LOCATION */}
        {activeProject?.id && showConnectedUsers && (
          <div className="px-4 py-3 sm:px-5 bg-slate-50/80 border-t border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Daftar Akun User Terhubung ke Lokasi {activeProject.name}
              </p>
              <span className="text-[11px] text-slate-500">
                Total {projectAssignedUsers.length} akun memiliki akses ke lokasi ini
              </span>
            </div>

            {projectAssignedUsers.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Belum ada akun pengguna yang ditetapkan secara eksplisit untuk lokasi proyek ini di Pengaturan Manajemen Pengguna.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {projectAssignedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/90"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{u.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="truncate">{u.email || u.username}</span>
                        {u.phone && (
                          <span className="inline-flex items-center gap-0.5 shrink-0 text-slate-500">
                            <Phone className="w-3 h-3" />
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        ROLE_BADGE_CLASS_MAP[u.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {ROLE_LABEL_MAP[u.role] || u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EMPTY STATE IF NO ACTIVE PROJECT ASSIGNED */}
      {!activeProject?.id ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Belum Ada Lokasi Proyek Terhubung</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Akun Anda belum ditugaskan ke lokasi proyek mana pun. Silakan hubungi Administrator Perusahaan atau Super Admin untuk menghubungkan akun Anda dengan lokasi proyek yang sesuai.
          </p>
        </div>
      ) : (
        <>
          {/* HORIZONTAL SUB-NAVIGATION TABS */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
              {subTabButtons.map((tab) => {
                const isActive = activeSubTab === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`p-3 rounded-xl transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-transparent hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {tab.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-tight">{tab.label}</div>
                      <div
                        className={`text-[10.5px] truncate mt-0.5 ${
                          isActive ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RENDER CURRENT SUB-TAB CONTENT */}
          <div className="transition-all duration-200">
            <Suspense
              fallback={
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3 text-xs text-slate-500">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Memuat tampilan modul klien...</span>
                </div>
              }
            >
              {activeSubTab === 'manpower' && <KlienManpowerSection />}
              {activeSubTab === 'checklist' && <KlienChecklistSection />}
              {activeSubTab === 'kerusakan' && <KlienDamageSection />}
              {activeSubTab === 'activity' && <KlienActivitySection />}
              {activeSubTab === 'keluhan' && <KlienComplaintSection />}
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
};
