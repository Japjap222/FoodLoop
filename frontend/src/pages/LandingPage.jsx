
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchListings,
  fetchReservations,
  fetchDonorReservations,
  fetchMyReservations,
  fetchReportStats,
  createReservation,
  createListing
} from '../services/api';

const MAX_RESERVABLE_LIMIT = 3;

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const createDefaultSchedule = () =>
  DAYS_OF_WEEK.map((day) => ({
    day,
    isAvailable: day !== 'Sunday',
    startTime: '09:00',
    endTime: '17:00'
  }));

const normalizeSchedule = (schedule = []) =>
  DAYS_OF_WEEK.map((day) => {
    const existing = schedule.find((entry) => entry.day === day);

    return {
      day,
      isAvailable: existing ? Boolean(existing.isAvailable) : false,
      startTime: existing?.startTime || '09:00',
      endTime: existing?.endTime || '17:00'
    };
  });

const getLocalDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const getLocalDate = () => getLocalDateTime().slice(0, 10);

const formatExpiration = (value) => {
  if (!value) return 'Expiration date not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid expiration date';
  }

  return date.toLocaleString();
};

const isExpired = (item) => {
  if (!item.expirationDate) return false;

  const date = new Date(item.expirationDate);

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const getWeekday = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString('en-US', {
    weekday: 'long'
  });
};

