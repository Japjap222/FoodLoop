
import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import {
  fetchListings,
  createListing,
  updateListing,
  deleteListing,
} from '../services/api';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const createEmptyForm = () => ({
  title: '',
  description: '',
  category: 'Cooked Meals',
  quantity: '1',
  pickupLocation: '',
  expirationDate: '',
  pickupSchedule: DAYS_OF_WEEK.map((day) => ({
    day,
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
  })),
});

const toLocalDateTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);
};

const formatDateTime = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isExpired = (item) => {
  if (!item?.expirationDate) return false;

  const date = new Date(item.expirationDate);
  return Number.isNaN(date.getTime()) || date <= new Date();
};

const normalizeSchedule = (schedule) => {
  const savedSchedule = Array.isArray(schedule) ? schedule : [];

  return DAYS_OF_WEEK.map((day) => {
    const saved = savedSchedule.find((entry) => entry.day === day);

    return {
      day,
      enabled: Boolean(saved?.enabled),
      startTime: saved?.startTime || '09:00',
      endTime: saved?.endTime || '17:00',
    };
  });
};

// Handles donor IDs stored as strings, ObjectIds, or populated objects.
const getId = (value) => {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return String(
      value._id ??
      value.id ??
      value.userId ??
      value.$oid ??
      ''
    );
  }

  return '';
};

