// frontend/src/pages/FoodListings.jsx
import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { fetchListings, createListing, deleteListing } from '../services/api';

export const FoodListings = ({ user }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cooked Meals');
  const [quantity, setQuantity] = useState(1);
  const [pickupLocation, setPickupLocation] = useState('');

  const loadListings = async () => {
    try {
      setLoading(true);
      const res = await fetchListings();
      const allListings = res.data || [];
      
      // Completely exclude items with quantity <= 0 or status "Reserved"
      const inStockListings = allListings.filter(
        (item) => Number(item.quantity) > 0 && item.status !== 'Reserved'
      );
      
      setListings(inStockListings);
    } catch (err) {
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleCreateListing = async (e) => {
    e.preventDefault();
    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
    try {
      await createListing({
        title,
        category,
        quantity: Number(quantity),
        pickupLocation,
        status: 'Available',
        providerName: currentUser?.organization || currentUser?.name || 'Japeth Food Store',
        donor: currentUser?._id || currentUser?.id
      });
      setIsModalOpen(false);
      setTitle('');
      setPickupLocation('');
      setQuantity(1);
      loadListings();
    } catch (err) {
      console.error('Failed to save listing:', err);
      alert('Failed to save listing. Make sure your backend server is running on port 5000.');
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Are you sure you want to remove this surplus listing?')) return;
    try {
      if (deleteListing) {
        await deleteListing(id);
      }
      loadListings();
    } catch (err) {
      console.error('Failed to delete listing:', err);
      setListings((prev) => prev.filter((item) => item._id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Food Listings</h1>
          <p className="text-sm text-gray-500">Manage and publish available surplus food items</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2.5 rounded-full transition shadow-sm text-sm"
        >
          + Create New Listing
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
          Loading food listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
          No available food listings found. Click "+ Create New Listing" to add new surplus items!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div key={item._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{item.category}</span>
                  <StatusBadge status={item.status || 'Available'} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1">📍 {item.pickupLocation}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Quantity</span>
                  <span className="text-sm font-bold text-gray-900">{item.quantity} {item.unit || 'servings'}</span>
                </div>
                <button
                  onClick={() => handleDeleteListing(item._id)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-full transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Add Food Listing</h2>
            
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sandwich Tray"
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
                  placeholder="e.g. Student Union Counter A"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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