import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchReservations,
  fetchDonorReservations,
  fetchMyReservations,
  updateReservationStatus,
  createReview,
  fetchMyReviews,
} from '../services/api';

const STATUSES = [
  'Reserved',
  'Ready',
  'Picked up',
  'Completed',
  'Cancelled',
];

const getSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const statusClass = (status) => {
  switch (status) {
    case 'Ready':
      return 'bg-blue-100 text-blue-700';
    case 'Picked up':
      return 'bg-purple-100 text-purple-700';
    case 'Completed':
      return 'bg-green-100 text-green-700';
    case 'Cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

function ReviewForm({ reservation, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canReview = ['Picked up', 'Completed'].includes(reservation.status);

  const submitReview = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please choose a rating from 1 to 5 stars.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await createReview({
        reservationId: reservation._id,
        rating,
        comment: comment.trim(),
      });

      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      console.error('Review submission failed:', err);
      setError(
        err.response?.data?.message ||
          'Could not submit your review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Thank you! Your donor review has been submitted.
      </div>
    );
  }

  if (!canReview) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        You can review the donor after your reservation is marked Picked up
        or Completed.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        How was your experience with this donor?
      </p>

      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Donor rating"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            onClick={() => setRating(star)}
            className={`text-3xl ${
              star <= rating
                ? 'text-amber-400'
                : 'text-gray-300 hover:text-amber-300'
            }`}
          >
            ★
          </button>
        ))}

        <span className="ml-2 text-sm text-gray-500">
          {rating ? `${rating}/5` : 'Choose a rating'}
        </span>
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Write your feedback (optional)..."
        className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-emerald-500"
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submitReview}
        disabled={submitting || rating < 1}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit donor review'}
      </button>
    </div>
  );
}

