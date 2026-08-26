import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`
        relative w-[52px] h-[28px] rounded-full border transition-all duration-300 flex items-center flex-shrink-0
        ${isDark
          ? 'bg-[rgba(201,168,76,0.15)] border-[rgba(201,168,76,0.3)]'
          : 'bg-[rgba(160,118,30,0.12)] border-[rgba(160,118,30,0.35)]'
        }
        hover:border-[var(--gold)] hover:shadow-[0_0_12px_var(--gold-glow)]
        ${className}
      `}
    >
      <motion.div
        layout
        animate={{ x: isDark ? 2 : 24 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #c9a84c, #e8c97a)'
            : 'linear-gradient(135deg, #a0761e, #c49428)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span key="moon" initial={{ opacity: 0, rotate: -30, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 30, scale: 0.6 }} transition={{ duration: 0.2 }}>
              <Moon size={12} strokeWidth={2} color="#080808" />
            </motion.span>
          ) : (
            <motion.span key="sun" initial={{ opacity: 0, rotate: 30, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: -30, scale: 0.6 }} transition={{ duration: 0.2 }}>
              <Sun size={12} strokeWidth={2} color="#f5f0e8" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
