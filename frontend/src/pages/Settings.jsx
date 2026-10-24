
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SETTINGS_KEY = 'foodloop_settings';

const DEFAULT_NOTIFICATIONS = {
  reservations: true,
  foodListings: true,
  reminders: true,
};

const DEFAULT_SETTINGS = {
  theme: 'light',
  notifications: DEFAULT_NOTIFICATIONS,
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://foodloop-cbo9.onrender.com/api');

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const SURFACE =
  'rounded-2xl border border-theme bg-theme-surface p-6 text-theme-primary shadow-sm';

const INPUT =
  'w-full rounded-xl border border-theme bg-theme-surface px-4 py-3 text-sm text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:ring-2 focus:ring-emerald-500';

const PRIMARY_BUTTON =
  'rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';

const SECONDARY_BUTTON =
  'rounded-full border border-theme px-5 py-2.5 text-sm font-semibold text-theme-primary transition hover:bg-theme-secondary disabled:opacity-50';

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      ...DEFAULT_SETTINGS,
      ...(saved || {}),
      notifications: {
        ...DEFAULT_NOTIFICATIONS,
        ...(saved?.notifications || {}),
      },
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      notifications: { ...DEFAULT_NOTIFICATIONS },
    };
  }
}

function applyAppearance(theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'system' ? 'light dark' : theme;
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-theme-primary">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-theme-secondary">{description}</p>
      )}
    </div>
  );
}

