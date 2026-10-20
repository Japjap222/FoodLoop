// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';

export const Settings = () => {
  const [profile, setProfile] = useState({
    orgName: 'FoodLoop Campus Admin',
    email: 'admin@foodloop.org',
    pickupHours: '8:00 AM - 5:00 PM',
  });

  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    // 1. Load saved settings from localStorage if available
    const savedSettings = localStorage.getItem('foodloop_settings');
    if (savedSettings) {
      try {
        setProfile(JSON.parse(savedSettings));
        return;
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }

    // 2. Fallback: Prefill with current logged-in user details if present
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        setProfile((prev) => ({
          ...prev,
          orgName: userObj.organization || userObj.name || prev.orgName,
          email: userObj.email || prev.email,
        }));
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('foodloop_settings', JSON.stringify(profile));
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage system preferences and organization details
        </p>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-medium transition">
          ✓ Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Profile Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
            Organization Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={profile.orgName}
                onChange={(e) => setProfile({ ...profile, orgName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Standard Pickup Window
            </label>
            <input
              type="text"
              required
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={profile.pickupHours}
              onChange={(e) => setProfile({ ...profile, pickupHours: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-full transition shadow-sm text-sm"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};