import React, { useState, useEffect } from 'react'
import { resetPassword, getPasswordPolicy } from '../api/auth'
import { useNavigate, useLocation, Link } from 'react-router-dom'

function useQuery(){
  return new URLSearchParams(useLocation().search)
}

export default function ResetPassword(){
  const navigate = useNavigate()
  const query = useQuery()
  const tokenFromQuery = query.get('token') || ''

  const [token, setToken] = useState(tokenFromQuery)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [policy, setPolicy] = useState(null)

  useEffect(()=>{
    const fetchPolicy = async ()=>{
      try{
        const p = await getPasswordPolicy()
        setPolicy(p)
      }catch(e){ }
    }
    fetchPolicy()
  },[])

  const validate = ()=>{
    if(password !== confirm) return 'Passwords do not match'
    if(policy){
      if(password.length < policy.min_length) return policy.message
      if(policy.require_uppercase && !/[A-Z]/.test(password)) return policy.message
      if(policy.require_lowercase && !/[a-z]/.test(password)) return policy.message
      if(policy.require_digits && !/\d/.test(password)) return policy.message
      if(policy.require_special && !/[^A-Za-z0-9]/.test(password)) return policy.message
    }
    return null
  }

  const handleSubmit = async (e)=>{
    e.preventDefault()
    setError(null)
    setMessage(null)
    const v = validate()
    if(v){ setError(v); return }
    setLoading(true)
    try{
      const res = await resetPassword(token, password)
      setMessage(res.message || 'Password reset successful')
      setTimeout(()=> navigate('/login'), 2000)
    }catch(err){
      setError(err.response?.data?.detail || 'Failed to reset password')
    }finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-slate-400 text-sm mb-4">Enter a new password for your account.</p>

        {message && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded mb-4">{message}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Reset token (auto-filled from URL)" value={token} onChange={e=>setToken(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white" />
          <input type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white" />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white" />

          <button disabled={loading} className="w-full py-3 bg-primary-600 rounded text-white">{loading? 'Resetting...' : 'Reset password'}</button>
        </form>

        <div className="mt-4 text-slate-400 text-sm">
          <Link to="/login" className="text-primary-400 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
