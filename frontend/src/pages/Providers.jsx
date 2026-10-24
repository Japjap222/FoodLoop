
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchProviders,
  fetchListings,
  deactivateProvider,
  reactivateProvider,
  archiveProvider,
  restoreProvider,
} from '../services/api';

const ACCOUNT_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'deactivated', label: 'Deactivated' },
  { id: 'archived', label: 'Archived' },
];

export const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProviderData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [providersRes, listingsRes] = await Promise.all([
        fetchProviders(),
        fetchListings(),
      ]);

      setProviders(
        Array.isArray(providersRes.data) ? providersRes.data : []
      );

      setListings(
        Array.isArray(listingsRes.data) ? listingsRes.data : []
      );
    } catch (err) {
      console.error('Error loading provider accounts:', err);
      setError(
        err.response?.data?.message ||
          'Could not load provider accounts. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  const processedProviders = useMemo(() => {
    return providers
      .filter((provider) => {
        // The backend returns Donors only, but keep this guard as well.
        return (provider.role || '').toLowerCase() === 'donor';
      })
      .map((provider) => {
        const providerId = String(provider._id || provider.id || '');
        const organization = (provider.organization || '')
          .toLowerCase()
          .trim();
        const name = (provider.name || '').toLowerCase().trim();
        const email = (provider.email || '').toLowerCase().trim();

        const activeListings = listings.filter((item) => {
          if (!item || Number(item.quantity) <= 0) return false;

          const donorId = (
            typeof item.donor === 'object'
              ? item.donor?._id
              : item.donor
          )?.toString();

          if (donorId && providerId && donorId === providerId) {
            return true;
          }

          const providerName = (item.providerName || '')
            .toLowerCase()
            .trim();

          if (!providerName) return false;

          return Boolean(
            (organization &&
              (providerName.includes(organization) ||
                organization.includes(providerName))) ||
              (name &&
                (providerName.includes(name) ||
                  name.includes(providerName))) ||
              (email && providerName.includes(email))
          );
        });

        const isArchived = provider.isArchived === true;
        const accountEnabled =
          provider.accountActive !== false && !isArchived;

        return {
          ...provider,
          _id: providerId,
          activeListings,
          totalServings: activeListings.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0
          ),
          hasAvailableFood: activeListings.length > 0,
          accountEnabled,
          isArchived,
        };
      })
      .sort((a, b) =>
        (a.organization || a.name || '').localeCompare(
          b.organization || b.name || ''
        )
      );
  }, [providers, listings]);

  const activeProviders = processedProviders.filter(
    (provider) => provider.accountEnabled && !provider.isArchived
  );

  const deactivatedProviders = processedProviders.filter(
    (provider) => !provider.accountEnabled && !provider.isArchived
  );

  const archivedProviders = processedProviders.filter(
    (provider) => provider.isArchived
  );

  const displayedProviders =
    activeTab === 'active'
      ? activeProviders
      : activeTab === 'deactivated'
        ? deactivatedProviders
        : archivedProviders;

  const handleAccountAction = async (provider, action) => {
    if (actionLoading) return;

    const providerName =
      provider.organization || provider.name || 'this provider';

    const messages = {
      deactivate: {
        confirm: `Deactivate ${providerName}?\n\nThey can still log in and submit an appeal, but they cannot perform restricted account actions.`,
        success: `${providerName} has been deactivated.`,
        run: () => deactivateProvider(provider._id),
      },
      reactivate: {
        confirm: `Reactivate ${providerName}?\n\nTheir account restrictions will be lifted.`,
        success: `${providerName} has been reactivated.`,
        run: () => reactivateProvider(provider._id),
      },
      archive: {
        confirm: `Archive ${providerName}?\n\nTheir account will be restricted and moved to the Archived list. Existing listings and reservation history will be preserved.`,
        success: `${providerName} has been archived.`,
        run: () => archiveProvider(provider._id),
      },
      restore: {
        confirm: `Restore ${providerName} from the archive?\n\nThey will move to the Deactivated list and remain restricted until reactivated or an appeal is approved.`,
        success: `${providerName} has been restored to the Deactivated list.`,
        run: () => restoreProvider(provider._id),
      },
    };

    const selectedAction = messages[action];

    if (!selectedAction) return;
    if (!window.confirm(selectedAction.confirm)) return;

    const actionKey = `${provider._id}-${action}`;

    try {
      setActionLoading(actionKey);
      setError('');
      setSuccess('');

      await selectedAction.run();

      setSuccess(selectedAction.success);
      await loadProviderData();
    } catch (err) {
      console.error(`Provider ${action} failed:`, err);

      setError(
        err.response?.data?.message ||
          `Could not ${action} this provider. Please try again.`
      );
    } finally {
      setActionLoading('');
    }
  };

  const renderProviderCard = (provider) => {
    const busy = actionLoading.startsWith(`${provider._id}-`);

    return (
      <article
        key={provider._id}
        className="flex flex-col justify-between space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Donor
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                provider.isArchived
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : provider.accountEnabled
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                    : 'border-amber-200 bg-amber-100 text-amber-800'
              }`}
            >
              {provider.isArchived
                ? 'Archived'
                : provider.accountEnabled
                  ? 'Active'
                  : 'Deactivated'}
            </span>
          </div>

          <h3 className="break-words text-xl font-bold text-gray-900">
            {provider.organization || provider.name}
          </h3>

          <p className="mt-2 break-words text-sm text-gray-500">
            👤 Contact: {provider.name}
          </p>

          <p className="break-words text-sm text-gray-500">
            ✉️ {provider.email}
          </p>

          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              provider.hasAvailableFood
                ? 'bg-sky-100 text-sky-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {provider.hasAvailableFood
              ? 'Has Available Food'
              : 'No Available Food'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
          <div>
            <span className="text-xs text-gray-400">Account Role</span>
            <p className="font-bold text-gray-900">{provider.role}</p>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400">
              Available Inventory
            </span>
            <p className="font-bold text-gray-900">
              {provider.totalServings} units
            </p>
            <p className="text-xs text-gray-500">
              {provider.activeListings.length}{' '}
              {provider.activeListings.length === 1
                ? 'listing'
                : 'listings'}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Admin Account Controls
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {activeTab === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleAccountAction(provider, 'deactivate')
                  }
                  disabled={Boolean(actionLoading)}
                  className="flex-1 rounded-xl bg-amber-100 px-3 py-2 font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                >
                  {busy && actionLoading.endsWith('-deactivate')
                    ? 'Deactivating...'
                    : 'Deactivate'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAccountAction(provider, 'archive')
                  }
                  disabled={Boolean(actionLoading)}
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  {busy && actionLoading.endsWith('-archive')
                    ? 'Archiving...'
                    : 'Archive'}
                </button>
              </>
            )}

            {activeTab === 'deactivated' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleAccountAction(provider, 'reactivate')
                  }
                  disabled={Boolean(actionLoading)}
                  className="flex-1 rounded-xl bg-emerald-100 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                >
                  {busy && actionLoading.endsWith('-reactivate')
                    ? 'Reactivating...'
                    : 'Reactivate'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAccountAction(provider, 'archive')
                  }
                  disabled={Boolean(actionLoading)}
                  className="flex-1 rounded-xl bg-gray-100 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  {busy && actionLoading.endsWith('-archive')
                    ? 'Archiving...'
                    : 'Archive'}
                </button>
              </>
            )}

            {activeTab === 'archived' && (
              <button
                type="button"
                onClick={() =>
                  handleAccountAction(provider, 'restore')
                }
                disabled={Boolean(actionLoading)}
                className="flex-1 rounded-xl bg-sky-100 px-3 py-2 font-semibold text-sky-800 hover:bg-sky-200 disabled:opacity-50"
              >
                {busy && actionLoading.endsWith('-restore')
                  ? 'Restoring...'
                  : 'Restore'}
              </button>
            )}
          </div>

          {busy && (
            <p className="text-xs text-gray-500">
              Processing account action...
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Food Providers
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage donor accounts while preserving food listings and
            reservation history.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProviderData}
          disabled={loading || Boolean(actionLoading)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACCOUNT_TABS.map((tab) => {
          const count =
            tab.id === 'active'
              ? activeProviders.length
              : tab.id === 'deactivated'
                ? deactivatedProviders.length
                : archivedProviders.length;

          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-semibold text-gray-600">
                {tab.label}
              </span>
              <span className="mt-1 block text-2xl font-bold text-gray-900">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {ACCOUNT_TABS.find((tab) => tab.id === activeTab)?.label} Accounts
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {activeTab === 'active'
            ? 'These Donors can manage their food listings.'
            : activeTab === 'deactivated'
              ? 'These Donors can log in and appeal, but restricted actions are blocked.'
              : 'These Donors are archived, restricted, and can still submit appeals.'}
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-gray-400">
          Loading provider accounts...
        </div>
      ) : displayedProviders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {displayedProviders.map(renderProviderCard)}
        </div>
      ) : (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-800">
            No {activeTab} accounts
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Accounts in this category will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default Providers;
