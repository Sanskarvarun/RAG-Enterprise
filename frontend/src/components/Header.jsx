import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Hide main header on chat view to maximize screen space
  if (location.pathname === '/chat') return null;

  const navLinks = [
    { to: '/', label: 'Dashboard', exact: true },
    { to: '/chat', label: 'Chat' },
    { to: '/documents', label: 'Knowledge Base' },
    { to: '/admin', label: 'Admin' },
  ];

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b
      bg-white/80 dark:bg-zinc-950/80
      border-zinc-200 dark:border-zinc-900
      transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center
            bg-zinc-100 dark:bg-zinc-900
            border border-zinc-200 dark:border-zinc-800
            group-hover:border-indigo-400 dark:group-hover:border-indigo-500
            transition-colors">
            <Bot size={14} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight
            text-zinc-900 dark:text-zinc-100">
            Enterprise Portal
          </span>
        </Link>

        {/* Nav + Toggle */}
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1 mr-3">
            {navLinks.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${isActive(to, exact)
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
                  }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              bg-zinc-100 dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-800
              text-zinc-500 dark:text-zinc-400
              hover:text-zinc-900 dark:hover:text-zinc-100
              hover:border-zinc-300 dark:hover:border-zinc-700
              transition-all duration-200"
          >
            {theme === 'dark'
              ? <Sun size={14} />
              : <Moon size={14} />
            }
          </button>
        </div>
      </div>
    </header>
  );
}
