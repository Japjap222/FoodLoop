import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    Available: 'bg-emerald-100 text-emerald-800',
    Ready: 'bg-lime-100 text-lime-800',
    Reserved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Expiring: 'bg-amber-100 text-amber-800',
    'Picked up': 'bg-emerald-200 text-emerald-900',
    Completed: 'bg-emerald-100 text-emerald-800',
    Cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};