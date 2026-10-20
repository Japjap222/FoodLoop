// frontend/src/components/Sidebar.jsx
import React from 'react';

export const Sidebar = ({ currentView, setCurrentView, onGoHome }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'listings', label: 'Food Listings' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'providers', label: 'Providers' },
    { id: 'reports', label: 'Reports & Analytics' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 p-6 flex flex-col justify-between">
      <div>
        <div 
          className="mb-10 cursor-pointer inline-block" 
          onClick={onGoHome}
          title="Return to Home"
        >
          <h1 className="text-2xl font-bold text-brand-500 tracking-tight hover:opacity-80 transition">
            FoodLoop
          </h1>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="text-xs text-gray-400">
        FoodLoop • Time-sensitive surplus redistribution
      </div>
    </aside>
  );
};