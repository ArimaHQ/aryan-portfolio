// ─── Arima Universe — Login ───
// 🔐 Cinematic authentication — Headquarters visual language

'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login, step, error, errorCode, isAuthenticated, resetStep } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otp, setOtp] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const mfaChallenge = errorCode === 'mfa_login_required' || errorCode === 'mfa_invalid';

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Invalid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 12) errors.password = 'Minimum 12 characters';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetStep();
    if (!validate()) return;
    await login(email, password, rememberMe, mfaChallenge ? otp : undefined);
  };

  // After successful auth, redirect based on selectedDivision
  useEffect(() => {
    if (step === 'success' && isAuthenticated) {
      const returnPath = sessionStorage.getItem('arimaReturnPath');
      if (returnPath?.startsWith('/') && !returnPath.startsWith('//')) {
        sessionStorage.removeItem('arimaReturnPath');
        router.push(returnPath);
        return;
      }
      const stored = sessionStorage.getItem('selectedDivision');
      if (stored) {
        sessionStorage.removeItem('selectedDivision');
        router.push(stored === 'investment-banking' ? '/investment-banking' : stored === 'projects' ? '/projects' : '/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, step, router]);

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue your journey">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full bg-white/[0.03] border border-white/10 rounded-none px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all duration-300 placeholder:text-white/10"
            placeholder="you@example.com"
          />
          {validationErrors.email && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-[10px] font-mono text-red-400/80">
              {validationErrors.email}
            </motion.p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white/[0.03] border border-white/10 rounded-none px-4 py-3.5 pr-12 text-white text-sm focus:outline-none focus:border-white/30 transition-all duration-300 placeholder:text-white/10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-mono text-white/20 hover:text-white/50 transition-colors uppercase"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {validationErrors.password && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-[10px] font-mono text-red-400/80">
              {validationErrors.password}
            </motion.p>
          )}
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 bg-transparent border border-white/20 rounded-none appearance-none checked:bg-blue-500/30 checked:border-blue-400/50 transition-all duration-300 cursor-pointer"
          />
          <span className="text-[9px] font-mono text-white/20 group-hover:text-white/40 transition-colors tracking-wider uppercase">
            Remember me
          </span>
        </label>

        {mfaChallenge ? (
          <div>
            <label htmlFor="login-otp" className="block text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">
              Privileged authenticator code
            </label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full bg-white/[0.03] border border-white/10 rounded-none px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 transition-all duration-300 placeholder:text-white/10"
            />
            <p className="mt-1.5 text-[10px] font-mono text-white/30">Enter the current six-digit code from your authenticator.</p>
          </div>
        ) : null}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border border-red-500/20 px-4 py-3"
          >
            <p className="text-[10px] font-mono text-red-400/80">{error}</p>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={step === 'loading'}
          className="group relative w-full py-3.5 mt-2"
        >
          <div className="absolute inset-0 border border-white/20 group-hover:border-blue-400/50 transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative text-white/70 group-hover:text-white text-sm tracking-[0.2em] uppercase font-light">
            {step === 'loading' ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-3 h-[1px] bg-blue-400/50 animate-pulse" />
                Signing in...
                <span className="w-3 h-[1px] bg-blue-400/50 animate-pulse" />
              </span>
            ) : (
              'Sign In'
            )}
          </span>
        </button>

        {/* Links */}
        <div className="text-center space-y-3 pt-2">
          <Link href="/forgot-password" className="block text-[9px] font-mono text-white/20 hover:text-white/50 transition-colors tracking-wider">
            Forgot password?
          </Link>
          <p className="text-[9px] font-mono text-white/10">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-white/30 hover:text-white/60 transition-colors">
              Register
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
