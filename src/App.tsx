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
import { SpecialJobView } from './components/web/SpecialJobView';
import { DamageReportView } from './components/web/DamageReportView';
import { KlienModeView } from './components/web/klien/KlienModeView';
import { LoginPage } from './components/auth/LoginPage';
import { OverdueAlertBanner } from './components/layout/OverdueAlertBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { TestModeBanner } from './components/common/TestModeBanner';
import { ShieldAlert } from 'lucide-react';
import { updateDocumentFavicon, updateDocumentTitle, getActiveAppIcon } from './utils/dynamicFavicon';


const MainLayout: React.FC = () => {
  const { isAuthenticated, activeTab, userRole, hasAccess, setActiveTab, isInitialLoading, companyProfile } = useCleaning();

  // Real-time dynamic favicon and browser tab title synchronization
  React.useEffect(() => {
    const activeIcon = getActiveAppIcon(companyProfile?.logoUrl);
    updateDocumentFavicon(activeIcon);
    if (companyProfile?.companyName) {
      updateDocumentTitle(companyProfile.companyName);
    }

    const handleIconsUpdated = (e: any) => {
      if (e.detail?.icon) {
        updateDocumentFavicon(e.detail.icon);
      }
      if (e.detail?.name) {
        updateDocumentTitle(e.detail.name);
      }
    };

    window.addEventListener('pwa-icons-updated', handleIconsUpdated);
    return () => window.removeEventListener('pwa-icons-updated', handleIconsUpdated);
  }, [companyProfile?.logoUrl, companyProfile?.companyName]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TestModeBanner />
        <div className="flex-1 overflow-auto">
          <LoginPage />
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white select-none">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-100">Memuat Data Sistem</h2>
            <p className="text-sm text-slate-400 mt-1">Mengambil data terbaru dari basis data server...</p>
          </div>
        </div>
      </div>
    );
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
      case 'special-job':
        return <SpecialJobView />;
      case 'master-program':
      case 'mcp':
        return <MasterCleaningProgramView />;
      case 'complaint':
        return <ComplaintView />;
      // Klien Mode Portal & Sub-Menu
      case 'klien-mode':
      case 'klien-manpower':
      case 'klien-checklist':
      case 'klien-kerusakan':
      case 'klien-activity':
      case 'klien-keluhan':
        return <KlienModeView initialSubTab={activeTab} />;
      // Sistem & Master Data
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-sky-500 selection:text-white overflow-hidden">
      <TestModeBanner />
      <Header />
      <OverdueAlertBanner />

      {/* Unified responsive multi-device layout (PC, Laptop, Tablet, Smartphone) */}

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-5 md:p-6 lg:p-8">
            {renderActiveWebView()}
          </div>
        </main>
      </div>

      <InstallPrompt />
    </div>
  );
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Terjadi kesalahan tampilan.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Memulihkan Tampilan Aplikasi</h2>
            <p className="text-xs text-slate-500">{this.state.errorMsg}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMsg: '' });
                  window.location.reload();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Reset Cache & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <CleaningProvider>
        <MainLayout />
      </CleaningProvider>
    </AppErrorBoundary>
  );
}
