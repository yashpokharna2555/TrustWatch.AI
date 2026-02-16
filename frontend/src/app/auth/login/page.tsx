'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@trustwatch.com');
    setPassword('demo123');
    setError('');
    setLoading(true);

    try {
      await auth.login('demo@trustwatch.com', 'demo123');
      router.push('/dashboard');
    } catch (err: any) {
      setError('Demo account not found. Please run demo setup first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Login Card */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/20">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl shadow-lg">
              <span className="text-4xl">🔍</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-300">Sign in to TrustWatch</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-400/50 text-red-200 p-4 rounded-xl text-sm backdrop-blur-sm animate-shake">
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 font-bold text-lg shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin">⏳</span>
                <span>Signing in...</span>
              </span>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        {/* Demo Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/5 text-slate-300">Or try demo</span>
            </div>
          </div>
          
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mt-6 bg-white/10 backdrop-blur-sm text-white py-3 rounded-xl hover:bg-white/20 font-semibold border border-white/20 transition-all disabled:opacity-50"
          >
            Quick Demo Login
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-slate-300 mt-8">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
