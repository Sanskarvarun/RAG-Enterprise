import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import { FileText, MessageSquare, ChevronRight } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center transition-colors">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-200 dark:border-zinc-800 border-t-indigo-500"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

const DashboardPlaceholder = () => {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-5xl w-full mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Enterprise Portal
          </h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">
            Welcome back, <span className="font-semibold text-zinc-700 dark:text-zinc-300">{user ? user.full_name || user.username : 'User'}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/documents" className="p-6 rounded-xl border flex flex-col justify-between min-h-[190px]
            bg-zinc-50 dark:bg-zinc-900/50
            border-zinc-200 dark:border-zinc-800
            hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80
            hover:border-zinc-300 dark:hover:border-sky-500/40
            transition-all group">
            <div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4
                bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <FileText size={17} />
              </div>
              <h2 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">Knowledge Base</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">Upload and configure document context database.</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-500 dark:text-sky-400 opacity-70 group-hover:opacity-100 transition-opacity">
              Configure <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          
          <Link to="/chat" className="p-6 rounded-xl border flex flex-col justify-between min-h-[190px]
            bg-zinc-50 dark:bg-zinc-900/50
            border-zinc-200 dark:border-zinc-800
            hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80
            hover:border-zinc-300 dark:hover:border-violet-500/40
            transition-all group">
            <div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4
                bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <MessageSquare size={17} />
              </div>
              <h2 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">Assistant Chat</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">Query your local database using RAG AI chat room.</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-violet-500 dark:text-violet-400 opacity-70 group-hover:opacity-100 transition-opacity">
              Open Chat <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          
          <Link to="/admin" className="p-6 rounded-xl border flex flex-col justify-between min-h-[190px]
            bg-zinc-50 dark:bg-zinc-900/50
            border-zinc-200 dark:border-zinc-800
            hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80
            hover:border-zinc-300 dark:hover:border-indigo-500/40
            transition-all group">
            <div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4
                bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/></svg>
              </div>
              <h2 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">Console Panel</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">Platform administration and analytics overview.</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 opacity-70 group-hover:opacity-100 transition-opacity">
              Console <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
