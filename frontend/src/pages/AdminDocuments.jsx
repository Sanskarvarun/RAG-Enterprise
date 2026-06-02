import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FileText, ChevronRight, AlertCircle,
  CheckCircle2, Clock, XCircle, File,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div>
          <div className="h-3 w-44 rounded bg-zinc-200 dark:bg-zinc-800 mb-1.5" />
          <div className="h-2.5 w-28 rounded bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-24 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'processed' || s === 'completed' || s === 'done') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
        bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={10} />
        {status}
      </span>
    );
  }
  if (s === 'pending' || s === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
        bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock size={10} />
        {status}
      </span>
    );
  }
  if (s === 'error' || s === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
        bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <XCircle size={10} />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
      bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      {status || 'Unknown'}
    </span>
  );
}

function FileTypeBadge({ type }) {
  const ext = (type || '').replace('.', '').toUpperCase() || 'FILE';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide
      bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      {ext}
    </span>
  );
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/admin/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(res.data);
      } catch (e) {
        setError('Failed to load documents. Please check your permissions.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
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
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">Documents</span>
        </div>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center
            bg-sky-500/10 border border-sky-500/20">
            <FileText size={18} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Document Registry
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {loading ? 'Loading…' : `${docs.length} document${docs.length !== 1 ? 's' : ''} in the system`}
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

          {/* Column headers */}
          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800
            grid grid-cols-[1fr_auto] gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Document
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Status / Owner
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Skeletons */}
          {loading && !error && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && docs.length === 0 && (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-1">
                <File size={18} className="text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No documents found</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Documents uploaded by users will appear here.
              </p>
            </div>
          )}

          {/* Document list */}
          {!loading && !error && docs.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/20">
              {docs.map((d, idx) => (
                <div
                  key={d.id ?? idx}
                  className="flex items-center justify-between px-5 py-4
                    hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                      bg-sky-500/10 border border-sky-500/20">
                      <FileText size={15} className="text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate leading-none">
                        {d.filename || d.name || 'Unnamed file'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Owner: {d.owner_id || d.user_id || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Status + type */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={d.status} />
                    <FileTypeBadge type={d.file_type} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
