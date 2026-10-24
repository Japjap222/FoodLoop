
import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { fetchReservations } from '../services/api';

export const Redistributed = () => {
  const [fulfilledItems, setFulfilledItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRedistributedItems = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetchReservations();
        const reservations = Array.isArray(response?.data)
          ? response.data
          : [];

        const completedReservations = reservations.filter(
          (reservation) => reservation.status === 'Completed'
        );

        if (isMounted) {
          setFulfilledItems(completedReservations);
        }
      } catch (err) {
        console.error('Failed to load redistributed meals:', err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
              'Could not load redistributed meals. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRedistributedItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatCompletedDate = (reservation) => {
    const date = reservation.updatedAt || reservation.createdAt;

    if (!date) {
      return 'Completion date unavailable';
    }

    return new Date(date).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getProviderName = (reservation) => {
    const listing = reservation.listing;

    return (
      listing?.providerName ||
      listing?.donor?.name ||
      listing?.donorName ||
      'Provider unavailable'
    );
  };

  const getFoodTitle = (reservation) => {
    return (
      reservation.listing?.title ||
      reservation.listingTitle ||
      'Food listing unavailable'
    );
  };

  const getRecipientName = (reservation) => {
    return (
      reservation.recipient?.name ||
      reservation.recipientName ||
      'Recipient unavailable'
    );
  };

  const getQuantity = (reservation) => {
    const quantity = Number(reservation.quantityReserved) || 0;
    const unit = reservation.listing?.unit || 'items';

    return `${quantity} ${unit}`;
  };

  const totalRedistributed = fulfilledItems.reduce(
    (total, reservation) =>
      total + (Number(reservation.quantityReserved) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Redistributed Meals
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          History of completed food distributions recorded in FoodLoop.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Completed Reservations
          </p>

          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {loading ? '...' : fulfilledItems.length}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Successfully marked as completed
          </p>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Total Quantity Distributed
          </p>

          <p className="mt-2 text-3xl font-extrabold text-emerald-700">
            {loading ? '...' : totalRedistributed}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Based on completed reservation quantities
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Distribution History
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Only reservations with a Completed status are shown.
          </p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Loading completed reservations...
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-gray-500">
            The distribution history could not be loaded.
          </p>
        ) : fulfilledItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl">📦</div>

            <h3 className="mt-4 font-bold text-gray-800">
              No redistributed meals yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Completed reservations will appear here automatically when
              FoodLoop has real distribution records.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="hidden items-center justify-between gap-4 border-b border-gray-100 pb-3 text-xs font-bold uppercase tracking-wider text-gray-400 lg:flex">
              <span className="w-[22%]">Food Item</span>
              <span className="w-[18%]">Provider</span>
              <span className="w-[18%]">Recipient</span>
              <span className="w-[15%]">Quantity</span>
              <span className="w-[15%]">Completed Date</span>
              <span className="w-[12%] text-right">Status</span>
            </div>

            {fulfilledItems.map((reservation) => (
              <div
                key={reservation._id}
                className="flex flex-col gap-3 border-b border-gray-100 py-5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
              >
                <div className="min-w-0 lg:w-[22%]">
                  <p className="break-words font-bold text-gray-900">
                    {getFoodTitle(reservation)}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Reservation #{String(reservation._id || '').slice(-6)}
                  </p>
                </div>

                <div className="text-sm text-gray-600 lg:w-[18%]">
                  <span className="font-semibold text-gray-400 lg:hidden">
                    Provider:{' '}
                  </span>
                  {getProviderName(reservation)}
                </div>

                <div className="text-sm text-gray-600 lg:w-[18%]">
                  <span className="font-semibold text-gray-400 lg:hidden">
                    Recipient:{' '}
                  </span>
                  {getRecipientName(reservation)}
                </div>

                <div className="text-sm font-bold text-brand-600 lg:w-[15%]">
                  <span className="font-semibold text-gray-400 lg:hidden">
                    Quantity:{' '}
                  </span>
                  {getQuantity(reservation)}
                </div>

                <div className="text-xs text-gray-500 lg:w-[15%]">
                  <span className="font-semibold text-gray-400 lg:hidden">
                    Date:{' '}
                  </span>
                  {formatCompletedDate(reservation)}
                </div>

                <div className="flex items-center justify-between lg:w-[12%] lg:justify-end">
                  <span className="text-xs font-semibold text-gray-400 lg:hidden">
                    Status
                  </span>
                  <StatusBadge status={reservation.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Redistributed;
