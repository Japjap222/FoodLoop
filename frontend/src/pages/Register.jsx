import React, { useState } from 'react';
import { registerUser } from '../services/api';

export const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Recipient');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await registerUser({ name, email, password, role, organization });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onRegisterSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
        <p className="text-sm text-gray-500 mt-1">Join FoodLoop as a Donor, Recipient, or Partner</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
            <select
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Recipient">Recipient</option>
              <option value="Donor">Donor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Organization</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Campus Bakery"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-full transition shadow-sm"
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-brand-600 font-semibold hover:underline"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};