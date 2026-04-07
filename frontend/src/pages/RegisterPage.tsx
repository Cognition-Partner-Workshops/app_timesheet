import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { register } from '../api';
import { useAuthStore } from '../store/authStore';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register(email, password, username);
      setAuth(res.data.user, res.data.token);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#fc3c44] to-[#e8384f] rounded-2xl flex items-center justify-center shadow-lg">
              <Music className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] mb-1">Apple Music</h1>
          <p className="text-[#86868b]">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-6 shadow-sm border border-[#e8e8ed]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="w-full bg-[#f5f5f7] text-[#1d1d1f] px-4 py-3 rounded-xl outline-none border border-[#d2d2d7] focus:border-[#fc3c44] focus:ring-2 focus:ring-[#fc3c44]/20 placeholder-[#86868b]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#f5f5f7] text-[#1d1d1f] px-4 py-3 rounded-xl outline-none border border-[#d2d2d7] focus:border-[#fc3c44] focus:ring-2 focus:ring-[#fc3c44]/20 placeholder-[#86868b]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full bg-[#f5f5f7] text-[#1d1d1f] px-4 py-3 rounded-xl outline-none border border-[#d2d2d7] focus:border-[#fc3c44] focus:ring-2 focus:ring-[#fc3c44]/20 placeholder-[#86868b]"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#fc3c44] text-white font-semibold py-3 rounded-full hover:bg-[#e8384f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="text-center">
            <span className="text-[#86868b] text-sm">Already have an account? </span>
            <Link to="/login" className="text-[#fc3c44] text-sm font-semibold hover:underline">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
