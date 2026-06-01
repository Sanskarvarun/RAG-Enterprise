import React, { useState } from 'react'
import { forgotPassword } from '../api/auth'
import { Link } from 'react-router-dom'

export default function ForgotPassword(){
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try{
      const res = await forgotPassword({ email: email || undefined, username: username || undefined })
      setMessage(res.message || 'If the account exists, a reset link has been sent.')
      // show token in development if returned
      if(res.reset_token){
        setMessage(prev => prev + `\nReset token (dev): ${res.reset_token}`)
      }
    }catch(err){
      setError(err.response?.data?.detail || 'Failed to request password reset')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
        <p className="text-slate-400 text-sm mb-4">Enter your email or username to receive a password reset link.</p>

        {message && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded mb-4 whitespace-pre-wrap">{message}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email (optional)" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white" />
          <div className="text-center text-slate-400">Or</div>
          <input type="text" placeholder="Username (optional)" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white" />

          <button disabled={loading} className="w-full py-3 bg-primary-600 rounded text-white">{loading? 'Sending...' : 'Send reset link'}</button>
        </form>

        <div className="mt-4 text-slate-400 text-sm">
          <Link to="/login" className="text-primary-400 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
