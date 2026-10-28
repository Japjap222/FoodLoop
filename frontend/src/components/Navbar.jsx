
import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchReservations,
  fetchDonorReservations,
  fetchMyReservations,
  updateReservationStatus,
  fetchReportStats,
  createReview,
  fetchMyReviews,
} from '../services/api';

const DEFAULT_STATS = {
  mealsRescued: 0,
  totalWeightKg: 0,
  activePartners: 0,
  categoryBreakdown: [],
};

function formatDate(date) {
  if (!date) return 'Not specified';

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return String(date);

  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time) {
  if (!time) return 'Not specified';

  const [hours, minutes] = String(time).split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return String(time);
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function reservationMessage(status) {
  const messages = {
    Reserved: 'Waiting for the donor to prepare the food.',
    Ready: 'Your food is ready for pickup.',
    'Picked up': 'You can leave a review for this reservation.',
    Completed: 'You can leave a review for this reservation.',
    Cancelled: 'This reservation was cancelled.',
  };

  return messages[status] || 'Reservation status updated.';
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-4 text-3xl text-gray-400 hover:text-gray-700"
        >
          ×
        </button>

        <h2 className="pr-8 text-2xl font-extrabold text-gray-900">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}

        {children}
      </section>
    </div>
  );
}

export const Navbar = ({ user, onLogout, onNavigate, activeTab }) => {
  const [activeModal, setActiveModal] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const [loadingImpact, setLoadingImpact] = useState(false);
  const [reportStats, setReportStats] = useState(DEFAULT_STATS);

  const [myReviews, setMyReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [reviewForms, setReviewForms] = useState({});

  const closeModal = () => {
    setActiveModal(null);
    setReservationError('');
    setStatusError('');
    setReviewError('');
    setReviewSuccess('');
  };

  const handleLogoClick = () => {
    closeModal();
    onNavigate('landing', 'dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDashboard = () => {
    closeModal();
    onNavigate('dashboard', 'dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Settings uses the correct view for each role.
  const openSettings = () => {
    closeModal();

    if (user?.role === 'Recipient') {
      onNavigate('landing', 'settings');
    } else if (user?.role === 'Donor' || user?.role === 'Admin') {
      onNavigate('dashboard', 'settings');
    } else {
      onNavigate('login');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate home first, then retry scrolling until the section exists.
  const scrollToSection = (id) => {
    closeModal();

    if (activeTab !== 'landing') {
      onNavigate('landing', 'dashboard');
    }

    let attempts = 0;

    const tryScroll = () => {
      const section = document.getElementById(id);

      if (section) {
        section.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        return;
      }

      attempts += 1;

      if (attempts < 15) {
        window.setTimeout(tryScroll, 100);
      } else {
        console.warn(
          `FoodLoop navigation: section "#${id}" was not found. Check its ID in LandingPage.jsx.`
        );
      }
    };

    window.setTimeout(tryScroll, 0);
  };

  const loadReservations = useCallback(async () => {
    if (!user) return;

    setLoadingReservations(true);
    setReservationError('');
    setStatusError('');

    try {
      let response;

      if (user.role === 'Recipient') {
        response = await fetchMyReservations();
      } else if (user.role === 'Donor') {
        response = await fetchDonorReservations();
      } else if (user.role === 'Admin') {
        response = await fetchReservations();
      } else {
        setReservations([]);
        return;
      }

      const data = response?.data;

      setReservations(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.reservations)
            ? data.reservations
            : []
      );
    } catch (error) {
      console.error('Loading reservations failed:', error);
      setReservations([]);
      setReservationError(
        error.response?.data?.message ||
          'Could not load reservations. Please try again.'
      );
    } finally {
      setLoadingReservations(false);
    }
  }, [user]);

  const loadMyReviews = useCallback(async () => {
    if (user?.role !== 'Recipient') {
      setMyReviews([]);
      return;
    }

    setLoadingReviews(true);
    setReviewError('');

    try {
      const response = await fetchMyReviews();
      const data = response?.data;

      setMyReviews(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.reviews)
            ? data.reviews
            : []
      );
    } catch (error) {
      console.error('Loading reviews failed:', error);
      setMyReviews([]);
      setReviewError(
        error.response?.data?.message ||
          'Could not load your reviews. Please try again.'
      );
    } finally {
      setLoadingReviews(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (activeModal === 'myReservations' && user?.role === 'Recipient') {
      loadReservations();
      loadMyReviews();
    }
  }, [activeModal, user?.role, loadReservations, loadMyReviews]);

  const loadImpact = useCallback(async () => {
    setLoadingImpact(true);

    try {
      const response = await fetchReportStats();
      const data = response?.data;

      if (data) {
        setReportStats({
          mealsRescued: data.mealsRescued ?? 0,
          totalWeightKg: data.totalWeightKg ?? 0,
          activePartners: data.activePartners ?? 0,
          categoryBreakdown: Array.isArray(data.categoryBreakdown)
            ? data.categoryBreakdown
            : [],
        });
      }
    } catch (error) {
      console.error('Loading impact statistics failed:', error);
    } finally {
      setLoadingImpact(false);
    }
  }, []);

  useEffect(() => {
    if (activeModal === 'impact') {
      loadImpact();
    }
  }, [activeModal, loadImpact]);

  const handleStatusUpdate = async (id, status) => {
    if (user?.role !== 'Donor' && user?.role !== 'Admin') return;

    setUpdatingId(id);
    setStatusError('');

    try {
      await updateReservationStatus(id, status);
      await loadReservations();
    } catch (error) {
      console.error('Updating reservation failed:', error);
      setStatusError(
        error.response?.data?.message ||
          'Could not update the reservation status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const updateReviewForm = (reservationId, field, value) => {
    setReviewForms((previous) => ({
      ...previous,
      [reservationId]: {
        rating: previous[reservationId]?.rating ?? 5,
        comment: previous[reservationId]?.comment ?? '',
        ...previous[reservationId],
        [field]: value,
      },
    }));
  };

  const getReservationDonorId = (reservation) => {
    const listing = reservation?.listing;
    const donor =
      listing?.donor ||
      listing?.provider ||
      reservation?.donor;

    if (typeof donor === 'string') return donor;

    return donor?._id || donor?.id || '';
  };

  const getReservationReview = (reservation) => {
    const reservationId = reservation?._id;

    return myReviews.find((review) => {
      const reviewReservationId =
        review?.reservation?._id ||
        review?.reservationId ||
        (typeof review?.reservation === 'string'
          ? review.reservation
          : '');

      return String(reviewReservationId) === String(reservationId);
    });
  };

  const handleSubmitReview = async (reservation) => {
    if (user?.role !== 'Recipient') return;

    const reservationId = reservation?._id;
    const donorId = getReservationDonorId(reservation);

    if (!reservationId) {
      setReviewError('The reservation ID is missing.');
      return;
    }

    if (!donorId) {
      setReviewError(
        'The donor information could not be found for this reservation.'
      );
      return;
    }

    const status = String(reservation?.status || '').toLowerCase();

    if (status !== 'picked up' && status !== 'completed') {
      setReviewError(
        'You can review the donor only after the food has been picked up or the reservation is completed.'
      );
      return;
    }

    if (getReservationReview(reservation)) {
      setReviewError('You have already reviewed this reservation.');
      return;
    }

    const form = reviewForms[reservationId] || {
      rating: 5,
      comment: '',
    };

    const rating = Number(form.rating);
    const comment = String(form.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewError('Please select a rating from 1 to 5 stars.');
      return;
    }

    setSubmittingReviewId(reservationId);
    setReviewError('');
    setReviewSuccess('');

    try {
      await createReview({
        reservationId,
        donorId,
        rating,
        comment,
      });

      setReviewSuccess('Your review has been submitted successfully.');
      await loadMyReviews();
    } catch (error) {
      console.error('Submitting review failed:', error);
      setReviewError(
        error.response?.data?.message ||
          'Could not submit your review. Check that the reservation is completed and try again.'
      );
    } finally {
      setSubmittingReviewId(null);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleLogoClick}
            className="text-2xl font-bold tracking-tight text-brand-500"
          >
            FoodLoop
          </button>

          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium lg:gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('available-now')}
              className="text-gray-600 hover:text-brand-600"
            >
              Discover Food
            </button>

            <button
              type="button"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-gray-600 hover:text-brand-600"
            >
              How It Works
            </button>
            
            <button
              type="button"
              onClick={() => setActiveModal('impact')}
              className="text-gray-600 hover:text-brand-600"
            >
              Our Impact
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('safety')}
              className="text-gray-600 hover:text-brand-600"
            >
              Safety &amp; Guidelines
            </button>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                {(user.role === 'Donor' || user.role === 'Admin') && (
                  <button
                    type="button"
                    onClick={openDashboard}
                    className="rounded-full bg-brand-500 px-3 py-2 text-xs font-semibold text-white"
                  >
                    📊 {user.role} Dashboard
                  </button>
                )}

                {user.role === 'Recipient' && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('myReservations')}
                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700"
                  >
                    🛍️ My Reservations
                  </button>
                )}

                <button
                  type="button"
                  onClick={openSettings}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  ⚙️ Settings
                </button>

                <div className="flex flex-col items-end text-right">
                  <span className="max-w-32 truncate text-sm font-bold text-gray-900">
                    {user.name || user.fullName || 'User'}
                  </span>

                  <span className="mt-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                    {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2 py-2 text-xs font-semibold text-red-500 hover:text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {activeModal === 'myReservations' && user?.role === 'Recipient' && (
        <Modal
          title="My Reservations"
          subtitle="View your reservations, pickup information, and review donors after pickup."
          onClose={closeModal}
        >
          {reservationError && (
            <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {reservationError}
              <button type="button" onClick={loadReservations} className="ml-2 font-bold underline">
                Try again
              </button>
            </div>
          )}

          {loadingReservations ? (
            <p className="py-12 text-center text-sm text-gray-500">
              Loading your reservations...
            </p>
          ) : reservations.length === 0 ? (
            !reservationError && (
              <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">
                <p className="font-semibold text-gray-700">
                  You have no reservations yet.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Reserve available food and your reservations will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => scrollToSection('available-now')}
                  className="mt-4 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Discover Food
                </button>
              </div>
            )
          ) : (
            <div className="mt-6 space-y-5">
              {reservations.map((item) => {
                const status = item.status || 'Reserved';
                const quantity = item.quantityReserved ?? item.quantityClaimed ?? 1;
                const eligibleForReview = ['picked up', 'completed'].includes(
                  String(status).toLowerCase()
                );
                const existingReview = getReservationReview(item);
                const form = reviewForms[item._id] || { rating: 5, comment: '' };

                return (
                  <article key={item._id} className="rounded-2xl border border-gray-100 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {item.listing?.title || item.listingTitle || 'Surplus Food'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          📍 {item.listing?.pickupLocation || item.pickupLocation || 'Community Partner'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-600">
                          {quantity} {item.listing?.unit || 'servings'} reserved
                        </p>
                      </div>

                      <span className="inline-flex h-fit w-fit items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold">
                        {status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-brand-50 p-3">
                        <p className="text-xs font-bold text-brand-700">📅 Pickup Date</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatDate(item.reservationDate)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-3">
                        <p className="text-xs font-bold text-brand-700">🕐 Pickup Time</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatTime(item.reservationTime)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      {reservationMessage(status)}
                    </p>

                    {eligibleForReview && (
                      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <h4 className="font-bold text-gray-900">⭐ Review this donor</h4>

                        {existingReview ? (
                          <div className="mt-3 rounded-xl bg-white p-4">
                            <p className="font-semibold text-amber-600">
                              {'★'.repeat(Math.max(1, Math.min(5, Number(existingReview.rating) || 5)))}
                              {'☆'.repeat(5 - Math.max(1, Math.min(5, Number(existingReview.rating) || 5)))}
                            </p>
                            <p className="mt-2 text-sm text-gray-700">
                              {existingReview.comment || 'You submitted a rating without a comment.'}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-emerald-700">
                              ✓ Review submitted
                            </p>
                          </div>
                        ) : (
                          <>
                            <label htmlFor={`rating-${item._id}`} className="mt-3 block text-sm font-semibold text-gray-700">
                              Your rating
                            </label>
                            <select
                              id={`rating-${item._id}`}
                              value={form.rating}
                              onChange={(event) => updateReviewForm(item._id, 'rating', Number(event.target.value))}
                              className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm"
                            >
                              <option value={5}>5 stars — Excellent</option>
                              <option value={4}>4 stars — Good</option>
                              <option value={3}>3 stars — Average</option>
                              <option value={2}>2 stars — Poor</option>
                              <option value={1}>1 star — Very poor</option>
                            </select>

                            <label htmlFor={`comment-${item._id}`} className="mt-4 block text-sm font-semibold text-gray-700">
                              Comment (optional)
                            </label>
                            <textarea
                              id={`comment-${item._id}`}
                              value={form.comment}
                              onChange={(event) => updateReviewForm(item._id, 'comment', event.target.value)}
                              rows={3}
                              maxLength={1000}
                              placeholder="Share your experience with this donor..."
                              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-amber-400"
                            />
                            <button
                              type="button"
                              disabled={submittingReviewId === item._id || loadingReviews}
                              onClick={() => handleSubmitReview(item)}
                              className="mt-3 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submittingReviewId === item._id ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </>
                        )}
                      </section>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {reviewError && (
            <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {reviewError}
              <button type="button" onClick={loadMyReviews} className="ml-2 font-bold underline">
                Reload reviews
              </button>
            </div>
          )}

          {reviewSuccess && (
            <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {reviewSuccess}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={closeModal} className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              Close
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'impact' && (
        <Modal
          title="Our Community Impact"
          subtitle="The community impact of food redistribution."
          onClose={closeModal}
        >
          {loadingImpact ? (
            <p className="py-10 text-center text-gray-500">Loading impact statistics...</p>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-50 p-4">
                  <p className="text-xs text-gray-500">Meals Rescued</p>
                  <p className="mt-1 text-2xl font-black text-brand-600">
                    {Number(reportStats.mealsRescued).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-50 p-4">
                  <p className="text-xs text-gray-500">Food Saved</p>
                  <p className="mt-1 text-2xl font-black text-brand-600">
                    {reportStats.totalWeightKg} kg
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-50 p-4">
                  <p className="text-xs text-gray-500">Active Partners</p>
                  <p className="mt-1 text-2xl font-black text-brand-600">
                    {reportStats.activePartners}
                  </p>
                </div>
              </div>

              <h3 className="mt-6 font-bold text-gray-900">Surplus Category Breakdown</h3>

              {reportStats.categoryBreakdown.length ? (
                <div className="mt-3 space-y-4">
                  {reportStats.categoryBreakdown.map((cat, index) => {
                    const percentage = Math.min(100, Math.max(0, Number(cat.percentage) || 0));

                    return (
                      <div key={`${cat.category}-${index}`}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{cat.category} ({cat.totalQuantity} items)</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No category data available yet.</p>
              )}
            </>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-[#1E2822] p-4 text-white">
            <div>
              <p className="font-bold">Help Prevent Food Waste</p>
              <p className="mt-1 text-xs text-gray-300">
                Redistribute surplus food before it expires.
              </p>
            </div>
            <button
              type="button"
              onClick={() => scrollToSection('available-now')}
              className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold"
            >
              Join Now
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'safety' && (
        <Modal
          title="Food Safety & Guidelines"
          subtitle="Follow these guidelines when handling and collecting surplus food."
          onClose={closeModal}
        >
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: '🌡️',
                title: 'Temperature Control',
                text: 'Keep hot meals above 60°C and chilled items below 4°C before pickup.',
              },
              {
                icon: '📦',
                title: 'Safe Packaging',
                text: 'Use clean, food-grade containers and label known allergens.',
              },
              {
                icon: '⏱️',
                title: 'Pickup Deadlines',
                text: 'Follow the agreed pickup time and never distribute expired food.',
              },
              {
                icon: '🧼',
                title: 'Hygiene Standards',
                text: 'Use clean hands, sanitized equipment, and appropriate food storage.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-lg">{item.icon}</p>
                <h3 className="mt-1 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <h3 className="font-bold text-emerald-800">✔ What We Accept</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-emerald-900">
                <li>Unserved, freshly prepared meals</li>
                <li>Fresh bakery goods and pastries</li>
                <li>Intact fresh produce and packaged groceries</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <h3 className="font-bold text-rose-800">✖ What Is Restricted</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-rose-900">
                <li>Previously served food</li>
                <li>Items past their expiration date</li>
                <li>Unsealed or unhygienically handled items</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Got It
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Navbar;
