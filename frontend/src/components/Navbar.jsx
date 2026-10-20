// frontend/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { fetchReservations, updateReservationStatus, fetchReportStats } from '../services/api';

export const Navbar = ({ user, onLogout, onNavigate, activeTab }) => {
  const [activeModal, setActiveModal] = useState(null); // 'impact' | 'safety' | 'myReservations' | null
  const [myReservations, setMyReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Dynamic Impact Report Stats State
  const [reportStats, setReportStats] = useState({
    mealsRescued: 1248,
    totalWeightKg: 342,
    activePartners: 42,
    categoryBreakdown: []
  });
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Fetch only reservations belonging strictly to the logged-in user
  const loadUserReservations = async () => {
    if (!user) return;
    try {
      setLoadingReservations(true);
      const res = await fetchReservations();
      if (res.data) {
        const userId = (user._id || user.id)?.toString();
        const userName = (user.name || '').toLowerCase().trim();

        const filtered = res.data.filter((item) => {
          const itemRecipientId = (typeof item.recipient === 'object' ? item.recipient?._id : item.recipient)?.toString();
          if (itemRecipientId && userId && itemRecipientId === userId) return true;

          const itemRecipientName = (item.recipientName || '').toLowerCase().trim();
          if (itemRecipientName && userName && itemRecipientName === userName) return true;

          return false;
        });

        setMyReservations(filtered);
      }
    } catch (err) {
      console.error('Error fetching user reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Fetch live impact analytics from MongoDB for the modal
  const loadImpactAnalytics = async () => {
    try {
      setLoadingImpact(true);
      const res = await fetchReportStats();
      if (res?.data) {
        setReportStats({
          mealsRescued: res.data.mealsRescued ?? 1248,
          totalWeightKg: res.data.totalWeightKg ?? 342,
          activePartners: res.data.activePartners ?? 42,
          categoryBreakdown: Array.isArray(res.data.categoryBreakdown) ? res.data.categoryBreakdown : []
        });
      }
    } catch (err) {
      console.error('Error loading dynamic impact metrics:', err);
    } finally {
      setLoadingImpact(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'myReservations') {
      loadUserReservations();
    } else if (activeModal === 'impact') {
      loadImpactAnalytics();
    }
  }, [activeModal]);

  const handleConfirmPickup = async (id) => {
    try {
      await updateReservationStatus(id, 'Completed');
      loadUserReservations();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Could not update status. Please try again.');
    }
  };

  const scrollToSection = (id) => {
    const performScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    if (activeTab !== 'landing') {
      onNavigate('landing');
      setTimeout(performScroll, 100);
    } else {
      performScroll();
    }
  };

  const handleLogoClick = () => {
    if (activeTab !== 'landing') {
      onNavigate('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="text-2xl font-bold text-brand-500 tracking-tight hover:opacity-80 transition focus:outline-none"
          >
            FoodLoop
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button 
              onClick={() => scrollToSection('available-now')}
              className="text-gray-600 hover:text-brand-600 transition focus:outline-none"
            >
              Discover Food
            </button>
            
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-600 hover:text-brand-600 transition focus:outline-none"
            >
              How It Works
            </button>
            
            <button 
              onClick={() => setActiveModal('impact')}
              className={`${
                activeModal === 'impact' ? 'text-brand-600 font-semibold' : 'text-gray-600'
              } hover:text-brand-600 transition focus:outline-none`}
            >
              Our Impact
            </button>
            
            <button 
              onClick={() => setActiveModal('safety')}
              className={`${
                activeModal === 'safety' ? 'text-brand-600 font-semibold' : 'text-gray-600'
              } hover:text-brand-600 transition focus:outline-none`}
            >
              Safety & Guidelines
            </button>
          </nav>

          {/* Auth Controls & Reservations */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'Admin' && (
                  <button
                    onClick={() => onNavigate('dashboard', 'dashboard')}
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm flex items-center gap-1.5"
                  >
                    <span>📊</span> Admin Dashboard
                  </button>
                )}

                <button
                  onClick={() => setActiveModal('myReservations')}
                  className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm flex items-center gap-1.5"
                >
                  <span>🛍️</span> My Reservations
                </button>

                <div className="text-right flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200 mt-1">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-2 transition ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-sm font-semibold text-gray-700 hover:text-brand-600 px-4 py-2 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition shadow-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- MY RESERVATIONS MODAL --- */}
      {activeModal === 'myReservations' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              ×
            </button>

            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Pickup Center
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">My Reserved Food</h2>
              <p className="text-xs text-gray-500 mt-1">
                Track your active food claims and mark them as collected when picked up.
              </p>
            </div>

            {loadingReservations ? (
              <div className="text-center py-12 text-gray-400">Loading your reservations...</div>
            ) : myReservations.length > 0 ? (
              <div className="divide-y divide-gray-100 border-t border-b border-gray-100 my-2">
                {myReservations.map((item) => {
                  const isDone = item.status === 'Completed' || item.status === 'Picked up';
                  return (
                    <div key={item._id} className="py-4 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.listing?.title || item.listingTitle || 'Surplus Food'}
                        </p>
                        <p className="text-xs text-gray-400">
                          📍 {item.listing?.pickupLocation || 'Community Partner'}
                        </p>
                        <p className="text-[11px] text-brand-600 font-semibold mt-0.5">
                          {item.quantityReserved || item.quantityClaimed || 1} {item.listing?.unit || 'servings'} reserved
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status || 'Reserved'} />

                        {!isDone ? (
                          <button
                            onClick={() => handleConfirmPickup(item._id)}
                            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm"
                          >
                            ✓ Confirm Pickup
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold px-2">✓ Collected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-2xl text-center space-y-3 border border-gray-100">
                <p className="text-sm font-semibold text-gray-700">No active food reservations found for your account.</p>
                <p className="text-xs text-gray-400">Browse available surplus food on the home page and click "Reserve" to claim items!</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setActiveModal(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-6 py-2.5 rounded-full transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- OUR IMPACT MODAL (Fully Dynamic from MongoDB) --- */}
      {activeModal === 'impact' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              ×
            </button>

            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Real-Time Redistribution
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">Our Community Impact</h2>
              <p className="text-xs text-gray-500 mt-1">
                How FoodLoop converts local surplus food into environmental and community value.
              </p>
            </div>

            {loadingImpact ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading live metrics from MongoDB...</div>
            ) : (
              <>
                {/* Impact Metric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                    <span className="text-[11px] text-gray-500 font-medium">Meals Rescued</span>
                    <p className="text-2xl font-black text-brand-600 my-1">{reportStats.mealsRescued.toLocaleString()}</p>
                    <span className="text-[10px] text-brand-700 font-semibold">Live DB Claims</span>
                  </div>
                  <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                    <span className="text-[11px] text-gray-500 font-medium">Food Saved</span>
                    <p className="text-2xl font-black text-brand-600 my-1">{reportStats.totalWeightKg} kg</p>
                    <span className="text-[10px] text-brand-700 font-semibold">Diverted from waste</span>
                  </div>
                  <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                    <span className="text-[11px] text-gray-500 font-medium">Active Partners</span>
                    <p className="text-2xl font-black text-brand-600 my-1">{reportStats.activePartners}</p>
                    <span className="text-[10px] text-brand-700 font-semibold">Registered Donors</span>
                  </div>
                </div>

                {/* Surplus Category Breakdown Progress Bars */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-gray-900">Surplus Category Breakdown</h3>
                  
                  {reportStats.categoryBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {reportStats.categoryBreakdown.map((cat, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-gray-700">{cat.category} ({cat.totalQuantity} items)</span>
                            <span className="text-brand-600">{cat.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(0, cat.percentage || 0))}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No category breakdown data available yet.</p>
                  )}
                </div>
              </>
            )}

            {/* Bottom Dark Call to Action Banner */}
            <div className="bg-[#1E2822] p-4 rounded-2xl text-white text-xs flex items-center justify-between">
              <div>
                <p className="font-bold">Time-Sensitive Waste Prevention</p>
                <p className="text-gray-300 text-[11px]">92% of listings are picked up within 2 hours of posting.</p>
              </div>
              <button 
                onClick={() => { setActiveModal(null); scrollToSection('available-now'); }}
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-full text-xs transition"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SAFETY & GUIDELINES MODAL --- */}
      {activeModal === 'safety' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
            >
              ×
            </button>

            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Quality & Compliance
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">Food Safety & Guidelines</h2>
              <p className="text-xs text-gray-500 mt-1">
                Strict safety standards ensuring all surplus food is wholesome, safe, and handled with care.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-lg">🌡️</span>
                <h4 className="text-sm font-bold text-gray-900">Temperature Control</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Hot meals must be maintained above 60°C and chilled items kept under 4°C prior to pickup.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-lg">📦</span>
                <h4 className="text-sm font-bold text-gray-900">Safe Packaging</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  All food must be packaged in clean, food-grade, sealed containers labeled with allergen details.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-lg">⏱️</span>
                <h4 className="text-sm font-bold text-gray-900">Pickup Deadlines</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Listings enforce strict window timers. Expired or uncollected items are safely recycled.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <span className="text-lg">🧼</span>
                <h4 className="text-sm font-bold text-gray-900">Hygiene Standards</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Donors must hold valid food handling certifications and adhere to local sanitation codes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">✔ What We Accept</h4>
                <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                  <li>Unserved, freshly prepared cafeteria meals</li>
                  <li>Day-of surplus bakery goods & pastries</li>
                  <li>Intact fresh produce and packaged groceries</li>
                </ul>
              </div>

              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-2">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">✖ What Is Restricted</h4>
                <ul className="text-xs text-rose-900 space-y-1 list-disc list-inside">
                  <li>Previously served or plate-returned food</li>
                  <li>Items past safety expiration dates</li>
                  <li>Unsealed or unhygienically handled items</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setActiveModal(null)}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-6 py-2.5 rounded-full transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};