export function DonorReservations({ user: userProp }) {
  const [user, setUser] = useState(userProp || getSavedUser());
  const [reservations, setReservations] = useState([]);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const role = user?.role;
  const isRecipient = role === 'Recipient';
  const isDonor = role === 'Donor';
  const isAdmin = role === 'Admin';
  const canManageStatus = isDonor || isAdmin;

  const loadReservations = useCallback(async () => {
    const currentUser = userProp || getSavedUser();

    setUser(currentUser);
    setLoading(true);
    setError('');

    try {
      if (!currentUser) {
        throw new Error('Please log in again to view reservations.');
      }

      let response;

      if (currentUser.role === 'Recipient') {
        response = await fetchMyReservations();
      } else if (currentUser.role === 'Donor') {
        response = await fetchDonorReservations();
      } else if (currentUser.role === 'Admin') {
        response = await fetchReservations();
      } else {
        throw new Error('Your account role could not be identified.');
      }

      setReservations(normalizeArray(response.data));
    } catch (err) {
      console.error('Loading reservations failed:', err);
      setReservations([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Could not load reservations.'
      );
    } finally {
      setLoading(false);
    }
  }, [userProp]);

  const loadReviewedIds = useCallback(async () => {
    const currentUser = userProp || getSavedUser();

    if (currentUser?.role !== 'Recipient') {
      setReviewedIds(new Set());
      return;
    }

    try {
      const response = await fetchMyReviews();
      const reviews = normalizeArray(response.data);

      const ids = reviews
        .map((review) => {
          const reservation = review.reservation;
          return typeof reservation === 'object'
            ? reservation?._id
            : reservation;
        })
        .filter(Boolean)
        .map(String);

      setReviewedIds(new Set(ids));
    } catch (err) {
      console.error('Loading recipient reviews failed:', err);
    }
  }, [userProp]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    if (isRecipient) {
      loadReviewedIds();
    } else {
      setReviewedIds(new Set());
    }
  }, [isRecipient, loadReviewedIds]);

  const updateStatus = async (reservationId, status) => {
    if (!canManageStatus) return;

    try {
      setUpdatingId(reservationId);
      setError('');
      setSuccess('');

      await updateReservationStatus(reservationId, status);

      setSuccess('Reservation status updated.');
      await loadReservations();
    } catch (err) {
      console.error('Updating reservation failed:', err);
      setError(
        err.response?.data?.message ||
          'Could not update the reservation status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const reservationsToShow =
    statusFilter === 'All'
      ? reservations
      : reservations.filter((item) => item.status === statusFilter);

  const activeCount = reservations.filter(
    (item) => !['Completed', 'Cancelled'].includes(item.status)
  ).length;

  const completedCount = reservations.filter(
    (item) => item.status === 'Completed'
  ).length;

  const pageTitle = isRecipient
    ? 'My Reservations'
    : isDonor
      ? 'Reservations for Your Listings'
      : 'All Reservations';

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            {isRecipient
              ? 'Recipient Center'
              : isDonor
                ? 'Donor Center'
                : 'Admin Center'}
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-900">
            {pageTitle}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isRecipient
              ? 'Track your food pickups and review donors after your reservation is completed.'
              : isDonor
                ? 'View recipient reservations and update their pickup status.'
                : 'Review and manage FoodLoop reservations.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadReservations();
            if (isRecipient) loadReviewedIds();
          }}
          disabled={loading}
          className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

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
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total reservations</p>
          <p className="mt-2 text-3xl font-black text-gray-900">
            {reservations.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active reservations</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completed reservations</p>
          <p className="mt-2 text-3xl font-black text-green-600">
            {completedCount}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Reservations
          </h2>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter reservations by status"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-gray-500">
            Loading reservations...
          </div>
        ) : reservationsToShow.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <h3 className="font-bold text-gray-800">
              No reservations found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {isRecipient
                ? 'Your reservations will appear here after you reserve food.'
                : isDonor
                  ? 'Reservations for your food listings will appear here.'
                  : 'There are currently no reservations to display.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {reservationsToShow.map((reservation) => {
              const listing =
                reservation.listing &&
                typeof reservation.listing === 'object'
                  ? reservation.listing
                  : {};

              const alreadyReviewed = reviewedIds.has(
                String(reservation._id)
              );

              return (
                <article
                  key={reservation._id}
                  className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                        {isRecipient ? 'Your reservation' : 'Food reservation'}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-gray-900">
                        {listing.title || 'Food listing'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {listing.category || 'Food'}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(reservation.status)}`}
                    >
                      {reservation.status || 'Reserved'}
                    </span>
                  </div>

                  {canManageStatus && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Recipient</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {reservation.recipientName || 'Community Recipient'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Quantity reserved</p>
                      <p className="mt-1 text-2xl font-black text-gray-900">
                        {Number(reservation.quantityReserved) || 1}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">Reservation date</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {formatDate(
                          reservation.reservationDate ||
                            reservation.reservedAtTime ||
                            reservation.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <strong className="text-gray-800">Pickup location:</strong>{' '}
                      {listing.pickupLocation || 'Not provided'}
                    </p>

                    {reservation.reservationTime && (
                      <p>
                        <strong className="text-gray-800">Pickup time:</strong>{' '}
                        {reservation.reservationTime}
                      </p>
                    )}

                    {listing.expirationDate && (
                      <p>
                        <strong className="text-gray-800">Food expires:</strong>{' '}
                        {formatDate(listing.expirationDate)}
                      </p>
                    )}
                  </div>

                  {/* REVIEW UI EXISTS ONLY FOR RECIPIENTS */}
                  {isRecipient && (
                    <section className="space-y-3 border-t border-gray-100 pt-4">
                      <h4 className="font-bold text-gray-900">
                        Review this donor
                      </h4>

                      {alreadyReviewed ? (
                        <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                          You have already reviewed this reservation. Thank you!
                        </p>
                      ) : (
                        <ReviewForm
                          reservation={reservation}
                          onSubmitted={async () => {
                            await loadReviewedIds();
                          }}
                        />
                      )}
                    </section>
                  )}

                  {/* STATUS MANAGEMENT EXISTS ONLY FOR DONOR AND ADMIN */}
                  {canManageStatus && (
                    <section className="border-t border-gray-100 pt-4">
                      <label
                        htmlFor={`status-${reservation._id}`}
                        className="mb-2 block text-sm font-semibold text-gray-800"
                      >
                        Update reservation status
                      </label>

                      <select
                        id={`status-${reservation._id}`}
                        value={reservation.status || 'Reserved'}
                        disabled={updatingId === reservation._id}
                        onChange={(event) =>
                          updateStatus(reservation._id, event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm disabled:opacity-50"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </section>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default DonorReservations;
