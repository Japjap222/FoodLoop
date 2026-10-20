// frontend/src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import { fetchReportStats } from '../services/api';

export const Reports = () => {
  const [data, setData] = useState({
    mealsRescued: 0,
    totalWeightKg: 0,
    estimatedValueSaved: 0,
    activePartners: 0,
    categoryBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchReportStats();
      const d = res?.data;

      // Only accept a valid payload — otherwise keep the safe zero-state
      if (d && typeof d.mealsRescued === 'number') {
        setData({
          mealsRescued: d.mealsRescued ?? 0,
          totalWeightKg: d.totalWeightKg ?? 0,
          estimatedValueSaved: d.estimatedValueSaved ?? 0,
          activePartners: d.activePartners ?? 0,
          categoryBreakdown: Array.isArray(d.categoryBreakdown)
            ? d.categoryBreakdown
            : []
        });
      } else {
        console.warn('Reports payload was invalid — keeping zero state.', d);
        setError('Could not load live report data. Showing zeros.');
      }
    } catch (err) {
      console.error('Error loading report analytics:', err);
      setError('Could not reach the reports endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Safe number formatter — never crashes on undefined/null
  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '0');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500">
          Environmental impact and redistribution metrics calculated live from MongoDB
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meals Rescued Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-medium">Meals Rescued</span>
          <div className="text-4xl font-extrabold text-gray-900">
            {loading ? '...' : fmt(data.mealsRescued)}
          </div>
          <span className="text-xs text-brand-600 font-medium inline-block">
            Live MongoDB claims
          </span>
        </div>

        {/* Food Weight Rescued Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-medium">Food Weight Rescued</span>
          <div className="text-4xl font-extrabold text-gray-900">
            {loading ? '...' : `${data.totalWeightKg} kg`}
          </div>
          <span className="text-xs text-brand-600 font-medium inline-block">
            ~₱{fmt(data.estimatedValueSaved)} estimated value saved
          </span>
        </div>

        {/* Active Partners Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <span className="text-xs text-gray-400 font-medium">Active Partners</span>
          <div className="text-4xl font-extrabold text-gray-900">
            {loading ? '...' : data.activePartners}
          </div>
          <span className="text-xs text-brand-600 font-medium inline-block">
            Registered donor accounts
          </span>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Redistribution by Category</h3>
          <p className="text-xs text-gray-400 mt-1">
            Proportion of food surplus rescued by category type
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Loading category breakdown from MongoDB...
          </div>
        ) : data.categoryBreakdown.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No category data available yet.
          </div>
        ) : (
          <div className="space-y-5">
            {data.categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">
                    {cat.category} ({cat.totalQuantity} items)
                  </span>
                  <span className="text-brand-600">{cat.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, cat.percentage || 0))}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;