// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { fetchStats, fetchReservations, fetchListings, fetchProviders } from '../services/api';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    availableCount: 0,
    reservationCount: 0,
    providerCount: 0,
    totalRedistributed: 0
  });
  const [recentReservations, setRecentReservations] = useState([]);
  const [activeItems, setActiveItems] = useState([]);
  const [weeklyActivity, setWeeklyActivity] = useState([
    { day: 'Mon', count: 0, height: 15 },
    { day: 'Tue', count: 0, height: 15 },
    { day: 'Wed', count: 0, height: 15 },
    { day: 'Thu', count: 0, height: 15 },
    { day: 'Fri', count: 0, height: 15 },
    { day: 'Sat', count: 0, height: 15 },
    { day: 'Sun', count: 0, height: 15 }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, resRes, listingsRes, providersRes] = await Promise.all([
          fetchStats().catch(() => null),
          fetchReservations().catch(() => null),
          fetchListings().catch(() => null),
          fetchProviders().catch(() => null)
        ]);

        const reservations = resRes?.data || [];
        const listings = listingsRes?.data || [];
        const providers = providersRes?.data || [];

        // 1. Total available food quantity (servings)
        const totalAvailableServings = listings
          .filter((item) => Number(item.quantity) > 0)
          .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        // 2. Sum reserved meal items across all active reservation claims (Fixes 11 vs 12 count issue)
        const totalReservedItems = reservations.reduce(
          (sum, item) => sum + (Number(item.quantityReserved || item.quantityClaimed) || 1),
          0
        );

        // 3. Registered Donors/Providers count
        const totalProviders = providers.length;

        // 4. Completed / Redistributed meal servings
        const completedReservations = reservations.filter(
          (r) => r.status === 'Completed' || r.status === 'Picked up'
        );
        const redistributedCount = completedReservations.reduce(
          (sum, item) => sum + (Number(item.quantityReserved || item.quantityClaimed) || 1),
          0
        );

        setStats({
          availableCount: totalAvailableServings,
          reservationCount: totalReservedItems,
          providerCount: totalProviders || statsRes?.data?.activePartners || 2,
          totalRedistributed: statsRes?.data?.mealsRescued || redistributedCount || totalReservedItems
        });

        // Recent Activity Data
        setRecentReservations(reservations.slice(0, 5));
        setActiveItems(listings.slice(0, 5));

        // Weekly Activity Chart Calculation
        if (reservations.length > 0) {
          const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          let hasRealData = false;

          reservations.forEach((item) => {
            if (item.createdAt) {
              const dayName = daysOfWeek[new Date(item.createdAt).getDay()];
              if (dayCounts[dayName] !== undefined) {
                dayCounts[dayName] += Number(item.quantityReserved || item.quantityClaimed) || 1;
                hasRealData = true;
              }
            }
          });

          if (hasRealData) {
            const maxVal = Math.max(...Object.values(dayCounts), 1);
            const computedActivity = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
              day,
              count: dayCounts[day],
              height: Math.max(15, Math.round((dayCounts[day] / maxVal) * 90))
            }));
            setWeeklyActivity(computedActivity);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const kpiItems = [
    { title: 'Available Food', value: stats.availableCount, subtext: 'live database items' },
    { title: 'Reservations', value: stats.reservationCount, subtext: 'active pickup claims' },
    { title: 'Providers', value: stats.providerCount, subtext: 'registered partners' },
    { title: 'Food Redistributed', value: stats.totalRedistributed, subtext: 'meals rescued to date' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Good morning, Admin</h1>
          <p className="text-sm text-gray-500">Here's what's happening across FoodLoop</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiItems.map((s, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">{s.title}</span>
            <div className="text-3xl font-extrabold text-gray-900 my-2">
              {loading ? '...' : s.value}
            </div>
            <span className="text-xs text-brand-600 font-medium">{s.subtext}</span>
          </div>
        ))}
      </div>

      {/* Analytics & Active Items Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Green Bar Chart Container */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Redistribution activity</h3>
            <p className="text-xs text-gray-400 mb-4">Meals successfully reserved and picked up this week</p>
          </div>

          {/* Chart Area */}
          <div className="h-52 w-full flex items-end justify-between gap-3 px-2 pt-6 pb-2">
            {weeklyActivity.map((item, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group relative">
                {/* Hover Count Badge */}
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -top-7">
                  {item.count} meals
                </span>

                {/* Green Activity Bar */}
                <div
                  className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-2xl transition-all duration-500 shadow-sm"
                  style={{ height: `${item.height}%` }}
                ></div>

                {/* Day Label */}
                <span className="text-xs font-semibold text-gray-400 group-hover:text-emerald-700 transition-colors">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Active Listings Panel */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Recent Listings</h3>
            <p className="text-xs text-gray-400 mb-6">Live inventory in MongoDB</p>

            <div className="space-y-4">
              {activeItems.length > 0 ? (
                activeItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-800 truncate max-w-[120px]">{item.title}</span>
                    <span className="text-xs text-emerald-600 font-bold">{item.quantity} {item.unit || 'servings'}</span>
                    <span className="text-xs text-gray-400">{item.category}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No active listings found. Create one in Food Listings!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">Recent reservations</h3>
        <p className="text-xs text-gray-400 mb-6">Monitor recent activity from recipients</p>

        {recentReservations.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentReservations.map((row, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between text-sm">
                <div className="w-1/4">
                  <p className="font-bold text-gray-900">
                    {row.listing?.title || row.listingTitle || row.title || 'Surplus Item'}
                  </p>
                </div>
                <div className="w-1/4 text-gray-600 font-medium">
                  {row.recipientName || row.recipient?.name || 'Community Recipient'}
                </div>
                <div className="w-1/4 text-gray-600 font-medium">
                  {row.quantityReserved || row.quantityClaimed || row.quantity || 1} items
                </div>
                <div className="w-1/4 text-right">
                  <StatusBadge status={row.status || 'Reserved'} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">No reservations placed yet.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;