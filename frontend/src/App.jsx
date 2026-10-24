
import React, { useState, useEffect } from 'react';

import { Navbar } from './components/Navbar.jsx';
import { Sidebar } from './components/Sidebar.jsx';

import { LandingPage } from './pages/LandingPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { FoodListings } from './pages/FoodListings.jsx';
import Reservations from './pages/Reservations.jsx';
import { Reports } from './pages/Reports.jsx';
import { Providers } from './pages/Providers.jsx';
import { UserAccounts } from './pages/UserAccounts.jsx';
import { Redistributed } from './pages/Redistributed.jsx';
import { Settings } from './pages/Settings.jsx';
import { MyAppeals } from './pages/MyAppeals.jsx';
import { Appeals } from './pages/Appeals.jsx';

import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';

function DonorDashboardHome({ user, onNavigate }) {
  const displayName = user?.name || user?.fullName || 'Donor';

  const cards = [
    {
      icon: '🍱',
      title: 'Manage Food Listings',
      description:
        'Add food, edit descriptions and quantities, and update expiration dates.',
      view: 'listings',
    },
    {
      icon: '📋',
      title: 'Reservations',
      description:
        'Review recipients, pickup information, and reservation statuses.',
      view: 'donorReservations',
    },
    {
      icon: '⚙️',
      title: 'Account Settings',
      description: 'Manage your profile and account preferences.',
      view: 'settings',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-[#1E2822] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-300">
          FOODLOOP DONOR CENTER
        </p>

        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          Welcome back, {displayName}!
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
          Manage your surplus food, update expiration dates, and keep track
          of reservations from recipients in one place.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard', 'listings')}
            className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600"
          >
            + Manage Food Listings
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dashboard', 'donorReservations')}
            className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            View Reservations
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-gray-900">
          Your Donor Dashboard
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Choose what you want to manage.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {cards.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate('dashboard', item.view)}
              className="group rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                {item.icon}
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {item.description}
              </p>
            </button>
          ))}

          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="group rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
              🌎
            </div>

            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Community Homepage
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Return to the homepage and browse community food listings.
            </p>
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <h3 className="font-bold text-emerald-900">
          Remember to check expiration dates
        </h3>

        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Keep listing details accurate and never distribute expired or unsafe food.
        </p>
      </section>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  const restricted =
    user?.accountActive === false || user?.isArchived === true;

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');

      if (savedUser) {
        const savedUserData = JSON.parse(savedUser);
        setUser(savedUserData);

        if (
          savedUserData.role === 'Donor' ||
          savedUserData.role === 'Admin'
        ) {
          setActiveTab('dashboard');
          setCurrentView(
            savedUserData.accountActive === false ||
              savedUserData.isArchived === true
              ? 'appeals'
              : 'dashboard'
          );
        } else {
          setActiveTab('landing');
          setCurrentView('dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to restore saved user:', error);
      localStorage.removeItem('user');
    } finally {
      setSessionRestored(true);
    }
  }, []);

  const handleNavigate = (tab, view = 'dashboard') => {
    // Recipients use the community page for their normal navigation,
    // but Settings and Appeals must remain separate views.
    if (user?.role === 'Recipient') {
      if (tab === 'landing') {
        setActiveTab('landing');
        setCurrentView(
          view === 'settings' || view === 'appeals'
            ? view
            : 'dashboard'
        );
      } else if (tab === 'dashboard') {
        setActiveTab('landing');
        setCurrentView(
          view === 'settings' || view === 'appeals'
            ? view
            : 'dashboard'
        );
      } else {
        setActiveTab(tab);
        setCurrentView(view);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (user?.role === 'Donor') {
      const donorViews = [
        'dashboard',
        'listings',
        'donorReservations',
        'settings',
        'appeals',
      ];

      if (tab === 'dashboard') {
        setActiveTab('dashboard');
        setCurrentView(
          donorViews.includes(view) ? view : 'dashboard'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setActiveTab(tab);
    setCurrentView(view || 'dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSidebarNavigate = (view) => {
    if (user?.role === 'Recipient') {
      setActiveTab('landing');
      setCurrentView(
        view === 'settings' || view === 'appeals'
          ? view
          : 'dashboard'
      );
    } else {
      setCurrentView(view);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    if (!userData) return;

    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    if (
      userData.accountActive === false ||
      userData.isArchived === true
    ) {
      setActiveTab(
        userData.role === 'Recipient' ? 'landing' : 'dashboard'
      );
      setCurrentView('appeals');
    } else if (userData.role === 'Admin' || userData.role === 'Donor') {
      setActiveTab('dashboard');
      setCurrentView('dashboard');
    } else {
      setActiveTab('landing');
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('landing');
    setCurrentView('dashboard');
  };

  if (!sessionRestored) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <p className="text-gray-600">Loading FoodLoop...</p>
      </div>
    );
  }

  if (activeTab === 'login' || activeTab === 'register') {
    return (
      <div className="min-h-screen bg-surface-bg">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeTab={activeTab}
        />

        {activeTab === 'login' ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setActiveTab('register')}
          />
        ) : (
          <Register
            onRegisterSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setActiveTab('login')}
          />
        )}
      </div>
    );
  }

  if (user && restricted && user.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-surface-bg">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeTab={activeTab}
        />

        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h1 className="text-xl font-bold text-amber-900">
              {user.isArchived ? 'Account Archived' : 'Account Deactivated'}
            </h1>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              You can log in and submit an appeal, but restricted actions
              are unavailable until your account is restored.
            </p>
          </section>

          <MyAppeals user={user} />
        </main>
      </div>
    );
  }

  if (
    activeTab === 'dashboard' &&
    (user?.role === 'Donor' || user?.role === 'Admin')
  ) {
    return (
      <div className="min-h-screen bg-surface-bg font-sans">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeTab={activeTab}
        />

        <div className="flex min-h-[calc(100vh-80px)]">
          <Sidebar
            currentView={currentView}
            setCurrentView={handleSidebarNavigate}
            onGoHome={() => handleNavigate('landing')}
            user={user}
          />

          <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-8">
            {user.role === 'Donor' && currentView === 'dashboard' && (
              <DonorDashboardHome
                user={user}
                onNavigate={handleNavigate}
              />
            )}

            {user.role === 'Donor' && currentView === 'listings' && (
              <FoodListings user={user} />
            )}

            {user.role === 'Donor' &&
              currentView === 'donorReservations' && (
                <Reservations user={user} />
              )}

            {user.role === 'Donor' && currentView === 'settings' && (
              <Settings user={user} />
            )}

            {user.role === 'Donor' && currentView === 'appeals' && (
              <MyAppeals user={user} />
            )}

            {user.role === 'Admin' && currentView === 'dashboard' && (
              <Dashboard />
            )}

            {user.role === 'Admin' && currentView === 'listings' && (
              <FoodListings user={user} />
            )}

            {user.role === 'Admin' && currentView === 'reservations' && (
              <Reservations user={user} />
            )}

            {user.role === 'Admin' && currentView === 'providers' && (
              <Providers />
            )}

            {user.role === 'Admin' && currentView === 'userAccounts' && (
              <UserAccounts />
            )}

            {user.role === 'Admin' && currentView === 'reports' && (
              <Reports />
            )}

            {user.role === 'Admin' && currentView === 'redistributed' && (
              <Redistributed />
            )}

            {user.role === 'Admin' && currentView === 'settings' && (
              <Settings user={user} />
            )}

            {user.role === 'Admin' && currentView === 'appeals' && (
              <Appeals />
            )}
          </main>
        </div>
      </div>
    );
  }

  if (activeTab === 'dashboard' && !user) {
    return (
      <div className="min-h-screen bg-surface-bg">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          activeTab={activeTab}
        />

        <div className="p-8 text-center">
          <p className="mb-4 text-gray-700">
            Please log in to access the dashboard.
          </p>

          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className="text-blue-600 underline hover:text-blue-800"
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        activeTab={activeTab}
      />

      {user?.role === 'Recipient' && currentView === 'settings' ? (
        <main className="mx-auto max-w-5xl p-4 sm:p-8">
          <Settings user={user} />
        </main>
      ) : user?.role === 'Recipient' && currentView === 'appeals' ? (
        <main className="mx-auto max-w-5xl p-4 sm:p-8">
          <MyAppeals user={user} />
        </main>
      ) : (
        <LandingPage user={user} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
