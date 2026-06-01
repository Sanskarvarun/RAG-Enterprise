import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminDocuments(){
  const [docs, setDocs] = useState([])

  useEffect(()=>{
    const fetchDocs = async ()=>{
      try{
        const token = localStorage.getItem('token')
        const res = await axios.get('/admin/documents', { headers: { Authorization: `Bearer ${token}` } })
        setDocs(res.data)
      }catch(e){
        console.error(e)
      }
    }
    fetchDocs()
  },[])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Documents</h1>
        <div className="bg-slate-800 rounded-lg p-4">
          {docs.length===0 && <div className="text-slate-400">No documents found</div>}
          {docs.map(d=> (
            <div key={d.id} className="border-b border-slate-700/30 py-3 flex justify-between">
              <div>
                <div className="font-medium">{d.filename}</div>
                <div className="text-slate-400 text-sm">{d.file_type} · {d.status}</div>
              </div>
              <div className="text-slate-400">Owner: {d.owner_id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