function Notice({ type = 'success', children }) {
  const styles =
    type === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : 'border-emerald-300 bg-emerald-50 text-emerald-800';

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  required = true,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-theme-primary">
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required={required}
          className={`${INPUT} pr-20`}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-3 text-xs font-semibold text-theme-secondary hover:text-emerald-600"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export const Settings = ({ user, onLogout }) => {
  const [settings, setSettings] = useState(readSettings);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [generalMessage, setGeneralMessage] = useState('');

  useEffect(() => {
    applyAppearance(settings.theme);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateTheme = (theme) => {
    setSettings((previous) => ({ ...previous, theme }));
    applyAppearance(theme);
  };

  const updateNotification = (name, enabled) => {
    setSettings((previous) => ({
      ...previous,
      notifications: {
        ...previous.notifications,
        [name]: enabled,
      },
    }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        'Your new password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword.length > 128) {
      setPasswordError('Your new password must not exceed 128 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Your new passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        'Your new password must differ from your current password.'
      );
      return;
    }

    try {
      setChangingPassword(true);

      const response = await API.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(
        response.data?.message ||
          'Your password has been changed successfully.'
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      console.error('Change password request failed:', error);

      setPasswordError(
        error.response?.data?.message ||
          (error.response?.status === 401
            ? 'Your session may have expired. Please sign in again.'
            : 'Could not change your password. Check your connection and try again.')
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword('');
    setDeleteReason('');
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingAccount) return;

    setDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteReason('');
    setDeleteError('');
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Enter your current password to continue.');
      return;
    }

    if (!window.confirm(
      'This will permanently delete your account. This action cannot be undone. Continue?'
    )) {
      return;
    }

    try {
      setDeletingAccount(true);

      const response = await API.delete('/auth/me', {
        data: {
          password: deletePassword,
          reason: deleteReason,
        },
      });

      if (response.data?.accountDeleted) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(SETTINGS_KEY);

        setDeleteModalOpen(false);

        if (typeof onLogout === 'function') {
          onLogout();
        } else {
          window.location.assign('/');
        }
      }
    } catch (error) {
      console.error('Account deletion failed:', error);

      setDeleteError(
        error.response?.data?.message ||
          'Could not delete your account. Please try again.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSignOut = () => {
    if (typeof onLogout === 'function') {
      onLogout();
    }
  };

  const accountCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : 'Not available';

  const canDeleteAccount =
    user?.role === 'Donor' || user?.role === 'Recipient';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-theme-primary sm:px-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          FoodLoop Account
        </p>

        <h1 className="mt-2 text-3xl font-black text-theme-primary">
          Settings
        </h1>

        <p className="mt-2 text-sm text-theme-secondary">
          Manage your appearance, password, notifications, and account.
        </p>
      </header>

      {generalMessage && <Notice>{generalMessage}</Notice>}

      {/* APPEARANCE */}
      <section className={SURFACE}>
        <SectionHeading
          title="Appearance"
          description="Choose how FoodLoop looks on this device."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              value: 'light',
              title: 'Light',
              description: 'Bright background',
              icon: '☀️',
            },
            {
              value: 'dark',
              title: 'Dark',
              description: 'Dark background',
              icon: '🌙',
            },
            {
              value: 'system',
              title: 'System',
              description: 'Follow device preference',
              icon: '💻',
            },
          ].map((option) => {
            const selected = settings.theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateTheme(option.value)}
                aria-pressed={selected}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-theme bg-theme-surface text-theme-primary hover:bg-theme-secondary'
                }`}
              >
                <span className="text-2xl">{option.icon}</span>

                <span className="mt-3 block font-bold">
                  {option.title}
                </span>

                <span
                  className={`mt-1 block text-xs ${
                    selected ? 'text-emerald-800' : 'text-theme-secondary'
                  }`}
                >
                  {option.description}
                </span>

                {selected && (
                  <span className="mt-3 block text-xs font-bold">
                    ✓ Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-theme-secondary">
          Your theme preference is saved in this browser. System mode follows
          your device's light or dark preference.
        </p>
      </section>

      {/* ACCOUNT INFORMATION */}
      <section className={SURFACE}>
        <SectionHeading
          title="Account Information"
          description="Your account details are displayed below."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-theme-secondary p-4">
            <p className="text-xs text-theme-secondary">Full name</p>
            <p className="mt-1 break-words font-semibold text-theme-primary">
              {user?.name || user?.fullName || 'Not available'}
            </p>
          </div>

          <div className="rounded-xl bg-theme-secondary p-4">
            <p className="text-xs text-theme-secondary">Email address</p>
            <p className="mt-1 break-words font-semibold text-theme-primary">
              {user?.email || 'Not available'}
            </p>
          </div>

          <div className="rounded-xl bg-theme-secondary p-4">
            <p className="text-xs text-theme-secondary">Account role</p>
            <p className="mt-1 font-semibold text-theme-primary">
              {user?.role || 'Not available'}
            </p>
          </div>

          <div className="rounded-xl bg-theme-secondary p-4">
            <p className="text-xs text-theme-secondary">Member since</p>
            <p className="mt-1 font-semibold text-theme-primary">
              {accountCreated}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-theme-secondary">
          Contact your administrator if you need help with your account
          information or role.
        </p>
      </section>

      {/* CHANGE PASSWORD */}
      <section className={SURFACE}>
        <SectionHeading
          title="Change Password"
          description="Verify your current password before choosing a new one."
        />

        {passwordSuccess && (
          <div className="mb-5">
            <Notice>{passwordSuccess}</Notice>
          </div>
        )}

        {passwordError && (
          <div className="mb-5">
            <Notice type="error">{passwordError}</Notice>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrentPassword}
            onToggle={() =>
              setShowCurrentPassword((previous) => !previous)
            }
            autoComplete="current-password"
          />

          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggle={() => setShowNewPassword((previous) => !previous)}
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            onToggle={() =>
              setShowConfirmPassword((previous) => !previous)
            }
            autoComplete="new-password"
          />

          <p className="text-xs text-theme-secondary">
            Use at least 8 characters. Do not reuse your current password.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className={PRIMARY_BUTTON}
            >
              {changingPassword ? 'Changing password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      {/* NOTIFICATIONS */}
      <section className={SURFACE}>
        <SectionHeading
          title="Notification Preferences"
          description="Choose which notification preferences you want to save."
        />

        <div className="space-y-5">
          {[
            {
              key: 'reservations',
              title: 'Reservation updates',
              description:
                'Preference for updates about your food reservations.',
            },
            {
              key: 'foodListings',
              title: 'Food listing updates',
              description:
                'Preference for updates about food listings and availability.',
            },
            {
              key: 'reminders',
              title: 'Pickup reminders',
              description:
                'Preference for reminders about scheduled pickups.',
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start justify-between gap-4"
            >
              <span>
                <span className="block font-semibold text-theme-primary">
                  {item.title}
                </span>

                <span className="mt-1 block text-sm text-theme-secondary">
                  {item.description}
                </span>
              </span>

              <input
                type="checkbox"
                checked={Boolean(settings.notifications[item.key])}
                onChange={(event) =>
                  updateNotification(item.key, event.target.checked)
                }
                className="mt-1 h-5 w-5 accent-emerald-600"
              />
            </label>
          ))}
        </div>

        <p className="mt-5 border-t border-theme pt-4 text-xs text-theme-secondary">
          These options save your preferences locally. Actual email, push, or
          SMS delivery requires notification services to be implemented.
        </p>
      </section>

      {/* PRIVACY */}
      <section className={SURFACE}>
        <SectionHeading
          title="Privacy & Security"
          description="Understand how to keep your FoodLoop account secure."
        />

        <div className="space-y-3 text-sm text-theme-secondary">
          <p>
            <strong className="text-theme-primary">Password:</strong> Your
            password is stored as a hash by the backend, not displayed here.
          </p>

          <p>
            <strong className="text-theme-primary">Authentication:</strong>{' '}
            Protected account actions require your signed-in session.
          </p>

          <p>
            <strong className="text-theme-primary">Account data:</strong>{' '}
            Avoid sharing your password or authentication token with anyone.
          </p>
        </div>
      </section>

      {/* ABOUT */}
      <section className={SURFACE}>
        <SectionHeading
          title="About FoodLoop"
          description="FoodLoop helps communities redistribute surplus food."
        />

        <p className="text-sm leading-relaxed text-theme-secondary">
          The goal is to help food providers connect with recipients, reduce
          avoidable food waste, and coordinate timely pickups.
        </p>

        <p className="mt-3 text-xs text-theme-secondary">
          For technical issues, contact your FoodLoop project administrator.
        </p>
      </section>

      {/* SESSION */}
      <section className={SURFACE}>
        <SectionHeading
          title="Session"
          description="Sign out when you are finished using this account."
        />

        <button
          type="button"
          onClick={handleSignOut}
          className={SECONDARY_BUTTON}
        >
          Sign Out
        </button>
      </section>

      {/* DELETE ACCOUNT */}
      {canDeleteAccount && (
        <section className="rounded-2xl border border-red-300 bg-theme-surface p-6 shadow-sm">
          <SectionHeading
            title="Delete Account"
            description="Permanently delete your FoodLoop account."
          />

          <p className="mb-5 text-sm text-theme-secondary">
            Your account will be removed after your password is verified.
            Historical reservations and food listings are retained, but
            their reference to your account is removed. This action cannot
            be undone.
          </p>

          <button
            type="button"
            onClick={openDeleteModal}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Delete My Account
          </button>
        </section>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className={`${SURFACE} my-auto w-full max-w-md space-y-5 shadow-2xl`}
          >
            <div>
              <h2
                id="delete-account-title"
                className="text-xl font-bold text-red-600"
              >
                Permanently Delete Account
              </h2>

              <p className="mt-2 text-sm text-theme-secondary">
                Confirm your current password to continue. This action
                cannot be undone.
              </p>
            </div>

            {deleteError && <Notice type="error">{deleteError}</Notice>}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-theme-primary">
                  Current password
                </label>

                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className={INPUT}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-theme-primary">
                  Reason (optional)
                </label>

                <textarea
                  rows={3}
                  maxLength={500}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Tell us why you are leaving..."
                  className={INPUT}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deletingAccount}
                  className={SECONDARY_BUTTON}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingAccount ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Settings;
