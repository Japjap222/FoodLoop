// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { FoodListings } from './pages/FoodListings.jsx';
import { Reservations } from './pages/Reservations.jsx';
import { Reports } from './pages/Reports.jsx';
import { Providers } from './pages/Providers.jsx';
import { Redistributed } from './pages/Redistributed.jsx';
import { Settings } from './pages/Settings.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';

export function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user state');
      }
    }
  }, []);

  const handleNavigate = (tab, view = 'dashboard') => {
    setActiveTab(tab);
    setCurrentView(view);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('landing');
  };

  if (activeTab === 'login') {
    return (
      <div className="min-h-screen bg-surface-bg">
        <Navbar user={user} onLogout={handleLogout} onNavigate={handleNavigate} activeTab={activeTab} />
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onSwitchToRegister={() => setActiveTab('register')} 
        />
      </div>
    );
  }

  if (activeTab === 'register') {
    return (
      <div className="min-h-screen bg-surface-bg">
        <Navbar user={user} onLogout={handleLogout} onNavigate={handleNavigate} activeTab={activeTab} />
        <Register 
          onRegisterSuccess={handleLoginSuccess} 
          onSwitchToLogin={() => setActiveTab('login')} 
        />
      </div>
    );
  }

  if (activeTab === 'dashboard') {
    // Protected Route Guard: Admin Role Only
    if (user?.role !== 'Admin') {
      return (
        <div className="min-h-screen bg-surface-bg flex flex-col">
          <Navbar user={user} onLogout={handleLogout} onNavigate={handleNavigate} activeTab={activeTab} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                🔒
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                The Admin Dashboard is strictly reserved for system administrators. As a <strong>{user?.role || 'Guest'}</strong>, you can manage surplus food directly on the home page.
              </p>
              <button
                onClick={() => handleNavigate('landing')}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-6 py-2.5 rounded-full transition shadow-sm"
              >
                Return to Home Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen bg-surface-bg font-sans">
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          onGoHome={() => handleNavigate('landing')}
        />
        <main className="flex-1 p-8 overflow-y-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'listings' && <FoodListings />}
          {currentView === 'reservations' && <Reservations />}
          {currentView === 'reports' && <Reports />}
          {currentView === 'providers' && <Providers />}
          {currentView === 'redistributed' && <Redistributed />}
          {currentView === 'settings' && <Settings />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <Navbar user={user} onLogout={handleLogout} onNavigate={handleNavigate} activeTab={activeTab} />
      <LandingPage user={user} onNavigate={handleNavigate} />
    </div>
  );
}

export default App;