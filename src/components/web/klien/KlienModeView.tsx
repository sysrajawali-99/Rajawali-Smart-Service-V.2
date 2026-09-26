import React, { useState, useEffect } from 'react';
import {
  Users,
  ClipboardList,
  Wrench,
  CalendarRange,
  AlertCircle,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { KlienManpowerSection } from './KlienManpowerSection';
import { KlienChecklistSection } from './KlienChecklistSection';
import { KlienDamageSection } from './KlienDamageSection';
import { KlienActivitySection } from './KlienActivitySection';
import { KlienComplaintSection } from './KlienComplaintSection';

export type KlienSubTab =
  | 'manpower'
  | 'checklist'
  | 'kerusakan'
  | 'activity'
  | 'keluhan';

interface KlienModeViewProps {
  initialSubTab?: string;
}

export const KlienModeView: React.FC<KlienModeViewProps> = ({ initialSubTab }) => {
  const {
    activeProject,
    cleaners,
    complaints,
    damageReports,
    klienChecklistInspections,
    userRole,
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
      description: 'Toilet, Public Area, Parking',
      icon: ClipboardList,
      badge: klienChecklistInspections.length > 0 ? klienChecklistInspections.length : undefined,
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
    <div className="space-y-6 pb-12">
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
        {activeSubTab === 'manpower' && <KlienManpowerSection />}
        {activeSubTab === 'checklist' && <KlienChecklistSection />}
        {activeSubTab === 'kerusakan' && <KlienDamageSection />}
        {activeSubTab === 'activity' && <KlienActivitySection />}
        {activeSubTab === 'keluhan' && <KlienComplaintSection />}
      </div>
    </div>
  );
};
