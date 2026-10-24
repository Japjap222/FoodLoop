
import React, { useState } from 'react';
import {
  registerUser,
  verifyEmailOtp,
  resendEmailOtp,
} from '../services/api';

export const Register = ({ onRegisterSuccess, onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Recipient');
  const [organization, setOrganization] = useState('');

  const [otp, setOtp] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        organization: organization.trim(),
      });

      setVerificationStep(true);
      setMessage(
        'We sent a verification code to your email. Check your inbox and spam folder.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit code sent to your email.');
      return;
    }

    try {
      setLoading(true);

      const response = await verifyEmailOtp({
        email: email.trim().toLowerCase(),
        otp,
      });

      const data = response.data;

      if (!data.token || !data.user) {
        setError('Verification succeeded, but login information was not returned.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onRegisterSuccess(data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Email verification failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');

    try {
      setResending(true);

      const response = await resendEmailOtp({
        email: email.trim().toLowerCase(),
      });

      setMessage(
        response.data?.message ||
          'If your account needs verification, a new code will be sent.'
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not resend the code. Please try again later.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-green-700">
          FoodLoop
        </h1>

        <h2 className="mb-2 text-center text-xl font-semibold text-gray-800">
          {verificationStep ? 'Verify your email' : 'Create an account'}
        </h2>

        <p className="mb-6 text-center text-sm text-gray-600">
          {verificationStep
            ? `Enter the six-digit code sent to ${email}.`
            : 'Join FoodLoop and help reduce food waste.'}
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {!verificationStep ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-1 block text-sm font-medium">
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-1 block text-sm font-medium">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium">
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                placeholder="Enter your password again"
              />
            </div>

            <div>
              <label htmlFor="register-role" className="mb-1 block text-sm font-medium">
                Account type
              </label>
              <select
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
              >
                <option value="Recipient">Recipient</option>
                <option value="Donor">Donor</option>
              </select>
            </div>

            <div>
              <label htmlFor="register-organization" className="mb-1 block text-sm font-medium">
                Organization (optional)
              </label>
              <input
                id="register-organization"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                maxLength={150}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                placeholder="Organization or business name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="register-otp" className="mb-1 block text-sm font-medium">
                Six-digit verification code
              </label>
              <input
                id="register-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
                pattern="[0-9]{6}"
                maxLength={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-green-600"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify email'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading}
              className="w-full rounded-lg border border-green-700 px-4 py-3 font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Sending code...' : 'Resend verification code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerificationStep(false);
                setOtp('');
                setError('');
                setMessage('');
              }}
              className="w-full text-sm text-gray-600 hover:underline"
            >
              Back to registration
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate?.('login')}
            className="font-semibold text-green-700 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
