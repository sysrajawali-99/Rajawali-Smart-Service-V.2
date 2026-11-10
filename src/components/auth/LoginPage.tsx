import React, { useState } from 'react';
import { useCleaning } from '../../context/CleaningContext';
import { getFullUploadUrl } from '../../services/apiService';
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, companyProfile } = useCleaning();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage('Silakan masukkan Username atau Email Anda.');
      return;
    }

    if (!password) {
      setErrorMessage('Silakan masukkan Kata Sandi (Password) Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(cleanIdentifier, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Username, email, atau kata sandi tidak sesuai.');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Terjadi kendala koneksi ke server saat mencoba masuk.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-4">
        {/* Header Branding */}
        <div className="text-center mb-6">
          {companyProfile?.logoUrl ? (
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl shadow-sky-500/15 mb-3.5 transition-transform hover:scale-105">
              <img
                src={getFullUploadUrl(companyProfile.logoUrl)}
                alt={companyProfile.companyName || 'Company Logo'}
                className="w-14 h-14 object-contain rounded-xl"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20 mb-3.5 border border-white/10">
              <Sparkles className="w-7 h-7" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {companyProfile?.companyName || 'SMART SERVICE'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal max-w-xs mx-auto leading-relaxed">
            {companyProfile?.tagline || 'Sistem Operasional Kebersihan Multi-Proyek'}
          </p>
        </div>

        {/* Manual Credentials Login Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/40">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <span>Login Kredensial Akun</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Masukkan kredensial resmi Anda untuk masuk ke sistem operasional
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-7">
            {/* Error Message Alert */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Identifier Input */}
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Username atau Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus
                    autoComplete="username"
                    placeholder="Masukkan username atau email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="login-submit-btn"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Sistem</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Security Notice */}
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2.5 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-relaxed">
              Autentikasi terenkripsi & hak akses terkontrol berdasarkan role pengguna
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-5 text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} {companyProfile?.companyName || 'Smart Cleaning Operations'}. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </div>
  );
};
