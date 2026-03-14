import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Eye, EyeOff, Mail, Lock, KeyRound, Smartphone } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('password'); // 'password' | 'otp' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const handlePasswordLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || (err.code === 'ERR_NETWORK' ? 'Cannot connect to server. Make sure the backend is running.' : 'Login failed'));
    } finally { setLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/request-otp', { email });
      setOtpSent(true);
      setSuccess('OTP sent! Check the backend console for the code.');
      if (res.data.otp_dev) setDevOtp(res.data.otp_dev);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login-otp', { email, otp });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP login failed');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPass });
      setSuccess('Password reset! You can now login.');
      setMode('password'); setOtpSent(false); setOtp(''); setNewPass('');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl mb-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h1 className="text-3xl font-bold text-white">CoreInventory</h1>
          <p className="text-blue-200 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-7">
          {/* Mode Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button onClick={() => { setMode('password'); setError(''); setSuccess(''); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'password' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <Lock size={14} /> Password
            </button>
            <button onClick={() => { setMode('otp'); setError(''); setSuccess(''); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'otp' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <Smartphone size={14} /> OTP Login
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm mb-4">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2.5 rounded-xl text-sm mb-4">{success}</div>}
          {devOtp && <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-2.5 rounded-xl text-sm mb-4 font-mono">🔑 Dev OTP: <strong>{devOtp}</strong></div>}

          {/* PASSWORD LOGIN */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@coreinventory.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setOtpSent(false); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium">Forgot Password?</button>
              </div>
            </form>
          )}

          {/* OTP LOGIN */}
          {mode === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              {!otpSent ? (
                <button onClick={handleRequestOtp} disabled={loading || !email}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
                  {loading ? 'Sending OTP...' : '📧 Send OTP to Email'}
                </button>
              ) : (
                <form onSubmit={handleOtpLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required placeholder="6-digit code" maxLength={6}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-[0.5em] font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || otp.length < 6}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all">
                    {loading ? 'Verifying...' : '✅ Verify & Login'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setDevOtp(''); }} className="w-full text-sm text-gray-500 hover:text-gray-700">Resend OTP</button>
                </form>
              )}
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {!otpSent ? (
                <button onClick={handleRequestOtp} disabled={loading || !email}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-all">
                  {loading ? 'Sending...' : 'Send Reset OTP'}
                </button>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required placeholder="6-digit code" maxLength={6}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-[0.5em] font-mono text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="••••••"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-all">
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              )}
              <button type="button" onClick={() => { setMode('password'); setOtpSent(false); setError(''); setSuccess(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700">← Back to Login</button>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account? <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
