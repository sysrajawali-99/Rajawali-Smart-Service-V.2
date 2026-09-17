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
import { DamageReportView } from './components/web/DamageReportView';
import { LoginPage } from './components/auth/LoginPage';
import { ShieldAlert } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, activeTab, userRole, hasAccess, setActiveTab } = useCleaning();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isAllowed = hasAccess(userRole, activeTab);

  const renderActiveWebView = () => {
    if (!isAllowed) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Akses Menu Dibatasi</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Peran akun Anda (<span className="font-semibold text-slate-800 capitalize">{userRole}</span>) belum diizinkan membuka menu ini sesuai konfigurasi Matriks Hak Akses (RBAC).
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      // Inspeksi Report
      case 'ceklist':
        return <CeklistAreaView />;
      case 'area':
        return <AreaCleaningView />;
      case 'activity':
        return <CleaningActivityView />;
      case 'inspeksi':
        return <InspeksiControlView />;
      case 'report':
        return <LaporanReportView />;
      // Operational Report
      case 'petugas':
        return <PetugasView />;
      case 'shift':
        return <ShiftView />;
      case 'jadwal':
        return <JadwalCleaningView />;
      case 'kerusakan':
      case 'damage-report':
        return <DamageReportView />;
      case 'proyek':
        return <LokasiProyekView />;
      // Activity Report
      case 'daily-activity':
        return <DailyActivityView />;
      case 'weekly-activity':
        return <WeeklyActivityView />;
      case 'monthly-activity':
        return <MonthlyActivityView />;
      case 'master-program':
      case 'mcp':
        return <MasterCleaningProgramView />;
      case 'complaint':
        return <ComplaintView />;
      // Sistem & Master Data
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-sky-500 selection:text-white overflow-hidden">
      <Header />

      {/* Unified responsive multi-device layout (PC, Laptop, Tablet, Smartphone) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-5 md:p-6 lg:p-8">
            {renderActiveWebView()}
          </div>
        </main>
      </div>
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
