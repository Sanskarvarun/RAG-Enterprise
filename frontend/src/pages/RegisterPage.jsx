import React, { useState } from 'react';
import { register, getPasswordPolicy } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Loader2, UserPlus } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [policy, setPolicy] = useState(null)
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    if(policy){
      const pw = formData.password;
      if(pw.length < policy.min_length || (policy.require_uppercase && !/[A-Z]/.test(pw)) || (policy.require_lowercase && !/[a-z]/.test(pw)) || (policy.require_digits && !/\d/.test(pw)) || (policy.require_special && !/[^A-Za-z0-9]/.test(pw))){
        setError(policy.message);
        setIsLoading(false);
        return;
      }
    }
    try {
      await register(formData);
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(()=>{
    const fetchPolicy = async ()=>{
      try{ const p = await getPasswordPolicy(); setPolicy(p) }catch(e){}
    };
    fetchPolicy();
  },[]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 font-sans antialiased text-zinc-100">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-zinc-100 mb-1">Create Account</h1>
            <p className="text-zinc-500 text-xs">Join the Enterprise AI platform</p>
          </div>
          
          {error && (
            <div className="bg-zinc-950 border border-red-900/40 text-red-400 p-4 rounded-xl mb-6 text-xs font-semibold">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-655">
                  <UserPlus size={16} />
                </div>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-655">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="johndoe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-655">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-655">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-700 focus:outline-none text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              {policy && (
                <div className="text-zinc-500 text-[11px] mt-1.5 leading-relaxed">{policy.message}</div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Register
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-zinc-850 pt-6">
            <p className="text-zinc-550 text-xs">
              Already have an account?{' '}
              <Link to="/login" className="text-zinc-300 hover:text-zinc-100 font-bold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