const formatReservationDateTime = (dateString, timeString) => {
  if (!dateString || !timeString) return 'Not specified';

  const date = new Date(`${dateString}T${timeString}`);

  if (Number.isNaN(date.getTime())) {
    return `${dateString} ${timeString}`;
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const SURFACE =
  'bg-theme-surface border border-theme text-theme-primary';

const INPUT =
  'w-full rounded-xl border border-theme bg-theme-surface p-3 text-sm text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:ring-2 focus:ring-emerald-500';

const SECONDARY_BUTTON =
  'rounded-full border border-theme px-5 py-2.5 text-sm font-semibold text-theme-primary transition hover:bg-theme-secondary disabled:opacity-50';

export const LandingPage = ({ user, onNavigate }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState(null);
  const [creatingListing, setCreatingListing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedQuantities, setSelectedQuantities] = useState({});

  const [impactStats, setImpactStats] = useState({
    availableMeals: 0,
    providersCount: 0,
    recipientsCount: 0,
    loading: true
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [quantity, setQuantity] = useState(1);
  const [pickupLocation, setPickupLocation] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [pickupSchedule, setPickupSchedule] = useState(
    createDefaultSchedule()
  );

  const isDonorOrAdmin =
    user?.role === 'Donor' || user?.role === 'Admin';

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 5000);
  };

  const loadReservationsForRole = useCallback(async () => {
    if (!user?.role) return [];

    let response;

    if (user.role === 'Recipient') {
      response = await fetchMyReservations();
    } else if (user.role === 'Donor') {
      response = await fetchDonorReservations();
    } else if (user.role === 'Admin') {
      response = await fetchReservations();
    } else {
      return [];
    }

    return Array.isArray(response.data) ? response.data : [];
  }, [user?.role]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [listingsResult, reportsResult] = await Promise.all([
        fetchListings(),
        fetchReportStats().catch((error) => {
          console.error('Could not load report statistics:', error);
          return { data: {} };
        })
      ]);

      const allListings = Array.isArray(listingsResult.data)
        ? listingsResult.data
        : [];

      let reservations = [];

      try {
        reservations = await loadReservationsForRole();
      } catch (error) {
        console.error(
          'Could not load reservations for impact statistics:',
          error.response?.data || error.message
        );
      }

      setListings(
        allListings.filter((item) => Number(item.quantity) > 0)
      );

      const totalAvailable = allListings.reduce(
        (total, item) =>
          total +
          (!isExpired(item) && item.status === 'Available'
            ? Number(item.quantity) || 0
            : 0),
        0
      );

      const uniqueRecipients = new Set(
        reservations
          .map((reservation) => {
            const recipient = reservation.recipient;

            return (
              (typeof recipient === 'object'
                ? recipient?._id || recipient?.id
                : recipient) ||
              reservation.recipientName
            );
          })
          .filter(Boolean)
      ).size;

      const reportData = reportsResult.data || {};

      setImpactStats({
        availableMeals: totalAvailable,
        providersCount: reportData.activePartners ?? 0,
        recipientsCount: uniqueRecipients,
        loading: false
      });
    } catch (error) {
      console.error('Error loading landing page:', error);

      setListings([]);

      setImpactStats((previous) => ({
        ...previous,
        loading: false
      }));
    } finally {
      setLoading(false);
    }
  }, [loadReservationsForRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIncreaseQty = (listingId, maxAllowed) => {
    const currentQty = selectedQuantities[listingId] || 1;

    if (currentQty < maxAllowed) {
      setSelectedQuantities((previous) => ({
        ...previous,
        [listingId]: currentQty + 1
      }));
    }
  };

  const handleDecreaseQty = (listingId) => {
    const currentQty = selectedQuantities[listingId] || 1;

    if (currentQty > 1) {
      setSelectedQuantities((previous) => ({
        ...previous,
        [listingId]: currentQty - 1
      }));
    }
  };

  const closeReserveModal = () => {
    setShowReserveModal(false);
    setSelectedListing(null);
    setReservationDate('');
    setReservationTime('');
  };

  const handleReserve = async (item) => {
    if (!user) {
      onNavigate('login');
      return;
    }

    if (user.role !== 'Recipient') {
      alert('Only Recipient accounts can reserve food.');
      return;
    }

    if (isExpired(item)) {
      alert('This food has expired and cannot be reserved.');
      await loadData();
      return;
    }

    if (item.status !== 'Available') {
      alert(
        `This listing is currently "${item.status || 'Unavailable'}". Please refresh the page and try another listing.`
      );
      await loadData();
      return;
    }

    const requestedQuantity = selectedQuantities[item._id] || 1;

    if (
      requestedQuantity < 1 ||
      requestedQuantity > MAX_RESERVABLE_LIMIT ||
      requestedQuantity > Number(item.quantity)
    ) {
      alert('Please select a valid quantity for this listing.');
      return;
    }

    setSelectedListing(item);
    setReservationDate('');
    setReservationTime('');
    setShowReserveModal(true);
  };

  const handleConfirmReservation = async (event) => {
    event.preventDefault();

    if (!user || user.role !== 'Recipient') {
      alert('Please log in with a Recipient account to reserve food.');
      closeReserveModal();
      return;
    }

    if (!selectedListing || !reservationDate || !reservationTime) {
      alert('Please select your reservation date and pickup time.');
      return;
    }

    const requestedDateTime = new Date(
      `${reservationDate}T${reservationTime}`
    );

    if (
      Number.isNaN(requestedDateTime.getTime()) ||
      requestedDateTime.getTime() <= Date.now()
    ) {
      alert('Please choose a future reservation date and time.');
      return;
    }

    const item = selectedListing;
    const requestedQuantity = selectedQuantities[item._id] || 1;

    if (
      isExpired(item) ||
      item.status !== 'Available' ||
      Number(item.quantity) < requestedQuantity
    ) {
      alert('This food is no longer available in the selected quantity.');
      closeReserveModal();
      await loadData();
      return;
    }

    const selectedDay = getWeekday(reservationDate);
    const schedule = Array.isArray(item.pickupSchedule)
      ? item.pickupSchedule
      : [];

    const scheduleForDay = schedule.find(
      (day) => day.day === selectedDay
    );

    if (schedule.length > 0) {
      if (!scheduleForDay || !scheduleForDay.isAvailable) {
        alert(
          `Pickup is not available on ${selectedDay}. Please choose another date.`
        );
        return;
      }

      if (
        reservationTime < scheduleForDay.startTime ||
        reservationTime > scheduleForDay.endTime
      ) {
        alert(
          `Please choose a pickup time between ${scheduleForDay.startTime} and ${scheduleForDay.endTime} on ${selectedDay}.`
        );
        return;
      }
    }

    if (
      item.expirationDate &&
      requestedDateTime.getTime() >
        new Date(item.expirationDate).getTime()
    ) {
      alert(
        'The selected pickup time is after the food expiration time. Please choose an earlier time.'
      );
      return;
    }

    try {
      setReservingId(item._id);

      await createReservation({
        listingId: item._id,
        recipientId: user?._id || user?.id,
        recipientName:
          user?.name || user?.fullName || 'Community Recipient',
        quantityReserved: requestedQuantity,
        reservationDate,
        reservationTime,
        status: 'Reserved'
      });

      closeReserveModal();

      setSelectedQuantities((previous) => ({
        ...previous,
        [item._id]: 1
      }));

      showToast(
        `Reserved ${requestedQuantity} × ${item.title} for ${formatReservationDateTime(
          reservationDate,
          reservationTime
        )}!`
      );

      await loadData();
    } catch (error) {
      console.error('Reservation request failed:', {
        message: error.message,
        status: error.response?.status,
        response: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      const serverMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.details;

      alert(
        serverMessage
          ? `Reservation failed: ${serverMessage}`
          : `Reservation failed: ${error.message}. Check the browser console and backend terminal for details.`
      );
    } finally {
      setReservingId(null);
    }
  };

  const resetListingForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Cooked Meals');
    setQuantity(1);
    setPickupLocation('');
    setExpirationDate('');
    setPickupSchedule(createDefaultSchedule());
  };

  const handleScheduleChange = (day, field, value) => {
    setPickupSchedule((previous) =>
      previous.map((entry) =>
        entry.day === day
          ? { ...entry, [field]: value }
          : entry
      )
    );
  };

  const handleCreateListing = async (event) => {
    event.preventDefault();

    if (!user || !isDonorOrAdmin) {
      alert('Only donors and administrators can create listings.');
      return;
    }

    const expiry = new Date(expirationDate);

    if (
      !expirationDate ||
      Number.isNaN(expiry.getTime()) ||
      expiry.getTime() <= Date.now()
    ) {
      alert('Please choose a future expiration date and time.');
      return;
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      alert('Quantity must be a whole number greater than zero.');
      return;
    }

    const normalizedSchedule = normalizeSchedule(pickupSchedule);
    const availableDays = normalizedSchedule.filter(
      (day) => day.isAvailable
    );

    if (availableDays.length === 0) {
      alert('Please select at least one pickup day.');
      return;
    }

    const invalidHours = availableDays.some(
      (day) =>
        !day.startTime ||
        !day.endTime ||
        day.startTime >= day.endTime
    );

    if (invalidHours) {
      alert(
        'For every open day, the closing time must be later than the opening time.'
      );
      return;
    }

    if (!title.trim() || !description.trim() || !pickupLocation.trim()) {
      alert('Please complete the title, description, and pickup location.');
      return;
    }

    try {
      setCreatingListing(true);

      await createListing({
        title: title.trim(),
        description: description.trim(),
        category,
        quantity: Number(quantity),
        pickupLocation: pickupLocation.trim(),
        expirationDate: expiry.toISOString(),
        pickupSchedule: normalizedSchedule,
        status: 'Available',
        providerName:
          user?.organization || user?.name || 'Community Provider'
      });

      const savedTitle = title.trim();

      setShowAddModal(false);
      resetListingForm();

      showToast(`Listing "${savedTitle}" created successfully!`);

      await loadData();
    } catch (error) {
      console.error('Create listing failed:', {
        message: error.message,
        status: error.response?.status,
        response: error.response?.data
      });

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          `Failed to create listing: ${error.message}`
      );
    } finally {
      setCreatingListing(false);
    }
  };

  const scrollToSection = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-16 text-theme-primary">
      {toastMessage && (
        <div
          role="status"
          className="fixed top-24 right-6 z-50 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl"
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* HERO */}
      <section className="flex flex-col items-center justify-between gap-10 rounded-[36px] border border-theme bg-theme-surface p-10 shadow-sm lg:flex-row lg:p-14">
        <div className="space-y-6 lg:max-w-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Rescue Food. Share Good.
          </span>

          <h1 className="text-4xl font-black leading-tight text-theme-primary lg:text-5xl">
            Good food should reach people, not bins.
          </h1>

          <p className="text-base leading-relaxed text-theme-secondary">
            FoodLoop connects schools, businesses, and communities with
            people ready to pick up safe surplus food before its usable
            window ends.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="button"
              onClick={() => scrollToSection('available-now')}
              className="rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Find surplus food
            </button>

            {isDonorOrAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-full border border-emerald-300 bg-emerald-100 px-6 py-3.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200"
              >
                + Add Surplus Listing
              </button>
            )}

            {!user && (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="rounded-full bg-theme-secondary px-6 py-3.5 text-sm font-semibold text-theme-primary transition hover:opacity-80"
              >
                List surplus
              </button>
            )}
          </div>
        </div>

        <div className="w-full space-y-4 rounded-3xl border border-theme bg-theme-secondary p-8 lg:w-80">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Today's Impact
          </span>

          <div>
            <span className="block text-4xl font-black text-theme-primary">
              {impactStats.loading ? '...' : impactStats.availableMeals}
            </span>
            <span className="text-xs font-medium text-theme-secondary">
              meals available
            </span>
          </div>

          <div className="space-y-1 border-t border-theme pt-3 text-xs text-theme-secondary">
            <p>
              {impactStats.providersCount} providers •{' '}
              {impactStats.recipientsCount} recipients
            </p>
            <p className="font-semibold text-emerald-600">
              Time-sensitive redistribution
            </p>
          </div>
        </div>
      </section>

      {/* AVAILABLE LISTINGS */}
      <section id="available-now" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-theme-primary">
              Available now
            </h2>
            <p className="text-sm text-theme-secondary">
              Check the description and expiration time before reserving.
            </p>
          </div>

          {isDonorOrAdmin && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + Add Listing
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-theme-secondary">
            Loading food listings...
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => {
              const expired = isExpired(item);
              const unavailable = expired || item.status !== 'Available';

              const maxSelectable = Math.max(
                1,
                Math.min(
                  Number(item.quantity) || 1,
                  MAX_RESERVABLE_LIMIT
                )
              );

              const currentSelectedQty = Math.min(
                selectedQuantities[item._id] || 1,
                maxSelectable
              );

              return (
                <div
                  key={item._id}
                  className={`${SURFACE} flex flex-col justify-between space-y-4 rounded-3xl p-6 shadow-sm transition hover:shadow-md`}
                >
                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-emerald-600">
                      {item.category || 'Surplus Food'}
                    </span>

                    <h3 className="text-xl font-bold text-theme-primary">
                      {item.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-theme-secondary">
                      {item.description || 'No description provided.'}
                    </p>

                    <p className="mt-3 text-xs text-theme-secondary">
                      📍 {item.pickupLocation || 'Community Partner'}
                    </p>

                    <p className="mt-3 text-xs">
                      <span className="font-semibold text-theme-primary">
                        Expires:
                      </span>{' '}
                      <span className={expired ? 'font-semibold text-red-500' : 'text-theme-secondary'}>
                        {formatExpiration(item.expirationDate)}
                      </span>
                    </p>

                    <p className="mt-2 text-xs text-theme-secondary">
                      Status: {expired ? 'Expired' : item.status || 'Unknown'}
                    </p>

                    {Array.isArray(item.pickupSchedule) &&
                      item.pickupSchedule.some((day) => day.isAvailable) && (
                        <div className="mt-4 rounded-xl bg-theme-secondary p-3">
                          <p className="mb-2 text-xs font-bold text-theme-primary">
                            Weekly Pickup Schedule
                          </p>

                          <div className="space-y-1">
                            {item.pickupSchedule
                              .filter((day) => day.isAvailable)
                              .map((day) => (
                                <p
                                  key={day.day}
                                  className="text-xs text-theme-secondary"
                                >
                                  <span className="font-semibold text-theme-primary">
                                    {day.day}:
                                  </span>{' '}
                                  {day.startTime} – {day.endTime}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-theme pt-3">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center overflow-hidden rounded-lg border border-theme bg-theme-surface">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item._id)}
                          disabled={unavailable || currentSelectedQty <= 1}
                          className="border-r border-theme px-2.5 py-1 text-xs font-bold text-theme-primary hover:bg-theme-secondary disabled:opacity-30"
                        >
                          −
                        </button>

                        <div className="min-w-[28px] px-3 py-1 text-center text-xs font-bold text-theme-primary">
                          {currentSelectedQty}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleIncreaseQty(item._id, maxSelectable)}
                          disabled={unavailable || currentSelectedQty >= maxSelectable}
                          className="border-l border-theme px-2.5 py-1 text-xs font-bold text-theme-primary hover:bg-theme-secondary disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <span className="mt-1 text-[11px] font-semibold text-theme-secondary">
                        {item.quantity} items left
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReserve(item)}
                      disabled={
                        reservingId === item._id ||
                        unavailable ||
                        Number(item.quantity) < 1
                      }
                      className="whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {reservingId === item._id
                        ? 'Reserving...'
                        : expired
                          ? 'Expired'
                          : item.status !== 'Available'
                            ? 'Unavailable'
                            : `Reserve (${currentSelectedQty})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${SURFACE} rounded-3xl p-12 text-center text-theme-secondary`}>
            No food listings available right now.
          </div>
        )}
      </section>

      {/* COMMUNITY */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-theme-primary">
          Built for a connected community
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Food Providers',
              description:
                'Cafeterias, restaurants, bakeries, and organizations posting safe surplus food.'
            },
            {
              title: 'Recipients',
              description:
                'Students, staff, communities, and partner organizations claiming surplus for quick pickup.'
            },
            {
              title: 'Administrators',
              description:
                'Manage users, listings, safety policies, and redistribution metrics.'
            }
          ].map((item) => (
            <div key={item.title} className={`${SURFACE} rounded-3xl p-8 shadow-sm`}>
              <h3 className="mb-2 text-xl font-bold text-theme-primary">
                {item.title}
              </h3>
              <p className="text-sm text-theme-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
                <section
            id="how-it-works"
            className="scroll-mt-24 space-y-8 rounded-3xl border border-theme bg-theme-secondary p-10"
          >
            <h2 className="text-3xl font-bold text-theme-primary">
              How FoodLoop works
            </h2>
          
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  number: '01',
                  title: 'Providers list',
                  description:
                    'Post safe surplus food with quantity and expiration time.',
                },
                {
                  number: '02',
                  title: 'Recipients reserve',
                  description:
                    'Recipients reserve available food before it expires.',
                },
                {
                  number: '03',
                  title: 'Pick up & redistribute',
                  description:
                    'Food is collected on time, keeping good food in use.',
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className={`${SURFACE} space-y-3 rounded-2xl p-6`}
                >
                  <span className="text-xs font-bold text-emerald-600">
                    {step.number}
                  </span>
                  <h3 className="text-lg font-bold text-theme-primary">
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-theme-secondary">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
      {/* WHY JOIN */}
      <section className="space-y-6 rounded-3xl border border-theme bg-theme-secondary p-8 lg:p-12">
        <div className="max-w-xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Make A Real Difference
          </span>
          <h2 className="text-3xl font-black text-theme-primary">
            Why join FoodLoop today?
          </h2>
          <p className="text-sm text-theme-secondary">
            Your participation helps build a sustainable community and reduces food waste.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-3">
          {[
            {
              icon: '🌱',
              title: 'Zero Food Waste',
              description:
                'Divert wholesome meals away from landfills and reduce waste.'
            },
            {
              icon: '🤝',
              title: 'Empower Community',
              description:
                'Help provide access to nutritious food for local families.'
            },
            {
              icon: '⚡',
              title: 'Instant Matching',
              description:
                'Help surplus food get claimed before its usable window ends.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className={`${SURFACE} space-y-2 rounded-2xl p-6 shadow-sm`}
            >
              <div className="text-2xl">{item.icon}</div>
              <h3 className="text-base font-bold text-theme-primary">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-theme-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {!user && (
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Create Free Account
            </button>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="px-2 text-sm font-semibold text-theme-primary transition hover:text-emerald-600"
            >
              Already have an account? Sign in →
            </button>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-theme pt-6 text-xs text-theme-secondary">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-emerald-600">FoodLoop</span>
          <span>Surplus food, redistributed in time.</span>
        </div>
        <span>Built with MERN Stack</span>
      </footer>

      {/* ADD LISTING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${SURFACE} my-auto w-full max-w-md space-y-4 rounded-3xl p-6 shadow-xl`}>
            <h2 className="text-2xl font-bold text-theme-primary">
              Add Surplus Food Listing
            </h2>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Fresh Sandwich Trays"
                  className={INPUT}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                  Description
                </label>
                <textarea
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="Describe the food, ingredients, and condition."
                  className={INPUT}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                    Category
                  </label>
                  <select
                    className={INPUT}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Produce">Produce</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className={INPUT}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                  Pickup Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cafeteria Counter 2"
                  className={INPUT}
                  value={pickupLocation}
                  onChange={(event) => setPickupLocation(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-theme-secondary">
                  Food Expiration Date and Time
                </label>
                <input
                  type="datetime-local"
                  required
                  min={getLocalDateTime()}
                  className={INPUT}
                  value={expirationDate}
                  onChange={(event) => setExpirationDate(event.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-theme p-4">
                <div>
                  <h3 className="text-base font-bold text-theme-primary">
                    Weekly Pickup Schedule
                  </h3>
                  <p className="mt-1 text-xs text-theme-secondary">
                    Select the days and times when recipients can pick up this food.
                  </p>
                </div>

                {pickupSchedule.map((day) => (
                  <div
                    key={day.day}
                    className="space-y-3 rounded-xl border border-theme p-3"
                  >
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-theme-primary">
                        {day.day}
                      </span>

                      <span className="flex items-center gap-2 text-sm text-theme-secondary">
                        <input
                          type="checkbox"
                          checked={day.isAvailable}
                          onChange={(event) =>
                            handleScheduleChange(
                              day.day,
                              'isAvailable',
                              event.target.checked
                            )
                          }
                        />
                        {day.isAvailable ? 'Available' : 'Closed'}
                      </span>
                    </label>

                    {day.isAvailable && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs text-theme-secondary">
                            Opens
                          </label>
                          <input
                            type="time"
                            required
                            value={day.startTime}
                            onChange={(event) =>
                              handleScheduleChange(day.day, 'startTime', event.target.value)
                            }
                            className={INPUT}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-theme-secondary">
                            Closes
                          </label>
                          <input
                            type="time"
                            required
                            value={day.endTime}
                            onChange={(event) =>
                              handleScheduleChange(day.day, 'endTime', event.target.value)
                            }
                            className={INPUT}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetListingForm();
                  }}
                  className={SECONDARY_BUTTON}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingListing}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creatingListing ? 'Saving...' : 'Save Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESERVATION MODAL */}
      {showReserveModal && selectedListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${SURFACE} my-auto w-full max-w-md rounded-3xl p-6 shadow-2xl`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-theme-primary">
                  Reserve Food
                </h2>
                <p className="mt-1 text-sm text-theme-secondary">
                  Choose your preferred pickup date and time.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReserveModal}
                className="rounded-full px-3 py-1 text-xl text-theme-secondary hover:bg-theme-secondary"
                aria-label="Close reservation popup"
              >
                ×
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-theme-secondary p-4">
              <h3 className="font-bold text-theme-primary">
                {selectedListing.title}
              </h3>

              <p className="mt-1 text-sm text-theme-secondary">
                📍 {selectedListing.pickupLocation || 'Community Partner'}
              </p>

              <p className="mt-1 text-sm text-theme-secondary">
                Quantity: {selectedQuantities[selectedListing._id] || 1}
              </p>

              {selectedListing.expirationDate && (
                <p className="mt-2 text-xs text-theme-secondary">
                  Expires: {formatExpiration(selectedListing.expirationDate)}
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmReservation} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-theme-primary">
                  Reservation Date
                </label>
                <input
                  type="date"
                  required
                  min={getLocalDate()}
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  className={INPUT}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-theme-primary">
                  Pickup Time
                </label>
                <input
                  type="time"
                  required
                  value={reservationTime}
                  onChange={(event) => setReservationTime(event.target.value)}
                  className={INPUT}
                />
              </div>

              {Array.isArray(selectedListing.pickupSchedule) &&
                selectedListing.pickupSchedule.some((day) => day.isAvailable) && (
                  <div className="rounded-xl border border-theme bg-theme-secondary p-3">
                    <p className="mb-2 text-xs font-bold text-theme-primary">
                      Donor's Weekly Pickup Hours
                    </p>

                    {selectedListing.pickupSchedule
                      .filter((day) => day.isAvailable)
                      .map((day) => (
                        <p key={day.day} className="text-xs text-theme-secondary">
                          {day.day}: {day.startTime}–{day.endTime}
                        </p>
                      ))}
                  </div>
                )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeReserveModal}
                  disabled={reservingId === selectedListing._id}
                  className={SECONDARY_BUTTON}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={reservingId === selectedListing._id}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {reservingId === selectedListing._id
                    ? 'Reserving...'
                    : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
