import React from 'react'
import { Link } from 'react-router-dom'

export default function Header(){
  return (
    <header className="bg-slate-800/60 border-b border-slate-700/30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-white font-bold">Enterprise AI Assistant</div>
        <nav className="flex gap-4">
          <Link to="/" className="text-slate-300 hover:text-white">Home</Link>
          <Link to="/chat" className="text-slate-300 hover:text-white">Chat</Link>
          <Link to="/documents" className="text-slate-300 hover:text-white">Documents</Link>
          <Link to="/admin" className="text-slate-300 hover:text-white">Admin</Link>
        </nav>
      </div>
    </header>
  )
}
