import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

export const PerformanceTrendsSection: React.FC = () => {
  const { cleaners, tasks, inspections, dailyChecklists } = useCleaning();
  const [selectedView, setSelectedView] = useState<'cleaners' | 'areas'>('cleaners');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | 'all'>('7days');

  // Compute cleaner metrics
  const cleanerMetrics = useMemo(() => {
    return cleaners.map((cleaner) => {
      const cleanerTasks = tasks.filter(
        (t) => (t.cleanerName || '').toLowerCase() === cleaner.name.toLowerCase()
      );
      const completedTasks = cleanerTasks.filter((t) => t.status === 'completed');
      const pendingApproval = cleanerTasks.filter(
        (t) => t.controllerApprovalStatus === 'pending' || t.status === 'pending_qc'
      );
      const approvedTasks = cleanerTasks.filter(
        (t) => t.controllerApprovalStatus === 'approved'
      );
      const rejectedTasks = cleanerTasks.filter(
        (t) => t.controllerApprovalStatus === 'rejected'
      );

      // QC Inspections for this cleaner
      const cleanerInspections = inspections.filter(
        (i) => (i.cleanerName || '').toLowerCase() === cleaner.name.toLowerCase()
      );
      const avgQcScore =
        cleanerInspections.length > 0
          ? Math.round(
              cleanerInspections.reduce((sum, item) => sum + (item.score || 0), 0) /
                cleanerInspections.length
            )
          : 85;

      const completionRate =
        cleanerTasks.length > 0
          ? Math.round((completedTasks.length / cleanerTasks.length) * 100)
          : 100;

      // Dynamic Trend determination
      let trendDirection: 'up' | 'stable' | 'down' = 'up';
      if (avgQcScore >= 88 && completionRate >= 90) {
        trendDirection = 'up';
      } else if (avgQcScore >= 75) {
        trendDirection = 'stable';
      } else {
        trendDirection = 'down';
      }

      return {
        id: cleaner.id,
        name: cleaner.name,
        role: cleaner.role,
        rating: cleaner.rating || 4.8,
        totalTasks: cleanerTasks.length,
        completedTasks: completedTasks.length,
        approvedTasks: approvedTasks.length,
        rejectedTasks: rejectedTasks.length,
        pendingApproval: pendingApproval.length,
        avgQcScore,
        completionRate,
        trendDirection,
      };
    });
  }, [cleaners, tasks, inspections]);

  // Compute area performance metrics
  const areaMetrics = useMemo(() => {
    // Collect all areas from daily checklists and tasks
    const areaMap = new Map<string, { totalChecks: number; cleanCount: number; issueCount: number; qcScores: number[] }>();

    dailyChecklists.forEach((chk) => {
      const area = chk.locationName || 'Area';
      if (!areaMap.has(area)) {
        areaMap.set(area, { totalChecks: 0, cleanCount: 0, issueCount: 0, qcScores: [] });
      }
      const item = areaMap.get(area)!;
      chk.hourlySlots.forEach((slot) => {
        if (slot.status === 'clean') {
          item.totalChecks += 1;
          item.cleanCount += 1;
        } else if (slot.status === 'has_issue' || slot.status === 'dirty' || slot.status === 'broken') {
          item.totalChecks += 1;
          item.issueCount += 1;
        }
      });
    });

    // Also include QC inspections
    inspections.forEach((insp) => {
      const area = insp.areaName || 'Area';
      if (!areaMap.has(area)) {
        areaMap.set(area, { totalChecks: 0, cleanCount: 0, issueCount: 0, qcScores: [] });
      }
      const item = areaMap.get(area)!;
      item.qcScores.push(insp.score);
    });

    return Array.from(areaMap.entries()).map(([areaName, data]) => {
      const cleanRate =
        data.totalChecks > 0
          ? Math.round((data.cleanCount / data.totalChecks) * 100)
          : 95;
      const avgScore =
        data.qcScores.length > 0
          ? Math.round(data.qcScores.reduce((a, b) => a + b, 0) / data.qcScores.length)
          : 88;

      let cleanlinessGrade = 'A';
      if (cleanRate < 80 || avgScore < 75) cleanlinessGrade = 'C';
      else if (cleanRate < 90 || avgScore < 85) cleanlinessGrade = 'B';

      return {
        areaName,
        totalChecks: data.totalChecks,
        cleanCount: data.cleanCount,
        issueCount: data.issueCount,
        cleanRate,
        avgScore,
        cleanlinessGrade,
      };
    });
  }, [dailyChecklists, inspections]);

  // Filters
  const filteredCleaners = cleanerMetrics.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAreas = areaMetrics.filter((a) =>
    a.areaName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Control */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-950 text-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-sky-500/20 border border-sky-400/30 text-sky-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Riwayat & Tren Kinerja Petugas & Area
              </h3>
              <p className="text-xs text-sky-200/80">
                Analitik evaluasi performa dinamis, tingkat kepatuhan SOP, dan rasio kualitas berkelanjutan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedView('cleaners')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedView === 'cleaners'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Evaluasi Petugas ({cleanerMetrics.length})
            </button>
            <button
              onClick={() => setSelectedView('areas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedView === 'areas'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Kinerja Area ({areaMetrics.length})
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedView === 'cleaners' ? 'Cari nama petugas...' : 'Cari nama area / zona...'
              }
              className="w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 text-xs focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sky-200 text-[11px]">Rentang Analisa:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-semibold text-white focus:outline-none"
            >
              <option value="7days" className="bg-slate-900">7 Hari Terakhir</option>
              <option value="30days" className="bg-slate-900">30 Hari Terakhir</option>
              <option value="all" className="bg-slate-900">Sepanjang Waktu</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: CLEANERS EVALUATION */}
      {selectedView === 'cleaners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCleaners.map((cleaner) => {
            return (
              <div
                key={cleaner.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-sky-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                      {cleaner.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{cleaner.name}</h4>
                      <p className="text-[11px] text-slate-500 capitalize">{cleaner.role}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      cleaner.trendDirection === 'up'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : cleaner.trendDirection === 'stable'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {cleaner.trendDirection === 'up'
                      ? '↗ Tren Meningkat'
                      : cleaner.trendDirection === 'stable'
                      ? '→ Performa Stabil'
                      : '↘ Perlu Pembinaan'}
                  </span>
                </div>

                {/* Progress bars & Metrics */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Tingkat Penyelesaian Tugas</span>
                      <span className="font-bold text-slate-800">{cleaner.completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cleaner.completionRate >= 90
                            ? 'bg-emerald-500'
                            : cleaner.completionRate >= 75
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${cleaner.completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Rata-rata Skor QC Audit</span>
                      <span className="font-bold text-sky-700">{cleaner.avgQcScore} / 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full transition-all duration-500"
                        style={{ width: `${cleaner.avgQcScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <div className="text-[10px] text-slate-400">Total Tugas</div>
                    <div className="font-bold text-slate-800 text-xs">{cleaner.totalTasks}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <div className="text-[10px] text-emerald-600">Disetujui</div>
                    <div className="font-bold text-emerald-800 text-xs">{cleaner.approvedTasks}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50">
                    <div className="text-[10px] text-rose-600">Ditolak</div>
                    <div className="font-bold text-rose-800 text-xs">{cleaner.rejectedTasks}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: AREAS PERFORMANCE */}
      {selectedView === 'areas' && (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Area & Lokasi</th>
                <th className="py-3 px-4 text-center">Total Slot Ceklist</th>
                <th className="py-3 px-4 text-center">Slot Bersih</th>
                <th className="py-3 px-4 text-center">Temuan Isu</th>
                <th className="py-3 px-4 text-center">Kepatuhan Kebersihan</th>
                <th className="py-3 px-4 text-center">Skor Mutu QC</th>
                <th className="py-3 px-4 text-center">Predikat Mutu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAreas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada data rekaman area.
                  </td>
                </tr>
              ) : (
                filteredAreas.map((area, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        <span>{area.areaName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {area.totalChecks}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                      {area.cleanCount}
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                      {area.issueCount}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-800">{area.cleanRate}%</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-sky-700">{area.avgScore} / 100</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          area.cleanlinessGrade === 'A'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : area.cleanlinessGrade === 'B'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        Grade {area.cleanlinessGrade}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
