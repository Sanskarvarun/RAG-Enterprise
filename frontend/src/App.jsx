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
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-blue-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            Logout
          </button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/documents" className="p-8 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:border-primary-500/50 hover:bg-slate-800 transition-all group">
            <div className="bg-primary-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-primary-500 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Knowledge Base</h2>
            <p className="text-slate-400">Upload and manage company documents for the AI to learn from.</p>
          </Link>
          
          <Link to="/chat" className="p-8 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800 transition-all group">
            <div className="bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
              <MessageSquare size={24} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Chat Assistant</h2>
            <p className="text-slate-400">Chat with your AI using the knowledge from your documents.</p>
          </Link>
          
          <Link to="/admin" className="p-8 bg-slate-800/50 rounded-3xl border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group">
            <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Admin</h2>
            <p className="text-slate-400">View users, documents, and analytics.</p>
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
