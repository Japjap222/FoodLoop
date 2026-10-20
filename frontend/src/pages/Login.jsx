import React, { useState } from 'react';
import { loginUser } from '../services/api';

export const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to your FoodLoop account</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email address</label>
          <input
            type="email"
            required
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-full transition shadow-sm"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Don't have an account?{' '}
        <button
          onClick={onSwitchToRegister}
          className="text-brand-600 font-semibold hover:underline"
        >
          Create account
        </button>
      </div>
    </div>
  );
};