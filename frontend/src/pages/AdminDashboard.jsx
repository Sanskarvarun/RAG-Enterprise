import React from 'react'
import { Link } from 'react-router-dom'

export default function AdminDashboard(){
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/admin/users" className="p-6 bg-slate-800 rounded-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-slate-400">Manage users and roles</p>
          </Link>

          <Link to="/admin/documents" className="p-6 bg-slate-800 rounded-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="text-slate-400">View uploaded documents</p>
          </Link>

          <Link to="/admin/analytics" className="p-6 bg-slate-800 rounded-xl border border-slate-700/50">
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="text-slate-400">System usage and metrics</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
