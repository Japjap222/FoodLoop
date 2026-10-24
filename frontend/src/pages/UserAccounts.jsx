
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAllAccounts,
  deactivateProvider,
  reactivateProvider,
  archiveProvider,
  restoreProvider,
} from '../services/api';

const FILTERS = [
  { value: 'All', label: 'All Accounts' },
  { value: 'Donor', label: 'Donors' },
  { value: 'Recipient', label: 'Recipients' },
  { value: 'Deactivated', label: 'Deactivated' },
  { value: 'Archived', label: 'Archived' },
];

const getAccountStatus = (account) => {
  if (account.isArchived) return 'Archived';
  if (account.accountActive === false) return 'Deactivated';
  return 'Active';
};

const formatDate = (date) => {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString();
};

export const UserAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchAllAccounts();
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Could not load user accounts:', err);
      setError(
        err.response?.data?.message ||
          'Could not load user accounts. Make sure you are logged in as an Admin.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const counts = useMemo(() => ({
    All: accounts.length,
    Donor: accounts.filter((account) => account.role === 'Donor').length,
    Recipient: accounts.filter((account) => account.role === 'Recipient').length,
    Deactivated: accounts.filter(
      (account) => getAccountStatus(account) === 'Deactivated'
    ).length,
    Archived: accounts.filter(
      (account) => getAccountStatus(account) === 'Archived'
    ).length,
  }), [accounts]);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const status = getAccountStatus(account);

      const matchesFilter =
        filter === 'All' ||
        filter === account.role ||
        filter === status;

      const matchesSearch =
        !normalizedSearch ||
        [account.name, account.email, account.organization, account.role]
          .some((value) =>
            String(value || '').toLowerCase().includes(normalizedSearch)
          );

      return matchesFilter && matchesSearch;
    });
  }, [accounts, filter, search]);

  const performAction = async (account, action) => {
    const actionDetails = {
      deactivate: {
        label: 'deactivate',
        request: deactivateProvider,
        confirmation: `Deactivate ${account.name}'s account? They will still be able to log in and submit an appeal, but restricted actions will be blocked.`,
      },
      reactivate: {
        label: 'reactivate',
        request: reactivateProvider,
        confirmation: `Reactivate ${account.name}'s account?`,
      },
      archive: {
        label: 'archive',
        request: archiveProvider,
        confirmation: `Archive ${account.name}'s account? Account history will be preserved, and the account will be restricted.`,
      },
      restore: {
        label: 'restore',
        request: restoreProvider,
        confirmation: `Restore ${account.name}'s account from the archive? It will remain deactivated until you reactivate it.`,
      },
    };

    const selectedAction = actionDetails[action];

    if (!selectedAction || busyId) return;

    if (!window.confirm(selectedAction.confirmation)) return;

    setBusyId(String(account._id || account.id));
    setError('');
    setNotice('');

    try {
      const id = account._id || account.id;
      const response = await selectedAction.request(id);

      setNotice(
        response.data?.message ||
          `Account ${selectedAction.label}d successfully.`
      );

      await loadAccounts();
    } catch (err) {
      console.error(`Could not ${action} account:`, err);

      setError(
        err.response?.data?.message ||
          `Could not ${action} this account. Please try again.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const renderActions = (account) => {
    const status = getAccountStatus(account);
    const id = String(account._id || account.id);
    const isBusy = busyId === id;

    return (
      <div className="flex flex-wrap gap-2">
        {status === 'Active' && (
          <>
            <button
              type="button"
              onClick={() => performAction(account, 'deactivate')}
              disabled={Boolean(busyId)}
              className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              {isBusy ? 'Processing...' : 'Deactivate'}
            </button>

            <button
              type="button"
              onClick={() => performAction(account, 'archive')}
              disabled={Boolean(busyId)}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Archive
            </button>
          </>
        )}

        {status === 'Deactivated' && (
          <>
            <button
              type="button"
              onClick={() => performAction(account, 'reactivate')}
              disabled={Boolean(busyId)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isBusy ? 'Processing...' : 'Reactivate'}
            </button>

            <button
              type="button"
              onClick={() => performAction(account, 'archive')}
              disabled={Boolean(busyId)}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Archive
            </button>
          </>
        )}

        {status === 'Archived' && (
          <button
            type="button"
            onClick={() => performAction(account, 'restore')}
            disabled={Boolean(busyId)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isBusy ? 'Processing...' : 'Restore'}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Accounts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage Donor and Recipient accounts while preserving their food
          listings, reservations, and account history.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-xl border p-4 text-left transition ${
              filter === item.value
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-sm text-gray-600">{item.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {counts[item.value]}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or organization..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
        />

        <button
          type="button"
          onClick={loadAccounts}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-gray-500">
            Loading user accounts...
          </p>
        ) : filteredAccounts.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            No accounts match your search or selected filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date Joined</th>
                  <th className="px-4 py-3 font-semibold">Account Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.map((account) => {
                  const status = getAccountStatus(account);

                  return (
                    <tr key={account._id || account.id}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          {account.name}
                        </div>
                        <div className="mt-1 text-gray-500">
                          {account.email}
                        </div>
                        {account.organization && (
                          <div className="mt-1 text-xs text-gray-500">
                            {account.organization}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            account.role === 'Donor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {account.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'Archived'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(account.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        {renderActions(account)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Account actions never permanently delete users. Archived accounts
        remain in the database, and restoring an archived account does not
        automatically reactivate it.
      </p>
    </section>
  );
};

export default UserAccounts;
