import React from 'react';
import { CleaningProvider, useCleaning } from './context/CleaningContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/web/DashboardView';
import { AreaCleaningView } from './components/web/AreaCleaningView';
import { PetugasView } from './components/web/PetugasView';
import { ShiftView } from './components/web/ShiftView';
import { JadwalCleaningView } from './components/web/JadwalCleaningView';
import { CleaningActivityView } from './components/web/CleaningActivityView';
import { InspeksiControlView } from './components/web/InspeksiControlView';
import { ComplaintView } from './components/web/ComplaintView';
import { LaporanReportView } from './components/web/LaporanReportView';
import { PengaturanView } from './components/web/PengaturanView';
import { LokasiProyekView } from './components/web/LokasiProyekView';
import { CeklistAreaView } from './components/web/CeklistAreaView';
import { MasterCleaningProgramView } from './components/web/MasterCleaningProgramView';
import { DailyActivityView } from './components/web/DailyActivityView';
import { WeeklyActivityView } from './components/web/WeeklyActivityView';
import { MonthlyActivityView } from './components/web/MonthlyActivityView';
import { MobileAppView } from './components/mobile/MobileAppView';

const MainLayout: React.FC = () => {
  const { activeTab, viewMode } = useCleaning();

  const renderActiveWebView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'ceklist':
        return <CeklistAreaView />;
      case 'proyek':
        return <LokasiProyekView />;
      case 'area':
        return <AreaCleaningView />;
      case 'petugas':
        return <PetugasView />;
      case 'shift':
        return <ShiftView />;
      case 'jadwal':
        return <JadwalCleaningView />;
      case 'master-program':
      case 'mcp':
        return <MasterCleaningProgramView />;
      case 'daily-activity':
        return <DailyActivityView />;
      case 'weekly-activity':
        return <WeeklyActivityView />;
      case 'monthly-activity':
        return <MonthlyActivityView />;
      case 'activity':
        return <CleaningActivityView />;
      case 'inspeksi':
        return <InspeksiControlView />;
      case 'complaint':
        return <ComplaintView />;
      case 'report':
        return <LaporanReportView />;
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header />

      {/* View Mode Switching: 'split' | 'web' | 'mobile' */}
      {viewMode === 'mobile' ? (
        <main className="flex-1 bg-slate-100 flex items-center justify-center p-2 sm:p-4">
          <MobileAppView />
        </main>
      ) : viewMode === 'web' ? (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-50 min-h-[calc(100vh-65px)]">
            {renderActiveWebView()}
          </main>
        </div>
      ) : (
        /* Split View: Web Dashboard + Live Mobile App companion on the side */
        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-50 min-h-[calc(100vh-65px)] border-r border-slate-200">
            {renderActiveWebView()}
          </main>
          <aside className="w-full xl:w-[420px] bg-slate-100 p-4 border-t xl:border-t-0 border-slate-200 overflow-y-auto flex flex-col items-center justify-start shrink-0">
            <div className="w-full text-center mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                📱 Tampilan Aplikasi Mobile Petugas Lapangan
              </span>
            </div>
            <MobileAppView />
          </aside>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <CleaningProvider>
      <MainLayout />
    </CleaningProvider>
  );
}
