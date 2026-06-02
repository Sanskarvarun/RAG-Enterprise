import React from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, BarChart3, ChevronRight, Shield } from 'lucide-react';

const cards = [
  {
    to: '/admin/users',
    icon: <Users size={18} />,
    title: 'User Management',
    desc: 'View, manage roles, and control access for all platform users.',
    action: 'Manage Users',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'group-hover:border-violet-500/40',
  },
  {
    to: '/admin/documents',
    icon: <FileText size={18} />,
    title: 'Document Registry',
    desc: 'Inspect all uploaded documents, processing status, and ownership.',
    action: 'View Documents',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'group-hover:border-sky-500/40',
  },
  {
    to: '/admin/analytics',
    icon: <BarChart3 size={18} />,
    title: 'Analytics',
    desc: 'Monitor system usage, query volumes, and performance metrics.',
    action: 'View Analytics',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'group-hover:border-emerald-500/40',
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mb-8">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <ChevronRight size={12} />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">Admin</span>
        </div>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center
            bg-indigo-500/10 border border-indigo-500/20">
            <Shield size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Admin Console
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Platform administration and system management
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(({ to, icon, title, desc, action, color, bg, border, disabled }) => (
            <Link
              key={to}
              to={to}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={`group p-6 rounded-xl border flex flex-col justify-between min-h-[180px]
                transition-all duration-200
                bg-zinc-50 dark:bg-zinc-900/50
                border-zinc-200 dark:border-zinc-800
                ${disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : `hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 hover:shadow-sm ${border}`
                }`}
            >
              <div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${bg} ${color}
                  border border-current/10`}>
                  {icon}
                </div>
                <h2 className="text-sm font-semibold mb-1
                  text-zinc-900 dark:text-zinc-100
                  group-hover:text-zinc-950 dark:group-hover:text-white
                  transition-colors">
                  {title}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {desc}
                </p>
              </div>
              <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold
                ${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                {action}
                {!disabled && <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
