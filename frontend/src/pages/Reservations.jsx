// frontend/src/pages/Reservations.jsx
import React, { useState, useEffect } from 'react';
import { fetchReservations, updateReservationStatus } from '../services/api';

export const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const res = await fetchReservations();
      setReservations(res.data || []);
    } catch (err) {
      console.error('Error loading reservations:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updateReservationStatus(id, status);
      loadReservations();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Could not update reservation status.');
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Reserved':  return 'bg-amber-100 text-amber-800';
      case 'Ready':     return 'bg-blue-100 text-blue-800';
      case 'Picked up':
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      case 'Cancelled': return 'bg-rose-100 text-rose-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500">
            Live reservation claims from MongoDB
          </p>
        </div>
        <button
          onClick={loadReservations}
          className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition shadow-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 text-gray-400">
          Loading reservations from MongoDB...
        </div>
      ) : reservations.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Food Item</th>
                <th className="text-left px-6 py-3 font-semibold">Recipient</th>
                <th className="text-left px-6 py-3 font-semibold">Qty</th>
                <th className="text-left px-6 py-3 font-semibold">Reserved At</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {r.listing?.title || 'Deleted listing'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {r.listing?.pickupLocation || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {r.recipientName || 'Community Recipient'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {r.quantityReserved || 1}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {r.reservedAtTime || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r._id, e.target.value)}
                      className="border border-gray-200 rounded-lg text-xs px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Reserved">Reserved</option>
                      <option value="Ready">Ready</option>
                      <option value="Picked up">Picked up</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 text-gray-400">
          No reservations recorded yet.
        </div>
      )}
    </div>
  );
};

export default Reservations;