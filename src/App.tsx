import React, { Suspense } from 'react';
import { CleaningProvider, useCleaning } from './context/CleaningContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { OverdueAlertBanner } from './components/layout/OverdueAlertBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { TestModeBanner } from './components/common/TestModeBanner';
import { TopNotificationPopup, triggerTopNotification } from './components/common/TopNotificationPopup';
import { McpHourlyReminderMonitor } from './components/common/McpHourlyReminderMonitor';
import { ShieldAlert, RotateCw } from 'lucide-react';
import { updateDocumentFavicon, updateDocumentTitle, getActiveAppIcon } from './utils/dynamicFavicon';
import { setAppBadgeCount, clearAppBadgeCount } from './utils/appBadge';
import { lazyWithRetry, clearAppCachesAndReload, isChunkLoadError } from './utils/lazyWithRetry';

const LoginPage = lazyWithRetry(() => import('./components/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardView = lazyWithRetry(() => import('./components/web/DashboardView').then((m) => ({ default: m.DashboardView })));
const AreaCleaningView = lazyWithRetry(() => import('./components/web/AreaCleaningView').then((m) => ({ default: m.AreaCleaningView })));
const PetugasView = lazyWithRetry(() => import('./components/web/PetugasView').then((m) => ({ default: m.PetugasView })));
const ShiftView = lazyWithRetry(() => import('./components/web/ShiftView').then((m) => ({ default: m.ShiftView })));
const JadwalCleaningView = lazyWithRetry(() => import('./components/web/JadwalCleaningView').then((m) => ({ default: m.JadwalCleaningView })));
const CleaningActivityView = lazyWithRetry(() => import('./components/web/CleaningActivityView').then((m) => ({ default: m.CleaningActivityView })));
const InspeksiControlView = lazyWithRetry(() => import('./components/web/InspeksiControlView').then((m) => ({ default: m.InspeksiControlView })));
const ComplaintView = lazyWithRetry(() => import('./components/web/ComplaintView').then((m) => ({ default: m.ComplaintView })));
const LaporanReportView = lazyWithRetry(() => import('./components/web/LaporanReportView').then((m) => ({ default: m.LaporanReportView })));
const PengaturanView = lazyWithRetry(() => import('./components/web/PengaturanView').then((m) => ({ default: m.PengaturanView })));
const LokasiProyekView = lazyWithRetry(() => import('./components/web/LokasiProyekView').then((m) => ({ default: m.LokasiProyekView })));
const CeklistAreaView = lazyWithRetry(() => import('./components/web/CeklistAreaView').then((m) => ({ default: m.CeklistAreaView })));
const MasterCleaningProgramView = lazyWithRetry(() => import('./components/web/MasterCleaningProgramView').then((m) => ({ default: m.MasterCleaningProgramView })));
const DailyActivityView = lazyWithRetry(() => import('./components/web/DailyActivityView').then((m) => ({ default: m.DailyActivityView })));
const WeeklyActivityView = lazyWithRetry(() => import('./components/web/WeeklyActivityView').then((m) => ({ default: m.WeeklyActivityView })));
const MonthlyActivityView = lazyWithRetry(() => import('./components/web/MonthlyActivityView').then((m) => ({ default: m.MonthlyActivityView })));
const SpecialJobView = lazyWithRetry(() => import('./components/web/SpecialJobView').then((m) => ({ default: m.SpecialJobView })));
const DamageReportView = lazyWithRetry(() => import('./components/web/DamageReportView').then((m) => ({ default: m.DamageReportView })));
const KlienModeView = lazyWithRetry(() => import('./components/web/klien/KlienModeView').then((m) => ({ default: m.KlienModeView })));
const CompanyManagementView = lazyWithRetry(() => import('./components/web/CompanyManagementView').then((m) => ({ default: m.CompanyManagementView })));

const MenuChunkFallback: React.FC = () => (
  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3 text-xs text-slate-500">
    <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
    <span>Menyiapkan tampilan menu...</span>
  </div>
);

class ViewChunkErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { hasError: boolean; errorMsg: string; isChunkError: boolean; retryNonce: number }
> {
  constructor(props: { children: React.ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false, errorMsg: '', isChunkError: false, retryNonce: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMsg: error?.message || 'Gagal memuat modul menu.',
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMsg: '', isChunkError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-8 text-center space-y-4">
          <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              {this.state.isChunkError ? 'Versi Modul Menu Diperbarui' : 'Tampilan Menu Terhenti'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {this.state.isChunkError
                ? 'Terdapat pembaruan aplikasi di server atau gangguan koneksi saat memuat modul ini.'
                : this.state.errorMsg}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                this.setState((prev) => ({
                  hasError: false,
                  errorMsg: '',
                  isChunkError: false,
                  retryNonce: prev.retryNonce + 1,
                }))
              }
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
            <button
              type="button"
              onClick={() => clearAppCachesAndReload()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Muat Ulang &amp; Segarkan Cache
            </button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
  }
}

const MainLayout: React.FC = () => {
  const {
    isAuthenticated,
    activeTab,
    userRole,
    hasAccess,
    setActiveTab,
    isInitialLoading,
    companyProfile,
    tasks,
    complaints,
  } = useCleaning();

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

  // Synchronize App Badge (Native PWA icon + Favicon badge + Tab Title prefix)
  React.useEffect(() => {
    if (!isAuthenticated) {
      clearAppBadgeCount();
      return;
    }
    const overdueCount = (tasks || []).filter((t) => t.status === 'overdue').length;
    const unresolvedComplaints = (complaints || []).filter(
      (c) => c.status !== 'resolved' && (c as any).status !== 'selesai'
    ).length;
    const totalBadges = overdueCount + unresolvedComplaints;

    setAppBadgeCount(totalBadges);
  }, [isAuthenticated, tasks, complaints]);

  // Listen to background push broadcasts from Service Worker when tab is open
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const payload = event.data?.payload;
        if (payload?.title) {
          triggerTopNotification({
            title: payload.title,
            message: payload.body || 'Pemberitahuan operasional baru diterima.',
            category: 'new_complaint',
            targetTab: 'ceklist',
          });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Proteksi Khusus Peran Klien: Klien HANYA bisa membuka KLIEN MODE & sub-menunya
  React.useEffect(() => {
    if (isAuthenticated && userRole === 'klien' && activeTab !== 'klien-mode' && !activeTab.startsWith('klien-')) {
      setActiveTab('klien-mode');
    }
  }, [isAuthenticated, userRole, activeTab, setActiveTab]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TestModeBanner />
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <LoginPage />
          </Suspense>
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
            onClick={() => setActiveTab(userRole === 'klien' ? 'klien-mode' : 'dashboard')}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Kembali ke {userRole === 'klien' ? 'Portal Klien Mode' : 'Dashboard'}
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
      case 'perusahaan':
      case 'companies':
        return <CompanyManagementView />;
      case 'pengaturan':
        return <PengaturanView />;
      default:
        return userRole === 'klien' ? <KlienModeView initialSubTab="manpower" /> : <DashboardView />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-sky-500 selection:text-white overflow-hidden">
      <TopNotificationPopup />
      <McpHourlyReminderMonitor />
      <TestModeBanner />
      <Header />
      <OverdueAlertBanner />

      {/* Unified responsive multi-device layout (PC, Laptop, Tablet, Smartphone) */}

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
          <div className="max-w-7xl mx-auto w-full p-3 sm:p-5 md:p-6 lg:p-8">
            <ViewChunkErrorBoundary resetKey={activeTab}>
              <Suspense fallback={<MenuChunkFallback />}>
                {renderActiveWebView()}
              </Suspense>
            </ViewChunkErrorBoundary>
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
                  clearAppCachesAndReload();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    if (window.indexedDB) {
                      window.indexedDB.deleteDatabase('JTISmartDB');
                    }
                  } catch {}
                  await clearAppCachesAndReload();
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
