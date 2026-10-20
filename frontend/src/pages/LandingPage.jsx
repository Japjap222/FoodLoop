// frontend/src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { fetchListings, fetchReservations, fetchReportStats, createReservation, createListing } from '../services/api';

export const LandingPage = ({ user, onNavigate }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // Track selected quantities per listing card (default 1)
  const [selectedQuantities, setSelectedQuantities] = useState({});

  // Maximum allowed servings per reservation item
  const MAX_RESERVABLE_LIMIT = 3;

  // Dynamic Impact Stats State
  const [impactStats, setImpactStats] = useState({
    availableMeals: 0,
    providersCount: 0,
    recipientsCount: 0,
    loading: true
  });

  // Modal state for Donors/Admins
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [quantity, setQuantity] = useState(1);
  const [pickupLocation, setPickupLocation] = useState('');

  const isDonorOrAdmin = user?.role === 'Donor' || user?.role === 'Admin';

  // Load live items, reservations, and impact statistics from MongoDB
  const loadData = async () => {
    try {
      setLoading(true);
      const [listingsRes, reportsRes, reservationsRes] = await Promise.all([
        fetchListings().catch(() => ({ data: [] })),
        fetchReportStats().catch(() => ({ data: {} })),
        fetchReservations().catch(() => ({ data: [] }))
      ]);

      const activeListings = listingsRes.data || [];
      const reservations = reservationsRes.data || [];

      // Exclude items with quantity <= 0 completely from the landing page
      const availableListings = activeListings.filter((item) => Number(item.quantity) > 0);
      setListings(availableListings);

      // Compute total available meals dynamically from active listing quantities
      const totalAvailable = availableListings.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

      // Compute unique recipient count dynamically from live reservations
      const uniqueRecipients = new Set(
        reservations
          .map((res) => (typeof res.recipient === 'object' ? res.recipient?._id : res.recipient) || res.recipientName)
          .filter(Boolean)
      ).size;

      const reportData = reportsRes.data || {};

      setImpactStats({
        availableMeals: totalAvailable,
        providersCount: reportData.activePartners || 1,
        recipientsCount: uniqueRecipients > 0 ? uniqueRecipients : 1,
        loading: false
      });
    } catch (err) {
      console.error('Error fetching live landing data:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Increase quantity counter (+ button)
  const handleIncreaseQty = (listingId, maxAllowed) => {
    const currentQty = selectedQuantities[listingId] || 1;
    if (currentQty < maxAllowed) {
      setSelectedQuantities((prev) => ({
        ...prev,
        [listingId]: currentQty + 1
      }));
    }
  };

  // Decrease quantity counter (- button)
  const handleDecreaseQty = (listingId) => {
    const currentQty = selectedQuantities[listingId] || 1;
    if (currentQty > 1) {
      setSelectedQuantities((prev) => ({
        ...prev,
        [listingId]: currentQty - 1
      }));
    }
  };

  // Handle Reserve click
  const handleReserve = async (item) => {
    if (!user) {
      onNavigate('login');
      return;
    }

    const qtyToReserve = selectedQuantities[item._id] || 1;

    try {
      setReservingId(item._id);
      await createReservation({
        listingId: item._id,
        recipientId: user?._id || user?.id,
        recipientName: user?.name || 'Community Recipient',
        quantityReserved: qtyToReserve,
        status: 'Reserved'
      });
      setToastMessage(`✓ Reserved ${qtyToReserve}x ${item.title}! Check "My Reservations" in navbar.`);
      setTimeout(() => setToastMessage(''), 5000);
      
      setSelectedQuantities((prev) => ({ ...prev, [item._id]: 1 }));
      loadData();
    } catch (err) {
      console.error('Reservation error:', err);
      alert('Could not complete reservation. Please try again.');
    } finally {
      setReservingId(null);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      await createListing({
        title,
        category,
        quantity: Number(quantity),
        pickupLocation,
        status: 'Available',
        providerName: user?.organization || user?.name || 'Community Provider'
      });
      setShowAddModal(false);
      setTitle('');
      setPickupLocation('');
      setQuantity(1);
      setToastMessage(`✓ Listing "${title}" created successfully!`);
      setTimeout(() => setToastMessage(''), 4000);
      loadData();
    } catch (err) {
      console.error('Error creating listing:', err);
      alert('Failed to save listing. Please ensure you are logged in as a Donor or Admin.');
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-16">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-brand-500 text-white px-6 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="bg-surface-card p-10 lg:p-14 rounded-[36px] border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-sm">
        <div className="space-y-6 lg:max-w-xl">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase">
            Rescue Food. Share Good.
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
            Good food should reach people, not bins.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            FoodLoop connects schools, businesses, and communities with people ready to pick up safe surplus food before its usable window ends.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => scrollToSection('available-now')}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-full text-sm transition shadow-sm"
            >
              Find surplus food
            </button>

            {isDonorOrAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-brand-100 hover:bg-brand-200 text-brand-800 font-semibold px-6 py-3.5 rounded-full text-sm transition border border-brand-200"
              >
                + Add Surplus Listing
              </button>
            )}

            {!user && (
              <button
                onClick={() => onNavigate('login')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-6 py-3.5 rounded-full text-sm transition"
              >
                List surplus
              </button>
            )}
          </div>
        </div>

        {/* Hero Impact Card */}
        <div className="w-full lg:w-80 bg-brand-100/50 border border-brand-200 p-8 rounded-3xl space-y-4">
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            Today's Impact
          </span>
          <div>
            <span className="text-4xl font-black text-gray-900 block">
              {impactStats.loading ? '...' : impactStats.availableMeals}
            </span>
            <span className="text-xs text-gray-600 font-medium">meals available nearby</span>
          </div>
          <div className="pt-3 border-t border-brand-200/60 text-xs text-gray-500 space-y-1">
            <p>
              {impactStats.providersCount} providers • {impactStats.recipientsCount} recipients
            </p>
            <p className="font-semibold text-brand-600">Time-sensitive redistribution</p>
          </div>
        </div>
      </section>

      {/* Available Now Section - Updated to grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
      <section id="available-now" className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Available now</h2>
            <p className="text-sm text-gray-500">Reserve surplus before it becomes waste.</p>
          </div>
          {isDonorOrAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-5 py-2.5 rounded-full transition shadow-sm"
            >
              + Add Listing
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading live MongoDB surplus food...</div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => {
              const maxSelectable = Math.min(item.quantity, MAX_RESERVABLE_LIMIT);
              const currentSelectedQty = selectedQuantities[item._id] || 1;

              return (
                <div
                  key={item._id}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
                >
                  <div>
                    <span className="text-xs font-bold text-brand-600 uppercase tracking-wider block mb-1">
                      {item.category || 'Surplus Food'}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">📍 {item.pickupLocation || 'Community Partner'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item._id)}
                          disabled={currentSelectedQty <= 1}
                          className="px-2.5 py-1 text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed border-r border-gray-200 transition text-xs"
                        >
                          −
                        </button>
                        <div className="px-3 py-1 text-xs font-bold text-gray-800 min-w-[28px] text-center">
                          {currentSelectedQty}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleIncreaseQty(item._id, maxSelectable)}
                          disabled={currentSelectedQty >= maxSelectable}
                          className="px-2.5 py-1 text-gray-700 font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed border-l border-gray-200 transition text-xs"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[11px] text-red-500 font-semibold mt-1">
                        {item.quantity} items left (Max {MAX_RESERVABLE_LIMIT})
                      </span>
                    </div>

                    <button
                      onClick={() => handleReserve(item)}
                      disabled={reservingId === item._id}
                      className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-5 py-2.5 rounded-full transition shadow-sm whitespace-nowrap self-start mt-0.5"
                    >
                      {reservingId === item._id ? 'Reserving...' : `Reserve (${currentSelectedQty})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 text-gray-400">
            No active food listings available right now.
          </div>
        )}
      </section>

      {/* Built for a connected community */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Built for a connected community</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Food Providers</h3>
            <p className="text-sm text-gray-500">Cafeterias, restaurants, bakeries, and other organizations posting safe surplus food.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Recipients</h3>
            <p className="text-sm text-gray-500">Students, staff, communities, and partner organizations claiming surplus for quick pickup.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Administrators</h3>
            <p className="text-sm text-gray-500">Manage users, listings, safety policies, and overall redistribution metrics.</p>
          </div>
        </div>
      </section>

      {/* How FoodLoop Works Banner */}
      <section id="how-it-works" className="bg-[#1E2822] rounded-4xl p-10 text-white space-y-8">
        <h2 className="text-3xl font-bold">How FoodLoop works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#2D3A32] p-6 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-brand-200">01</span>
            <h3 className="text-lg font-bold text-white">Providers list</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Post safe surplus food with quantity and pickup deadline.
            </p>
          </div>
          <div className="bg-[#2D3A32] p-6 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-brand-200">02</span>
            <h3 className="text-lg font-bold text-white">Recipients reserve</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              People nearby reserve available food before the window ends.
            </p>
          </div>
          <div className="bg-[#2D3A32] p-6 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-brand-200">03</span>
            <h3 className="text-lg font-bold text-white">Pick up & redistribute</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Food is collected on time, keeping good food in use.
            </p>
          </div>
        </div>
      </section>

      {/* Why Join FoodLoop Section */}
      <section className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-8 lg:p-12 space-y-6">
        <div className="max-w-xl space-y-2">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Make A Real Difference
          </span>
          <h2 className="text-3xl font-black text-gray-900">Why join FoodLoop today?</h2>
          <p className="text-sm text-gray-600">
            Whether you run a campus cafeteria or want to support zero-waste initiatives, your participation helps build a sustainable community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs space-y-2">
            <div className="text-2xl">🌱</div>
            <h3 className="font-bold text-gray-900 text-base">Zero Food Waste</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Divert wholesome meals away from landfills and reduce greenhouse gas emissions locally.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs space-y-2">
            <div className="text-2xl">🤝</div>
            <h3 className="font-bold text-gray-900 text-base">Empower Community</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Provide reliable access to nutritious food for students, peers, and local families in need.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs space-y-2">
            <div className="text-2xl">⚡</div>
            <h3 className="font-bold text-gray-900 text-base">Instant Matching</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Our real-time platform ensures surplus food is claimed within hours through instant digital reservations and live status tracking.
            </p>
          </div>
        </div>

        {!user && (
          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-full text-sm transition shadow-sm"
            >
              Create Free Account
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="text-sm font-semibold text-gray-700 hover:text-brand-600 transition px-2"
            >
              Already have an account? Sign in →
            </button>
          </div>
        )}
      </section>

      {/* Footer Branding Line */}
      <footer className="pt-6 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-brand-600">FoodLoop</span>
          <span>Surplus food, redistributed in time.</span>
        </div>
        <span>Built with MERN Stack</span>
      </footer>

      {/* Add Listing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Add Surplus Food Listing</h2>
            
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Sandwich Trays"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Cooked Meals">Cooked Meals</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Produce">Produce</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pickup Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cafeteria Counter 2"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition"
                >
                  Save Listing
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