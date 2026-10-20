import React from 'react';
import { StatusBadge } from '../components/StatusBadge';

export const Redistributed = () => {
  const fulfilledItems = [
    {
      id: '201',
      title: 'Fresh Veggie Wraps',
      provider: 'School Cafeteria',
      recipient: 'Community Youth Hub',
      quantity: '15 meals',
      completedAt: 'Today, 11:15 AM',
      status: 'Completed'
    },
    {
      id: '202',
      title: 'Whole Wheat Loaves',
      provider: 'Campus Bakery',
      recipient: 'St. Jude Shelter',
      quantity: '10 packs',
      completedAt: 'Yesterday, 4:30 PM',
      status: 'Completed'
    },
    {
      id: '203',
      title: 'Steamed Rice Bowls',
      provider: 'Main Dining Center',
      recipient: 'Student Assistance Desk',
      quantity: '20 boxes',
      completedAt: 'Yesterday, 1:00 PM',
      status: 'Completed'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Redistributed Meals</h1>
        <p className="text-sm text-gray-500">History of successfully collected and distributed surplus food</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="divide-y divide-gray-100">
          <div className="pb-3 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span className="w-1/4">Food Item</span>
            <span className="w-1/5">Provider</span>
            <span className="w-1/5">Recipient</span>
            <span className="w-1/6">Quantity</span>
            <span className="w-1/6 text-right">Status</span>
          </div>

          {fulfilledItems.map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between text-sm">
              <div className="w-1/4">
                <p className="font-bold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400">{item.completedAt}</p>
              </div>
              <div className="w-1/5 text-gray-600 font-medium">{item.provider}</div>
              <div className="w-1/5 text-gray-600 font-medium">{item.recipient}</div>
              <div className="w-1/6 text-brand-600 font-bold">{item.quantity}</div>
              <div className="w-1/6 text-right">
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};