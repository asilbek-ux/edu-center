'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Cpu,
  Lock,
  Mail,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  GraduationCap,
  Users,
  Copy,
  Check,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  signInWithEmailPassword,
  sendPasswordResetEmail,
  updateUserPassword,
} from '@/lib/supabase/auth-actions';
import { UserRole } from '@/types/database';
import { DEMO_ACCOUNTS, DemoAccount } from '@/lib/demo-accounts';

const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  super_admin: '/admin',
  admin: '/admin',
  manager: '/manager',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'update-password' ? 'update-password' : 'login';

  const [mode, setMode] = useState<'login' | 'forgot' | 'update-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successUz, setSuccessUz] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorUz(null);
    setErrorCode(null);
    setSuccessUz(null);
    setLoading(true);

    try {
      const result = await signInWithEmailPassword(email, password);

      if (!result.authenticated || !result.role) {
        setErrorCode(result.errorCode || 'INVALID_CREDENTIALS');
        setErrorUz(
          result.errorUz ||
            "Tizimga kirishda xatolik yuz berdi. Email va parolni tekshirib qayta urinib ko'ring."
        );
        setLoading(false);
        return;
      }

      const redirectTo = searchParams.get('redirectTo');
      const destination = redirectTo || ROLE_REDIRECT_MAP[result.role] || '/student';
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Server bilan bog'lanishda kutilmagan xatolik yuz berdi.";
      setErrorUz(message);
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorUz(null);
    setErrorCode(null);
    setSuccessUz(null);
    setLoading(true);

    try {
      const result = await signInWithEmailPassword(account.email, account.password);

      if (!result.authenticated || !result.role) {
        setErrorCode(result.errorCode || 'INVALID_CREDENTIALS');
        setErrorUz(result.errorUz || "Demo hisobga kirishda xatolik yuz berdi.");
        setLoading(false);
        return;
      }

      const redirectTo = searchParams.get('redirectTo');
      const destination = redirectTo || ROLE_REDIRECT_MAP[result.role] || '/student';
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Server bilan bog'lanishda xatolik yuz berdi.";
      setErrorUz(message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorUz(null);
    setSuccessUz(null);
    setLoading(true);

    try {
      const res = await sendPasswordResetEmail(email);
      setSuccessUz(res.messageUz);
      setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi.";
      setErrorUz(message);
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorUz(null);
    setSuccessUz(null);

    if (newPassword !== confirmPassword) {
      setErrorUz("Parollar bir-biriga mos kelmadi.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateUserPassword(newPassword);
      setSuccessUz(res.messageUz);
      setLoading(false);
      setMode('login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Parolni yangilashda xatolik.";
      setErrorUz(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 lg:p-8 text-slate-900">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white shadow-lg">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">EduCenter ERP / LMS</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  v1.0 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Robototexnika va IT O&apos;quv Markazi Boshqaruv Tizimi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Zero-Trust PostgreSQL RLS & Server Guard</span>
          </div>
        </div>

        {/* Main Grid: Left (Login Form) | Right (Demo Accounts Panel) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'login' && "Tizimga kirish"}
                {mode === 'forgot' && "Parolni qayta tiklash"}
                {mode === 'update-password' && "Yangi parol o'rnatish"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login' && "O'z hisobingiz orqali tegishli boshqaruv paneliga kiring"}
                {mode === 'forgot' && "Elektron pochtangizni kiriting, tiklash havolasini yuboramiz"}
                {mode === 'update-password' && "Yangi xavfsiz parolingizni belgilang"}
              </p>
            </div>

            {/* Status / Error Alerts */}
            {errorUz && (
              <div
                role="alert"
                className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs font-medium ${
                  errorCode === 'INACTIVE_ACCOUNT'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {errorCode === 'INACTIVE_ACCOUNT' ? 'Hisob faol emas' : 'Xatolik'}
                  </p>
                  <p className="mt-0.5">{errorUz}</p>
                </div>
              </div>
            )}

            {successUz && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Muvaffaqiyatli</p>
                  <p className="mt-0.5">{successUz}</p>
                </div>
              </div>
            )}

            {/* 1. Login Mode */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                    Elektron pochta (Email)
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@educenter.uz"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Maxfiy parol
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorUz(null);
                        setSuccessUz(null);
                        setMode('forgot');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Parolni unutdingizmi?
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-10 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                      title={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Tekshirilmoqda..." : "Tizimga kirish"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* 2. Forgot Password Mode */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
                    Elektron pochta (Email)
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="foydalanuvchi@educenter.uz"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Yuborilmoqda..." : "Tiklash havolasini yuborish"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorUz(null);
                      setSuccessUz(null);
                      setMode('login');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    ← Kirish oynasiga qaytish
                  </button>
                </div>
              </form>
            )}

            {/* 3. Update Password Mode */}
            {mode === 'update-password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700">
                    Yangi parol (kamida 8 ta belgi)
                  </label>
                  <div className="relative mt-1">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="new-password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700">
                    Yangi parolni tasdiqlang
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Saqlanmoqda..." : "Parolni yangilash"}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Demo Accounts Showcase */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-bold text-slate-900">
                    Demo Hisoblar (1-bosishda kirish)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Istalgan rol boshqaruv panelini sinash uchun hisobni tanlang yoki to&apos;g&apos;ridan-to&apos;g&apos;ri bosing:
                </p>
              </div>
              <span className="hidden sm:inline-flex rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold border border-indigo-100">
                5 ta rol tayyor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((account) => {
                const isSelected = email === account.email;
                return (
                  <div
                    key={account.email}
                    className={`relative rounded-2xl border p-4 transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-200'
                        : `${account.borderColor} ${account.bgLight} hover:border-slate-400 bg-white`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r ${account.color}`}
                        >
                          {account.badgeUz}
                        </span>
                        <h3 className="mt-1.5 font-bold text-slate-900 text-sm">
                          {account.fullName}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {account.descriptionUz}
                        </p>
                      </div>
                    </div>

                    {/* Credentials with Copy Buttons */}
                    <div className="mt-3 space-y-1.5 rounded-xl bg-white/80 p-2.5 border border-slate-200/80 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-sans">Login:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{account.email}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.email, `email-${account.email}`)}
                            title="Logindan nusxa olish"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {copiedKey === `email-${account.email}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-sans">Parol:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-indigo-700">{account.password}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.password, `pass-${account.email}`)}
                            title="Paroldan nusxa olish"
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {copiedKey === `pass-${account.email}` ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickDemoLogin(account)}
                        className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold text-white shadow transition flex items-center justify-center gap-1.5 bg-gradient-to-r ${account.color} hover:opacity-95 disabled:opacity-50`}
                      >
                        <span>Kirish</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(account.email);
                          setPassword(account.password);
                        }}
                        title="Formaga to'ldirish"
                        className="rounded-xl border border-slate-300 bg-white py-2 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Tanlash
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <p>EduCenter LMS/ERP Platformasi • Robototexnika va IT markazlari uchun maxsus</p>
          <p>5 ta asosiy rol: Super Admin • Admin • O&apos;qituvchi • O&apos;quvchi • Ota-ona</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
