import React, { useEffect, useState } from 'react';
import { fetchMyAppeals, submitAppeal } from '../services/api';

export const MyAppeals = ({ user }) => {
  const [appeals, setAppeals] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const restricted =
    user?.accountActive === false || user?.isArchived === true;

  const loadAppeals = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetchMyAppeals();
      setAppeals(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load your appeals.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, []);

  const pendingAppeal = appeals.some(
    (appeal) => appeal.status === 'Pending'
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('Please explain why your account should be restored.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Send as object or string depending on service signature
      // { reason: trimmedReason } guarantees req.body.reason is defined in Express
      const payload = typeof submitAppeal === 'function' ? trimmedReason : { reason: trimmedReason };
      const response = await submitAppeal(payload);

      setSuccess(
        response.data?.message || 'Your appeal has been submitted.'
      );
      setReason('');

      await loadAppeals();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not submit your appeal.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (status) => {
    if (status === 'Approved') {
      return 'bg-emerald-100 text-emerald-800';
    }

    if (status === 'Rejected') {
      return 'bg-red-100 text-red-800';
    }

    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          Account Appeal
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Submit an appeal to the FoodLoop Admin and check its review status.
        </p>
      </header>

      <section
        className={`rounded-2xl border p-5 ${
          restricted
            ? 'border-amber-200 bg-amber-50'
            : 'border-blue-200 bg-blue-50'
        }`}
      >
        <h2 className="font-bold text-gray-900">
          {user?.isArchived
            ? 'Your account is archived'
            : restricted
              ? 'Your account is deactivated'
              : 'Account status'}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-700">
          {restricted
            ? 'You can still log in and submit an appeal. Restricted account actions, such as creating food listings or reserving food, remain unavailable until your account is restored.'
            : 'You can use this page to contact the Admin if you need an account decision reviewed.'}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}

      {!pendingAppeal && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold text-gray-900">
            Submit an Appeal
          </h2>

          <p className="text-sm leading-6 text-gray-500">
            Explain your situation and why you believe your account should
            be restored. The Admin will review your submission.
          </p>

          <label
            htmlFor="appeal-reason"
            className="block text-sm font-semibold text-gray-700"
          >
            Reason for appeal
          </label>

          <textarea
            id="appeal-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
            rows={6}
            required
            placeholder="Explain why you are appealing the account restriction..."
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          <p className="text-right text-xs text-gray-400">
            {reason.length}/2000 characters
          </p>

          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </form>
      )}

      {pendingAppeal && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You already have a pending appeal. Wait for the Admin to review it
          before submitting another one.
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">
          Your Appeal History
        </h2>

        {loading ? (
          <p className="rounded-2xl bg-white p-6 text-gray-500">
            Loading appeal history...
          </p>
        ) : appeals.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            You have not submitted any appeals yet.
          </p>
        ) : (
          appeals.map((appeal) => (
            <article
              key={appeal._id}
              className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                    appeal.status
                  )}`}
                >
                  {appeal.status}
                </span>

                <span className="text-xs text-gray-400">
                  {appeal.createdAt
                    ? new Date(appeal.createdAt).toLocaleString()
                    : ''}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Your reason
                </h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                  {appeal.reason}
                </p>
              </div>

              {appeal.adminResponse && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Admin response
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    {appeal.adminResponse}
                  </p>
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default MyAppeals;
