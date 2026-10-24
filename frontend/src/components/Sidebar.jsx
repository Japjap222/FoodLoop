
import React from 'react';

export const Sidebar = ({
  currentView,
  setCurrentView,
  onGoHome,
  user,
}) => {
  const isDonor = user?.role === 'Donor';
  const isAdmin = user?.role === 'Admin';

  const menuItems = isDonor
    ? [
        { id: 'dashboard', label: '📊 Donor Dashboard' },
        { id: 'listings', label: '🍱 Manage Food Listings' },
        { id: 'donorReservations', label: '📋 Reservations' },
        { id: 'appeals', label: '📝 My Appeals' },
        { id: 'settings', label: '⚙️ Settings' },
      ]
    : isAdmin
      ? [
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'listings', label: '🍱 Food Listings' },
          { id: 'reservations', label: '📋 Reservations' },
          { id: 'providers', label: '🏪 Providers' },
          { id: 'userAccounts', label: '👥 User Accounts' },
          { id: 'appeals', label: '📝 Account Appeals' },
          { id: 'reports', label: '📈 Reports & Analytics' },
          { id: 'redistributed', label: '♻️ Redistributed' },
          { id: 'settings', label: '⚙️ Settings' },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'listings', label: 'Food Listings' },
          { id: 'appeals', label: '📝 My Appeals' },
          { id: 'settings', label: 'Settings' },
        ];

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col justify-between border-r border-gray-100 bg-white p-5 sm:p-6">
      <div>
        <button
          type="button"
          className="mb-8 block cursor-pointer text-left"
          onClick={onGoHome}
          title="Return to Home"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-500 transition hover:opacity-80">
            FoodLoop
          </h1>

          <p className="mt-1 text-xs text-gray-400">
            {isDonor
              ? 'Donor Center'
              : isAdmin
                ? 'Administration'
                : 'Community'}
          </p>
        </button>

        {isDonor && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Donor Account
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              Share food. Reduce waste.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="mb-5 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Admin Account
            </p>
            <p className="mt-1 text-sm font-semibold text-blue-900">
              Manage FoodLoop.
            </p>
          </div>
        )}

        <nav className="space-y-2" aria-label="Main navigation">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCurrentView(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-100 font-semibold text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 border-t border-gray-100 pt-5 text-xs leading-5 text-gray-400">
        <p className="font-semibold text-gray-500">FoodLoop</p>
        <p>Time-sensitive surplus food redistribution</p>
      </div>
    </aside>
  );
};

export default Sidebar;
