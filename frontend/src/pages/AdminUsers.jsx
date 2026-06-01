import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminUsers(){
  const [users, setUsers] = useState([])

  useEffect(()=>{
    const fetchUsers = async ()=>{
      try{
        const token = localStorage.getItem('token')
        const res = await axios.get('/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        setUsers(res.data)
      }catch(e){
        console.error(e)
      }
    }
    fetchUsers()
  },[])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Users</h1>
        <div className="bg-slate-800 rounded-lg p-4">
          {users.length===0 && <div className="text-slate-400">No users found</div>}
          {users.map(u=> (
            <div key={u.id} className="border-b border-slate-700/30 py-3 flex justify-between">
              <div>
                <div className="font-medium">{u.username}</div>
                <div className="text-slate-400 text-sm">{u.email}</div>
              </div>
              <div className="text-slate-400">{u.is_admin? 'Admin' : 'User'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
