import React, { useCallback, useEffect, useState } from 'react';
import { fetchAllAppeals, reviewAppeal } from '../services/api';

export const Appeals = () => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [responses, setResponses] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAppeals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetchAllAppeals();
      setAppeals(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load appeals.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  const handleReview = async (appeal, status) => {
    const userName = appeal.user?.name || appeal.user?.organization || 'this user';

    if (
      !window.confirm(
        `${status} the appeal from ${userName}?\n\n${
          status === 'Approved'
            ? 'Their account will be restored.'
            : 'Their current account restrictions will remain.'
        }`
      )
    ) {
      return;
    }

    try {
      setProcessingId(appeal._id);
      setError('');
      setSuccess('');

      // Pass an object containing both status and adminResponse
      const response = await reviewAppeal(appeal._id, {
        status,
        adminResponse: responses[appeal._id] || '',
      });

      setSuccess(
        response.data?.message || `Appeal ${status.toLowerCase()}.`
      );

      await loadAppeals();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not review this appeal.'
      );
    } finally {
      setProcessingId('');
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

  const pendingCount = appeals.filter(
    (appeal) => appeal.status === 'Pending'
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Account Appeals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review account appeals submitted by Donors and Recipients.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAppeals}
          disabled={loading || Boolean(processingId)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">
          Pending appeals
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-900">
          {pendingCount}
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

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-400">
          Loading appeals...
        </div>
      ) : appeals.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-500">
          No appeals have been submitted yet.
        </div>
      ) : (
        <div className="space-y-5">
          {appeals.map((appeal) => {
            const account = appeal.user;
            const pending = appeal.status === 'Pending';
            const busy = processingId === appeal._id;

            return (
              <article
                key={appeal._id}
                className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {account?.organization || account?.name || 'Unknown user'}
                    </h2>
                    <p className="mt-1 break-words text-sm text-gray-500">
                      {account?.email || 'No email available'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Role: {account?.role || 'Unknown'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                      appeal.status
                    )}`}
                  >
                    {appeal.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Account status
                    </p>
                    <p className="mt-1 font-semibold text-gray-800">
                      {account?.isArchived
                        ? 'Archived'
                        : account?.accountActive === false
                          ? 'Deactivated'
                          : 'Active'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Submitted
                    </p>
                    <p className="mt-1 font-semibold text-gray-800">
                      {appeal.createdAt
                        ? new Date(appeal.createdAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700">
                    Appeal reason
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    {appeal.reason}
                  </p>
                </div>

                {appeal.adminResponse && (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <h3 className="text-sm font-bold text-gray-700">
                      Previous Admin response
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                      {appeal.adminResponse}
                    </p>
                  </div>
                )}

                {pending && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <label
                      htmlFor={`response-${appeal._id}`}
                      className="block text-sm font-semibold text-gray-700"
                    >
                      Admin response (optional)
                    </label>

                    <textarea
                      id={`response-${appeal._id}`}
                      value={responses[appeal._id] || ''}
                      onChange={(event) =>
                        setResponses((previous) => ({
                          ...previous,
                          [appeal._id]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      rows={3}
                      placeholder="Explain the decision or any conditions..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleReview(appeal, 'Approved')}
                        disabled={Boolean(processingId)}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy ? 'Processing...' : 'Approve Appeal'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(appeal, 'Rejected')}
                        disabled={Boolean(processingId)}
                        className="flex-1 rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-800 hover:bg-red-200 disabled:opacity-50"
                      >
                        {busy ? 'Processing...' : 'Reject Appeal'}
                      </button>
                    </div>
                  </div>
                )}

                {!pending && appeal.reviewedAt && (
                  <p className="border-t border-gray-100 pt-4 text-xs text-gray-500">
                    Reviewed on {new Date(appeal.reviewedAt).toLocaleString()}
                    {appeal.reviewedBy?.name
                      ? ` by ${appeal.reviewedBy.name}`
                      : ''}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Appeals;
