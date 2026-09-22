import React, { useState, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Users,
  Activity,
  ArrowRight,
  Filter,
  Layers,
  Search,
  Check,
  XCircle,
  FileCheck2,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { ProjectLocation } from '../../types';

export const CrossProjectLiveMonitor: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    allAreas,
    allTasks,
    dailyChecklists,
    complaints,
    cleaners,
    inspections,
    auditLogs,
    checkOverdueAreasAndTasks,
  } = useCleaning();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'needs_attention' | 'optimal'>('all');

  // Compute metrics per project
  const projectMetrics = useMemo(() => {
    const currentHour = new Date().getHours();

    return projects.map((proj) => {
      const projAreas = allAreas.filter((a) => a.projectId === proj.id);
      const projTasks = allTasks.filter((t) => !t.projectId || t.projectId === proj.id);
      const projCleaners = cleaners.filter((c) => !c.projectId || c.projectId === proj.id);
      const projComplaints = complaints.filter(
        (c) => (!c.projectId || c.projectId === proj.id) && c.status !== 'resolved'
      );
      const projInspections = inspections.filter((i) => !i.projectId || i.projectId === proj.id);

      // Area cleanliness
      const totalAreas = projAreas.length || 1;
      const cleanAreas = projAreas.filter((a) => a.status === 'clean' || a.status === 'inspected').length;
      const cleanlinessPercent = Math.round((cleanAreas / totalAreas) * 100);

      // Tasks progress
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter((t) => t.status === 'completed').length;
      const pendingApprovalTasks = projTasks.filter((t) => t.controllerApprovalStatus === 'pending' || t.status === 'pending_qc').length;

      // Overdue area check
      const projChecklists = dailyChecklists.filter((d) => d.projectId === proj.id);
      let overdueSlotsCount = 0;
      projChecklists.forEach((chk) => {
        chk.hourlySlots.forEach((s) => {
          if (s.hour < currentHour && s.status === 'pending') {
            overdueSlotsCount++;
          }
        });
      });

      // Average QC Score
      const totalQcScore = projInspections.reduce((acc, i) => acc + (i.score || 0), 0);
      const avgQcScore = projInspections.length > 0 ? Math.round(totalQcScore / projInspections.length) : 88;

      // Status health
      const hasIssue = overdueSlotsCount > 0 || projComplaints.length > 0 || cleanlinessPercent < 75;

      return {
        project: proj,
        totalAreas,
        cleanAreas,
        cleanlinessPercent,
        totalTasks,
        completedTasks,
        pendingApprovalTasks,
        activeCleaners: projCleaners.filter((c) => c.status === 'active' || c.isClockedIn).length,
        totalCleaners: projCleaners.length,
        openComplaints: projComplaints.length,
        overdueSlotsCount,
        avgQcScore,
        hasIssue,
      };
    });
  }, [projects, allAreas, allTasks, dailyChecklists, complaints, cleaners, inspections]);

  // Overall summary
  const totalProjectsCount = projects.length;
  const projectsWithIssues = projectMetrics.filter((m) => m.hasIssue).length;
  const totalOverdueOverall = projectMetrics.reduce((acc, m) => acc + m.overdueSlotsCount, 0);
  const totalPendingApprovalOverall = projectMetrics.reduce((acc, m) => acc + m.pendingApprovalTasks, 0);

  // Filtered project list
  const filteredProjects = projectMetrics.filter((m) => {
    if (selectedFilter === 'needs_attention' && !m.hasIssue) return false;
    if (selectedFilter === 'optimal' && m.hasIssue) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.project.name.toLowerCase().includes(q);
      const matchClient = m.project.clientName.toLowerCase().includes(q);
      const matchCity = (m.project.city || '').toLowerCase().includes(q);
      if (!matchName && !matchClient && !matchCity) return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Dashboard Monitoring Live Lintas Proyek (Single Screen)
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live Multi-Gedung
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau status kebersihan, keterlambatan checklist, kepatuhan SLA, dan personil seluruh gedung dalam satu layar tanpa perlu berpindah-pindah.
          </p>
        </div>

        {/* Action button to re-trigger check */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => checkOverdueAreasAndTasks()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Periksa ulang keterlambatan area lintas proyek sekarang"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Pindai Ulang Keterlambatan</span>
          </button>
        </div>
      </div>

      {/* Aggregate Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500">Total Proyek Dipantau</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalProjectsCount} Gedung</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Operasional aktif Rajawali</p>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200">
          <p className="text-[11px] font-semibold text-rose-700">Area / Slot Terlambat</p>
          <p className="text-xl font-bold text-rose-900 mt-1">{totalOverdueOverall} Slot</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Melewati jadwal belum dicek</p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
          <p className="text-[11px] font-semibold text-amber-700">Menunggu Approval Controller</p>
          <p className="text-xl font-bold text-amber-900 mt-1">{totalPendingApprovalOverall} Tugas</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Verifikasi bertingkat tertunda</p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
          <p className="text-[11px] font-semibold text-emerald-700">Proyek Berkinerja Baik</p>
          <p className="text-xl font-bold text-emerald-900 mt-1">
            {totalProjectsCount - projectsWithIssues} / {totalProjectsCount}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Kebersihan & SLA terpenuhi</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Proyek ({projectMetrics.length})
          </button>
          <button
            onClick={() => setSelectedFilter('needs_attention')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedFilter === 'needs_attention'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Perlu Perhatian ({projectsWithIssues})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('optimal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFilter === 'optimal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Optimal ({totalProjectsCount - projectsWithIssues})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari gedung atau klien..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Grid of Projects in 1 Screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((m) => {
          const isCurrentActive = m.project.id === activeProjectId;

          return (
            <div
              key={m.project.id}
              className={`p-4 rounded-xl border transition-all ${
                isCurrentActive
                  ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50/20'
                  : m.hasIssue
                  ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className={`w-4 h-4 ${isCurrentActive ? 'text-sky-600' : 'text-slate-500'}`} />
                    <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px]" title={m.project.name}>
                      {m.project.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {m.project.clientName} • {m.project.city || 'Indonesia'}
                  </p>
                </div>

                {m.hasIssue ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Perlu Atensi
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Sesuai SLA
                  </span>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Kebersihan Area</span>
                  <span className="font-bold text-slate-800 text-sm">{m.cleanlinessPercent}%</span>
                  <span className="text-[10px] text-slate-400 block">{m.cleanAreas}/{m.totalAreas} Area Bersih</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Skor Audit QC</span>
                  <span className="font-bold text-sky-700 text-sm">{m.avgQcScore}/100</span>
                  <span className="text-[10px] text-slate-400 block">Standar Pelayanan</span>
                </div>

                <div className={`p-2 rounded-lg border ${m.overdueSlotsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`text-[10px] block ${m.overdueSlotsCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                    Slot Terlewat
                  </span>
                  <span className={`font-bold text-sm ${m.overdueSlotsCount > 0 ? 'text-rose-800' : 'text-slate-800'}`}>
                    {m.overdueSlotsCount} Slot
                  </span>
                  <span className="text-[10px] text-slate-400 block">Checklist 24 Jam</span>
                </div>

                <div className={`p-2 rounded-lg border ${m.pendingApprovalTasks > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`text-[10px] block ${m.pendingApprovalTasks > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
                    Pending Approval
                  </span>
                  <span className={`font-bold text-sm ${m.pendingApprovalTasks > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                    {m.pendingApprovalTasks} Tugas
                  </span>
                  <span className="text-[10px] text-slate-400 block">Verifikasi Controller</span>
                </div>
              </div>

              {/* Footer and Switch project button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[10.5px] text-slate-500">
                  Petugas Aktif: <strong>{m.activeCleaners}</strong>/{m.totalCleaners} Orang
                </span>

                <button
                  type="button"
                  onClick={() => setActiveProjectId(m.project.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isCurrentActive
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{isCurrentActive ? 'Lokasi Aktif' : 'Pilih Proyek'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
