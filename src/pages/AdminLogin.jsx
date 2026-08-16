import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle } from 'lucide-react';
import { authApi } from '../api/index';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login({ username: username.trim(), password });
      localStorage.setItem('lumng_admin_token', data.token);
      localStorage.setItem('lumng_admin_username', data.username);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Invalid username or password'
          : 'Could not reach the server. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-9"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src="/logo.jpeg" alt="LUM NG" className="w-14 h-14 rounded-full object-cover border border-[var(--gold-dim)]" />
          <div className="text-center">
            <div
              className="font-[Playfair_Display] text-xl font-black tracking-widest"
              style={{ background: 'linear-gradient(135deg,var(--text),var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              LUM NG
            </div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--gold)] mt-1">Admin Panel</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-widest uppercase text-[var(--text-muted)]">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-ghost)]" />
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded pl-10 pr-3.5 py-2.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--gold-dim)] placeholder:text-[var(--text-ghost)] transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] tracking-widest uppercase text-[var(--text-muted)]">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-ghost)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded pl-10 pr-3.5 py-2.5 text-[var(--text)] text-sm focus:outline-none focus:border-[var(--gold-dim)] placeholder:text-[var(--text-ghost)] transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-[var(--danger)] bg-[rgba(232,92,92,0.1)] border border-[rgba(232,92,92,0.2)] rounded px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-gradient-to-br from-[var(--gold)] to-[var(--gold-light)] text-[var(--bg)] font-bold uppercase tracking-wider text-[13px] py-3 rounded hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