export const FoodListings = ({ user }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);

  const isAdmin = user?.role === 'Admin';
  const isDonor = user?.role === 'Donor';

  const editingListing = editingId
    ? listings.find((item) => getId(item._id) === getId(editingId))
    : null;

  const canEditQuantity =
    !editingId || editingListing?.status === 'Available';

  // Donors may manage only their own listings.
  // Admins may manage all listings.
  const canManageListing = (item) => {
    if (!user) return false;

    if (user.role === 'Admin') return true;
    if (user.role !== 'Donor') return false;

    const currentUserId = getId(
      user._id ?? user.id ?? user.userId
    );

    const donorId = getId(
      item.donor ??
      item.provider ??
      item.user ??
      item.donorId
    );

    return Boolean(
      currentUserId &&
      donorId &&
      currentUserId === donorId
    );
  };

  const loadListings = async () => {
    setLoading(true);
    setPageError('');

    try {
      const response = await fetchListings();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.listings || [];

      // Do not hide reserved, expired, or unavailable listings
      // from the management page.
      setListings(data);
    } catch (error) {
      console.error('Failed to load listings:', error);
      setPageError(
        error.response?.data?.message ||
        'Could not load food listings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    if (!canManageListing(item)) {
      alert('You do not have permission to edit this listing.');
      return;
    }

    setEditingId(item._id);

    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'Cooked Meals',
      quantity: String(item.quantity ?? 0),
      pickupLocation: item.pickupLocation || '',
      expirationDate: toLocalDateTime(item.expirationDate),
      pickupSchedule: normalizeSchedule(item.pickupSchedule),
    });

    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setForm(createEmptyForm());
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleScheduleChange = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      pickupSchedule: previous.pickupSchedule.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return 'Please enter a food listing title.';
    }

    if (!form.description.trim()) {
      return 'Please enter a food description.';
    }

    if (!form.pickupLocation.trim()) {
      return 'Please enter a pickup location.';
    }

    if (!form.expirationDate) {
      return 'Please enter the expiration date and time.';
    }

    const expiration = new Date(form.expirationDate);

    if (
      Number.isNaN(expiration.getTime()) ||
      expiration <= new Date()
    ) {
      return 'Please set an expiration date and time in the future.';
    }

    if (canEditQuantity) {
      const quantity = Number(form.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return 'Quantity must be greater than zero.';
      }
    }

    const enabledDays = form.pickupSchedule.filter(
      (entry) => entry.enabled
    );

    if (enabledDays.length === 0) {
      return 'Please select at least one pickup day.';
    }

    for (const entry of enabledDays) {
      if (!entry.startTime || !entry.endTime) {
        return `Please enter pickup hours for ${entry.day}.`;
      }

      if (entry.startTime >= entry.endTime) {
        return `Pickup end time must be later than start time on ${entry.day}.`;
      }
    }

    return '';
  };

  const handleSaveListing = async (event) => {
    event.preventDefault();
    setFormError('');

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      pickupLocation: form.pickupLocation.trim(),
      expirationDate: new Date(form.expirationDate).toISOString(),
      pickupSchedule: form.pickupSchedule.map((entry) => ({
        day: entry.day,
        enabled: entry.enabled,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })),
    };

    // Do not change quantity for listings that are no longer Available.
    if (canEditQuantity) {
      payload.quantity = Number(form.quantity);
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateListing(editingId, payload);
      } else {
        await createListing(payload);
      }

      setShowModal(false);
      setEditingId(null);
      setForm(createEmptyForm());
      await loadListings();
    } catch (error) {
      console.error('Failed to save listing:', error);
      setFormError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Could not save the listing. Check your permissions and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async (item) => {
    if (!canManageListing(item)) {
      alert('You do not have permission to delete this listing.');
      return;
    }

    const confirmed = window.confirm(
      `Delete "${item.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteListing(item._id);

      setListings((previous) =>
        previous.filter(
          (listing) => getId(listing._id) !== getId(item._id)
        )
      );
    } catch (error) {
      console.error('Failed to delete listing:', error);
      alert(
        error.response?.data?.message ||
        'Could not delete this listing. Please try again.'
      );
    }
  };

  const getDisplayStatus = (item) => {
    if (isExpired(item)) return 'Expired';
    if (Number(item.quantity) <= 0) return 'Unavailable';
    return item.status || 'Available';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manage Food Listings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add, view, edit, and delete food listings.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {isAdmin
              ? 'Admin: manage all listings.'
              : 'Donor: manage your own listings.'}
          </p>
        </div>

        {isDonor && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700"
          >
            + Add Food Listing
          </button>
        )}
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {pageError}
          <button
            type="button"
            onClick={loadListings}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
          Loading food listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center">
          <h2 className="font-semibold text-gray-800">
            No food listings found
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Listings will appear here when available.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4">Food listing</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Quantity</th>
                  <th className="px-5 py-4">Expiration</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Donor</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {listings.map((item) => {
                  const manageable = canManageListing(item);
                  const status = getDisplayStatus(item);

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {item.title || 'Untitled listing'}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {item.description || 'No description'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {item.pickupLocation || 'No pickup location'}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {item.category || 'Cooked Meals'}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {Number(item.quantity ?? 0)}{' '}
                        {item.unit || 'servings'}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <span
                          className={
                            status === 'Expired'
                              ? 'font-medium text-red-600'
                              : ''
                          }
                        >
                          {formatDateTime(item.expirationDate)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            status === 'Available'
                              ? 'bg-emerald-100 text-emerald-700'
                              : status === 'Expired'
                              ? 'bg-red-100 text-red-700'
                              : status === 'Reserved'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {item.providerName ||
                          item.donor?.name ||
                          '—'}
                      </td>

                      <td className="px-5 py-4">
                        {manageable ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteListing(item)}
                              className="rounded-full bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-gray-400">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit Food Listing' : 'Add Food Listing'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg px-3 py-1 text-2xl text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="space-y-5 p-6">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Food Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFieldChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFieldChange}
                  required
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFieldChange}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-emerald-500"
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Packaged Food">Packaged Food</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleFieldChange}
                    min={canEditQuantity ? '0.01' : '0'}
                    step="any"
                    required={canEditQuantity}
                    disabled={!canEditQuantity}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-500 disabled:bg-gray-100"
                  />
                  {!canEditQuantity && (
                    <p className="mt-1 text-xs text-gray-500">
                      Quantity is locked because this listing is no longer Available.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Pickup Location *
                </label>
                <input
                  name="pickupLocation"
                  value={form.pickupLocation}
                  onChange={handleFieldChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Expiration Date and Time *
                </label>
                <input
                  type="datetime-local"
                  name="expirationDate"
                  value={form.expirationDate}
                  onChange={handleFieldChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The expiration date must be in the future when saving.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-gray-700">
                  Pickup Schedule *
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                  Select at least one day and set pickup hours.
                </p>

                <div className="space-y-3">
                  {form.pickupSchedule.map((entry, index) => (
                    <div
                      key={entry.day}
                      className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_1fr] sm:items-center"
                    >
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(event) =>
                            handleScheduleChange(
                              index,
                              'enabled',
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                        />
                        {entry.day}
                      </label>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">
                          Start
                        </label>
                        <input
                          type="time"
                          value={entry.startTime}
                          disabled={!entry.enabled}
                          onChange={(event) =>
                            handleScheduleChange(
                              index,
                              'startTime',
                              event.target.value
                            )
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm disabled:bg-gray-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">
                          End
                        </label>
                        <input
                          type="time"
                          value={entry.endTime}
                          disabled={!entry.enabled}
                          onChange={(event) =>
                            handleScheduleChange(
                              index,
                              'endTime',
                              event.target.value
                            )
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
