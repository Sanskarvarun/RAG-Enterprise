import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 font-sans antialiased text-zinc-100">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-zinc-100 mb-1">Welcome Back</h1>
            <p className="text-zinc-500 text-xs">Enterprise AI Assistant Portal</p>
          </div>
          
          {error && (
            <div className="bg-zinc-950 border border-red-900/40 text-red-400 p-4 rounded-xl mb-6 text-xs font-semibold">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-650">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-650">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Sign In
            </button>
          </form>

          <div className="mt-3 text-right">
            <Link to="/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Forgot password?</Link>
          </div>
          
          <div className="mt-8 text-center border-t border-zinc-850 pt-6">
            <p className="text-zinc-550 text-xs">
              Don't have an account?{' '}
              <Link to="/register" className="text-zinc-300 hover:text-zinc-100 font-bold transition-colors">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
