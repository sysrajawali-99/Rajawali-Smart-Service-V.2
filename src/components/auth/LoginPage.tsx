import React, { useState } from 'react';
import { useCleaning } from '../../context/CleaningContext';
import { Sparkles, Lock, User, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useCleaning();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Silakan masukkan Username atau Email Anda.');
      return;
    }

    if (!password) {
      setErrorMessage('Silakan masukkan Kata Sandi (Password) Anda.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(identifier, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Username/Email atau Password salah.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Subtle Background Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/20 mb-3 border border-white/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rajawali Smart Service</h1>
          <p className="text-sm text-slate-400 mt-1 font-normal">
            Cleaning Operations & Facility Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="mb-6 pb-4 border-b border-slate-800/80">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <span>Autentikasi Pengguna</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Masukkan kredensial resmi Anda untuk mengakses sistem
            </p>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email Input */}
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Username / Email
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
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

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-slate-500 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
            <span>Hak Akses Berbasis Peran (Role-Based Access Control)</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} Rajawali Smart Service. Seluruh hak cipta dilindungi.
        </div>
      </div>
    </div>
  );
};
