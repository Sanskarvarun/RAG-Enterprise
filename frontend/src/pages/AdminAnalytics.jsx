import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart3, ChevronRight, Users, MessageSquare, 
  Activity, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-250 dark:bg-zinc-800" />
        <div>
          <div className="h-3 w-24 rounded bg-zinc-250 dark:bg-zinc-800 mb-1" />
          <div className="h-2.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800/60" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-4 w-12 rounded bg-zinc-250 dark:bg-zinc-800" />
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/analytics/detailed`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        setError('Failed to load analytics data. Make sure you have administrative privileges.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token]);

  const getUsageColor = (percentage) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200 pb-12">
      <div className="max-w-5xl mx-auto px-6 py-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mb-8">
          <Link to="/" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/admin" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Admin</Link>
          <ChevronRight size={12} />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">Analytics</span>
        </div>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <BarChart3 size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">System Analytics</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Real-time resource utilization, token quotas, and message metrics.</p>
          </div>
        </div>

        {error && (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-red-900/40 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3 text-xs">
            <AlertCircle size={16} />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Users</span>
              <Users size={16} className="text-zinc-400" />
            </div>
            {loading ? (
              <div className="h-6 w-16 bg-zinc-250 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              <h3 className="text-xl font-bold">{data?.users || 0}</h3>
            )}
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Registered platform accounts</p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Conversations</span>
              <MessageSquare size={16} className="text-zinc-400" />
            </div>
            {loading ? (
              <div className="h-6 w-16 bg-zinc-250 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              <h3 className="text-xl font-bold">{data?.total_conversations || 0}</h3>
            )}
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Active assistant chat rooms</p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Messages</span>
              <Activity size={16} className="text-zinc-450" />
            </div>
            {loading ? (
              <div className="h-6 w-16 bg-zinc-250 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              <h3 className="text-xl font-bold">{data?.total_messages || 0}</h3>
            )}
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Queries and assistant answers</p>
          </div>
        </div>

        {/* User Usage breakdown */}
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 px-1">User Resource Usage</h2>
        
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-[1.5fr_1fr_1fr_2.5fr] gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">User</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-center">Chats</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-center">Messages</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Token Quota Utilization</span>
          </div>

          {/* Skeletons */}
          {loading && !error && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/20">
              {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && (!data || !data.per_user || data.per_user.length === 0) && (
            <div className="px-5 py-12 flex flex-col items-center gap-2 text-center bg-white dark:bg-zinc-900/20">
              <BarChart3 size={24} className="text-zinc-400 mb-2" />
              <p className="text-sm font-semibold">No usage statistics available</p>
            </div>
          )}

          {/* User Rows */}
          {!loading && !error && data && data.per_user && data.per_user.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900/20">
              {data.per_user.map((userStats, idx) => {
                const totalQuota = userStats.token_quota || 100000;
                const used = userStats.tokens_used || 0;
                const percentage = Math.min(100, Math.round((used * 100) / totalQuota));
                
                return (
                  <div key={userStats.user_id || idx} className="px-5 py-4 grid grid-cols-[1.5fr_1fr_1fr_2.5fr] gap-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* User profile info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                        {userStats.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{userStats.username}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">ID: {userStats.user_id}</p>
                      </div>
                    </div>

                    {/* Chats */}
                    <div className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {userStats.conversations}
                    </div>

                    {/* Messages */}
                    <div className="text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {userStats.messages}
                    </div>

                    {/* Token Quota Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {used.toLocaleString()} / {totalQuota.toLocaleString()} ({percentage}%)
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {userStats.tokens_remaining.toLocaleString()} left
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${getUsageColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
