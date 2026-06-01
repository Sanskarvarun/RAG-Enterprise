import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DocumentPage = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/documents/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000); // Poll for status updates
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setError('');

    try {
      await axios.post('http://127.0.0.1:8000/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      fetchDocuments();
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-400" size={18} />;
      case 'processing': return <Loader2 className="text-primary-400 animate-spin" size={18} />;
      case 'error': return <AlertCircle className="text-red-400" size={18} />;
      default: return <Clock className="text-slate-400" size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
            <p className="text-slate-400">Upload documents to train your assistant</p>
          </div>
          
          <label className="cursor-pointer bg-primary-600 hover:bg-primary-500 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2">
            <Upload size={20} />
            {isUploading ? 'Uploading...' : 'Upload Document'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {files.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
              <FileText className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-500">No documents uploaded yet.</p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 rounded-2xl flex items-center justify-between hover:border-slate-600 transition-all">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-700 p-3 rounded-xl">
                    <FileText size={24} className="text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{file.filename}</h3>
                    <p className="text-slate-500 text-sm">{file.file_type.toUpperCase()} • {new Date(file.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-full border border-slate-700">
                    {getStatusIcon(file.status)}
                    <span className="text-sm font-medium capitalize">{file.status}</span>
                  </div>
                  <button className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={20} />
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
