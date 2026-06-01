import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, CheckCircle, Clock, AlertCircle, 
  Trash2, Loader2, Database, ShieldAlert, ArrowLeft,
  FileCode, FileSpreadsheet, HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const DocumentPage = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const { token } = useAuth();

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 4000); // Poll for status updates
    return () => clearInterval(interval);
  }, []);

  const handleFileSubmit = async (file) => {
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('File is too large. Maximum size allowed is 25MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    handleFileSubmit(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSubmit(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will permanently remove its knowledge from the AI Assistant database.`)) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(prev => prev.filter(f => f.id !== docId));
      fetchDocuments();
    } catch (err) {
      setError('Failed to delete document. Please try again.');
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-red-400"><FileText size={24} /></div>;
    }
    if (ext === 'docx' || ext === 'doc') {
      return <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl text-blue-400"><FileText size={24} /></div>;
    }
    if (ext === 'csv' || ext === 'xlsx') {
      return <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-2xl text-green-400"><FileSpreadsheet size={24} /></div>;
    }
    return <div className="bg-slate-500/10 border border-slate-500/20 p-3 rounded-2xl text-slate-400"><FileCode size={24} /></div>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': 
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            Ready
          </span>
        );
      case 'processing': 
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold tracking-wide">
            <Loader2 className="animate-spin" size={12} />
            Learning
          </span>
        );
      case 'error': 
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-semibold tracking-wide">
            <ShieldAlert size={12} />
            Failed
          </span>
        );
      default: 
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-slate-400 text-xs font-semibold tracking-wide">
            <Clock size={12} />
            Queued
          </span>
        );
    }
  };

  // Stats calculations
  const totalDocsCount = files.length;
  const learningDocsCount = files.filter(f => f.status === 'processing' || f.status === 'pending').length;
  const readyDocsCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
        
        {/* Header Breadcrumb */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
              Knowledge Base
            </h1>
            <p className="text-slate-400 text-base">
              Upload and manage documentation to train your AI model context.
            </p>
          </div>
          
          <label className={`cursor-pointer inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary-500/10 hover:scale-[1.02] active:scale-[0.98] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {isUploading ? 'Learning File...' : 'Upload Document'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.docx,.doc,.txt,.csv" />
          </label>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-colors">
            <div className="bg-primary-500/10 p-3.5 rounded-xl text-primary-400">
              <HardDrive size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl font-bold">{totalDocsCount}</h3>
            </div>
          </div>
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-colors">
            <div className="bg-blue-500/10 p-3.5 rounded-xl text-blue-400">
              <Database size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ready Chunks</p>
              <h3 className="text-2xl font-bold">{readyDocsCount} <span className="text-xs font-normal text-slate-500">processed</span></h3>
            </div>
          </div>
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition-colors">
            <div className={`p-3.5 rounded-xl ${learningDocsCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>
              <Clock size={22} className={learningDocsCount > 0 ? 'animate-pulse' : ''} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Learning Syncing</p>
              <h3 className="text-2xl font-bold">{learningDocsCount} <span className="text-xs font-normal text-slate-500">active</span></h3>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-sm animate-in fade-in duration-300">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-10 text-center mb-10 transition-all ${
            dragActive 
              ? 'border-primary-500 bg-primary-500/5' 
              : 'border-slate-800 hover:border-slate-700/80 bg-slate-900/10'
          }`}
        >
          <div className="max-w-sm mx-auto flex flex-col items-center">
            <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-md text-slate-400 group-hover:scale-105 transition-transform">
              <Upload size={24} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">Drag and drop file here</h3>
            <p className="text-sm text-slate-500 mb-6">Supports PDF, DOCX, TXT, or CSV (Max 25MB)</p>
            <label className="cursor-pointer text-xs font-bold text-primary-400 hover:text-primary-300 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-lg transition-all hover:bg-slate-800/80">
              Browse Files
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.docx,.doc,.txt,.csv" />
            </label>
          </div>
        </div>

        {/* Files List Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Uploaded Documents</h2>
          <span className="text-xs text-slate-500">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
        </div>

        {/* Document List */}
        <div className="space-y-3.5">
          {files.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/10 border border-slate-800 rounded-3xl">
              <FileText className="mx-auto text-slate-700 mb-4" size={44} />
              <p className="text-slate-500 text-sm">No files uploaded. Put your documents above to start.</p>
            </div>
          ) : (
            files.map((file) => (
              <div 
                key={file.id} 
                className="bg-slate-900/40 backdrop-blur-md border border-slate-850 hover:border-slate-800/80 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/60 transition-all shadow-md group"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  {getFileIcon(file.filename)}
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 truncate text-base hover:text-white transition-colors">
                      {file.filename}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
                      <span className="font-medium uppercase">{file.file_type}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-5">
                  {getStatusBadge(file.status)}
                  <button 
                    onClick={() => handleDelete(file.id, file.filename)}
                    className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 p-2 rounded-xl transition-all shadow-sm"
                    title="Delete document"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;
