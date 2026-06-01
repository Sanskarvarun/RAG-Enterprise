import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DocumentPage from './pages/DocumentPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminDocuments from './pages/AdminDocuments';
import ErrorBoundary from './components/ErrorBoundary';
import './api/axiosSetup';
import Header from './components/Header';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { FileText, MessageSquare } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

const DashboardPlaceholder = () => {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 relative overflow-hidden flex items-center justify-center">
      {/* Background Glows */}
      <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-4xl w-full mx-auto relative z-10">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Enterprise Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Welcome back, <span className="font-semibold text-primary-400">{user ? user.full_name || user.username : 'User'}</span>
            </p>
          </div>
          <button 
            onClick={logout}
            className="px-4.5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/documents" className="p-8 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-850 hover:border-primary-500/30 hover:bg-slate-900/60 transition-all shadow-lg group flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="bg-primary-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-primary-400 group-hover:scale-105 transition-transform border border-primary-500/10">
                <FileText size={22} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-slate-100 group-hover:text-white transition-colors">Knowledge Base</h2>
              <p className="text-slate-400 text-xs leading-relaxed">Upload and train your AI with manuals, documentation, and lists.</p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary-400 opacity-80 group-hover:opacity-100 transition-opacity">
              Manage Documents <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          
          <Link to="/chat" className="p-8 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-850 hover:border-blue-500/30 hover:bg-slate-900/60 transition-all shadow-lg group flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-105 transition-transform border border-blue-500/10">
                <MessageSquare size={22} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-slate-100 group-hover:text-white transition-colors">Chat Assistant</h2>
              <p className="text-slate-400 text-xs leading-relaxed">Query your documentation context in an intuitive chat portal.</p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
              Open Chat Room <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          
          <Link to="/admin" className="p-8 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-850 hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all shadow-lg group flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-105 transition-transform border border-emerald-500/10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg>
              </div>
              <h2 className="text-xl font-bold mb-2 text-slate-100 group-hover:text-white transition-colors">Admin Panel</h2>
              <p className="text-slate-400 text-xs leading-relaxed">Review platform analytics, user lists, and server health.</p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
              View Analytics <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />
          <Route path="/reset-password" element={<ResetPassword/>} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ChatPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DocumentPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route path="/admin" element={<ProtectedRoute><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><ErrorBoundary><AdminUsers /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/documents" element={<ProtectedRoute><ErrorBoundary><AdminDocuments /></ErrorBoundary></ProtectedRoute>} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <ProtectedRoute>
                <AdminDocuments />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
