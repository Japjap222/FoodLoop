// frontend/src/pages/Providers.jsx
import React, { useState, useEffect } from 'react';
import { fetchProviders, fetchListings } from '../services/api';

export const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      const [providersRes, listingsRes] = await Promise.all([
        fetchProviders().catch(() => ({ data: [] })),
        fetchListings().catch(() => ({ data: [] }))
      ]);

      if (providersRes.data) {
        setProviders(providersRes.data);
      }
      if (listingsRes.data) {
        setListings(listingsRes.data);
      }
    } catch (err) {
      console.error('Error loading provider accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();
  }, []);

  // Compute active listings and status for each provider
  const processedProviders = providers.map((p) => {
    const pId = p._id?.toString();
    const pOrg = (p.organization || '').toLowerCase().trim();
    const pName = (p.name || '').toLowerCase().trim();
    const pEmail = (p.email || '').toLowerCase().trim();

    // Strictly filter active listings (quantity > 0) belonging to THIS provider
    const activeListings = listings.filter((item) => {
      if (!item || Number(item.quantity) <= 0) return false;

      // 1. Match by donor ObjectId
      const itemDonorId = (typeof item.donor === 'object' ? item.donor?._id : item.donor)?.toString();
      if (itemDonorId && pId && itemDonorId === pId) return true;

      // 2. String matching against name, organization, or email
      const itemProvider = (item.providerName || '').toLowerCase().trim();
      if (itemProvider) {
        if (pOrg && (itemProvider.includes(pOrg) || pOrg.includes(itemProvider))) return true;
        if (pName && (itemProvider.includes(pName) || pName.includes(itemProvider))) return true;
        if (pEmail && itemProvider.includes(pEmail)) return true;
      }

      return false;
    });

    const totalServings = activeListings.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );

    const isActive = activeListings.length > 0;

    return {
      ...p,
      activeListings,
      totalServings,
      isActive
    };
  });

  // Sort providers so Active Providers appear first and Inactive Providers appear last
  const sortedProviders = processedProviders.sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Food Providers</h1>
          <p className="text-sm text-gray-500">Live provider accounts registered on FoodLoop</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 text-gray-400">
          Loading live provider accounts from MongoDB...
        </div>
      ) : sortedProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedProviders.map((p) => {
            return (
              <div key={p._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                      {p.role || 'Donor'}
                    </span>
                    
                    {/* Dynamic Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {p.isActive ? 'Active Provider' : 'Inactive Provider'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {p.organization || p.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    👤 Contact: {p.name} ({p.email})
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Account Role</span>
                    <p className="font-bold text-gray-900">{p.role}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-xs">Active Inventory</span>
                    <p className={`font-bold ${p.isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                      {p.totalServings} items live ({p.activeListings.length} {p.activeListings.length === 1 ? 'listing' : 'listings'})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl text-center border border-gray-100 text-gray-400">
          No provider or admin accounts registered in MongoDB yet.
        </div>
      )}
    </div>
  );
};

export default Providers;