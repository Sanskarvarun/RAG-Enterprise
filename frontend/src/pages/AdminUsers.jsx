import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, ChevronRight, Shield, User, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div>
          <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-800 mb-1.5" />
          <div className="h-2.5 w-40 rounded bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      </div>
      <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (e) {
        setError('Failed to load users. Please check your permissions.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mb-8">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <ChevronRight size={12} />
          <Link to="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Admin
          </Link>
          <ChevronRight size={12} />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">Users</span>
        </div>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center
            bg-violet-500/10 border border-violet-500/20">
            <Users size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              User Management
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {loading ? 'Loading…' : `${users.length} user${users.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

          {/* Column headers */}
          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800
            grid grid-cols-[1fr_auto] gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              User
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Role
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && !error && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && users.length === 0 && (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-1">
                <Users size={18} className="text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No users found</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Users will appear here once they register.</p>
            </div>
          )}

          {/* User list */}
          {!loading && !error && users.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/20">
              {users.map((u, idx) => (
                <div
                  key={u.id ?? idx}
                  className="flex items-center justify-between px-5 py-4
                    hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                      bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400">
                      {(u.username || u.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-none">
                        {u.username || '—'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{u.email || '—'}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  {u.is_admin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                      bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Shield size={10} />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                      bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400
                      border border-zinc-200 dark:border-zinc-700">
                      <User size={10} />
                      User
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
