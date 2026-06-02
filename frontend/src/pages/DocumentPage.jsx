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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
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
    const interval = setInterval(fetchDocuments, 4500); // Poll for status updates
    return () => clearInterval(interval);
  }, []);

  const handleFileSubmit = async (file) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File is too large. Maximum size allowed is 25MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setError('');

    try {
      await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || progressEvent.lengthComputable ? progressEvent.total : file.size;
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percentCompleted);
        }
      });
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadingFileName('');
      setUploadProgress(0);
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
      return <div className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-lg text-zinc-400"><FileText size={20} /></div>;
    }
    if (ext === 'docx' || ext === 'doc') {
      return <div className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-lg text-zinc-400"><FileText size={20} /></div>;
    }
    if (ext === 'csv' || ext === 'xlsx') {
      return <div className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-lg text-zinc-400"><FileSpreadsheet size={20} /></div>;
    }
    return <div className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-lg text-zinc-400"><FileCode size={20} /></div>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': 
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-green-500"></span>
            Ready
          </span>
        );
      case 'processing': 
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">
            <Loader2 className="animate-spin text-zinc-500" size={10} />
            Syncing
          </span>
        );
      case 'error': 
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-red-400 text-[10px] font-semibold uppercase tracking-wider">
            <ShieldAlert size={10} />
            Failed
          </span>
        );
      default: 
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
            <Clock size={10} />
            Queued
          </span>
        );
    }
  };

  const totalDocsCount = files.length;
  const learningDocsCount = files.filter(f => f.status === 'processing' || f.status === 'pending').length;
  const readyDocsCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 font-sans antialiased">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>

        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-200">
              Knowledge Base
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              Upload documents to configure context knowledge for the chat assistant.
            </p>
          </div>
          
          <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded-lg text-xs font-semibold transition-all shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            {isUploading 
              ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing...') 
              : 'Upload Document'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.docx,.doc,.txt,.csv" />
          </label>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800/80 p-4.5 rounded-lg flex items-center gap-3">
            <div className="bg-zinc-850 p-2.5 rounded text-zinc-400">
              <HardDrive size={18} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Total Documents</p>
              <h3 className="text-lg font-bold text-zinc-200">{totalDocsCount}</h3>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800/80 p-4.5 rounded-lg flex items-center gap-3">
            <div className="bg-zinc-850 p-2.5 rounded text-zinc-400">
              <Database size={18} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Processed</p>
              <h3 className="text-lg font-bold text-zinc-200">{readyDocsCount} <span className="text-[10px] font-normal text-zinc-500">files</span></h3>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800/80 p-4.5 rounded-lg flex items-center gap-3">
            <div className="bg-zinc-850 p-2.5 rounded text-zinc-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Active Syncs</p>
              <h3 className="text-lg font-bold text-zinc-200">{learningDocsCount} <span className="text-[10px] font-normal text-zinc-500">running</span></h3>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-zinc-900 border border-red-900/50 text-red-400 p-3.5 rounded-lg mb-6 flex items-center gap-2.5 text-xs">
            <AlertCircle size={14} className="shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Drag & Drop Zone or Progress Bar */}
        {isUploading ? (
          <div className="border border-zinc-800 rounded-xl p-8 text-center mb-8 bg-zinc-900/10">
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-10 h-10 bg-zinc-850 border border-zinc-750 rounded-lg flex items-center justify-center mb-4 text-zinc-400">
                <Loader2 className="animate-spin text-zinc-500" size={18} />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-zinc-200 truncate max-w-full">
                {uploadingFileName}
              </h3>
              <p className="text-[10px] text-zinc-500 mb-4">
                {uploadProgress < 100 
                  ? `Uploading to server... ${uploadProgress}%` 
                  : 'File uploaded. Processing, extracting text & generating embeddings...'}
              </p>
              
              {/* Progress bar track */}
              <div className="w-full bg-zinc-950 border border-zinc-900 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${uploadProgress < 100 ? 'bg-zinc-500' : 'bg-green-600 animate-pulse'}`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-8 text-center mb-8 transition-colors ${
              dragActive 
                ? 'border-zinc-500 bg-zinc-900/50' 
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'
            }`}
          >
            <div className="max-w-xs mx-auto flex flex-col items-center">
              <div className="w-10 h-10 bg-zinc-850 border border-zinc-750 rounded-lg flex items-center justify-center mb-3 text-zinc-450">
                <Upload size={18} />
              </div>
              <h3 className="font-semibold text-sm mb-0.5">Drag and drop file here</h3>
              <p className="text-[10px] text-zinc-500 mb-4">Supports PDF, DOCX, TXT, or CSV (Max 25MB)</p>
              <label className="cursor-pointer text-[10px] font-bold text-zinc-300 hover:text-zinc-200 bg-zinc-850 border border-zinc-750 px-3.5 py-2 rounded transition-colors">
                Browse Files
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.docx,.doc,.txt,.csv" />
              </label>
            </div>
          </div>
        )}

        {/* Files List Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stored Files</h2>
          <span className="text-[10px] text-zinc-500">{files.length} documents</span>
        </div>

        {/* Document List */}
        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800 rounded-xl">
              <FileText className="mx-auto text-zinc-700 mb-2" size={32} />
              <p className="text-zinc-500 text-xs">No documents uploaded yet.</p>
            </div>
          ) : (
            files.map((file) => (
              <div 
                key={file.id} 
                className="bg-zinc-900/40 border border-zinc-850 p-3.5 rounded-lg flex items-center justify-between gap-4 hover:bg-zinc-900/70 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {getFileIcon(file.filename)}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-200 truncate text-sm">
                      {file.filename}
                    </h3>
                    <p className="text-zinc-500 text-[10px] mt-0.5 flex items-center gap-1.5">
                      <span className="font-medium uppercase">{file.file_type}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {getStatusBadge(file.status)}
                  <button 
                    onClick={() => handleDelete(file.id, file.filename)}
                    className="text-zinc-500 hover:text-zinc-300 border border-transparent p-1.5 rounded transition-colors"
                    title="Delete file"
                  >
                    <Trash2 size={15} />
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
