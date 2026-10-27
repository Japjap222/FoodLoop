import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Resend } from 'resend';

import User from '../models/User.js';
import Reservation from '../models/Reservation.js';
import FoodListing from '../models/FoodListing.js';
import Appeal from '../models/Appeal.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is not configured in backend/.env.'
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET || 'foodloop_secret_key_123',
    { expiresIn: '7d' }
  );

const publicUser = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization || '',
  accountActive: user.accountActive !== false,
  isArchived: user.isArchived === true,
  isApproved: user.isApproved,
  emailVerified: user.emailVerified !== false,
  createdAt: user.createdAt,
});

const safeAccount = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization || '',
  accountActive: user.accountActive !== false,
  isArchived: user.isArchived === true,
  isApproved: user.isApproved,
  emailVerified: user.emailVerified !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(otp).digest('hex');

const generateOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const sendOtpEmail = async (email, otp) => {
  console.log(`[DEV OTP CODE] Email: ${email} | OTP: ${otp}`); // <-- Add this line
  
  if (!resend) {
    console.warn('Email service is not configured.');
    return null;
  }

  const from =
    process.env.RESEND_FROM_EMAIL || 'FoodLoop <onboarding@resend.dev>';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: 'Your FoodLoop verification code',
      text: `Your FoodLoop verification code is ${otp}. It expires in five minutes. If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937">
          <h1 style="color:#16a34a">FoodLoop</h1>
          <h2>Verify your email address</h2>
          <p>Use this code to finish creating your FoodLoop account:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 0;color:#15803d">${otp}</div>
          <p>This code expires in <strong>five minutes</strong>.</p>
          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend email error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    return null;
  }
};

// POST /api/auth/register
// Creates an unverified account and sends a one-time email code.
router.post('/register', async (req, res) => {
  let createdUser;

  try {
    const { name, email, password, role, organization } = req.body;

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        message: 'Name must not exceed 100 characters.',
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: 'Password must be 8 to 128 characters long.',
      });
    }

    if (role && !['Donor', 'Recipient'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid registration role.',
      });
    }

    if (organization && typeof organization !== 'string') {
      return res.status(400).json({
        message: 'Organization must be text.',
      });
    }

    if (organization?.trim().length > 150) {
      return res.status(400).json({
        message: 'Organization must not exceed 150 characters.',
      });
    }

    if (!resend) {
      return res.status(503).json({
        message: 'Email verification is not configured on the server.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).select('+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts +emailOtpLastSentAt');

    if (existingUser) {
      if (existingUser.emailVerified !== false) {
        return res.status(409).json({
          message: 'An account already exists with this email. Please sign in.',
        });
      }

      const lastSentAt = existingUser.emailOtpLastSentAt?.getTime() || 0;

      if (Date.now() - lastSentAt < OTP_RESEND_DELAY_MS) {
        return res.status(429).json({
          message: 'Please wait one minute before requesting another code.',
        });
      }

      const otp = generateOtp();

      existingUser.emailOtpHash = hashOtp(otp);
      existingUser.emailOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
      existingUser.emailOtpAttempts = 0;
      existingUser.emailOtpLastSentAt = new Date();

      await existingUser.save();

      await sendOtpEmail(normalizedEmail, otp);

      return res.status(200).json({
        message: 'A new verification code has been sent to your email.',
        requiresVerification: true,
      });
    }

    const otp = generateOtp();

    createdUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: role || 'Recipient',
      organization: organization?.trim() || '',
      accountActive: true,
      isArchived: false,
      emailVerified: false,
      emailOtpHash: hashOtp(otp),
      emailOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      emailOtpAttempts: 0,
      emailOtpLastSentAt: new Date(),
    });

    await createdUser.save();

    await sendOtpEmail(normalizedEmail, otp);

    return res.status(201).json({
      message: 'Verification code sent. Check your email to finish registration.',
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account already exists with this email.',
      });
    }

    return res.status(500).json({
      message: 'Registration failed. Please try again.',
    });
  }
});

// POST /api/auth/verify-email
// Verifies a one-time code and issues the login token.
router.post('/verify-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp =
      typeof req.body.otp === 'string' ? req.body.otp.trim() : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: 'Enter your email address and six-digit verification code.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts +emailOtpLastSentAt'
    );

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification code. Please register again.',
      });
    }

    if (user.emailVerified === true) {
      return res.status(400).json({
        message: 'This email is already verified. Please sign in.',
      });
    }

    if (
      !user.emailOtpHash ||
      !user.emailOtpExpiresAt ||
      user.emailOtpExpiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: 'Your verification code has expired. Request a new code.',
      });
    }

    if ((user.emailOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: 'Too many incorrect attempts. Request a new verification code.',
      });
    }

    const suppliedHash = hashOtp(otp);
    const correct = crypto.timingSafeEqual(
      Buffer.from(suppliedHash, 'hex'),
      Buffer.from(user.emailOtpHash, 'hex')
    );

    if (!correct) {
      user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: 'Incorrect verification code.',
        attemptsRemaining: Math.max(
          0,
          MAX_OTP_ATTEMPTS - user.emailOtpAttempts
        ),
      });
    }

    user.emailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = undefined;

    await user.save();

    return res.json({
      message: 'Email verified successfully.',
      token: generateToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Email verification error:', error);

    return res.status(500).json({
      message: 'Email verification failed. Please try again.',
    });
  }
});

// POST /api/auth/resend-verification
// Sends another code to an existing unverified account.
router.post('/resend-verification', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: 'Email address is required.',
      });
    }

    if (!resend) {
      return res.status(503).json({
        message: 'Email verification is not configured on the server.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts +emailOtpLastSentAt'
    );

    if (!user || user.emailVerified === true) {
      return res.json({
        message: 'If the account needs verification, a new code can be sent.',
      });
    }

    const lastSentAt = user.emailOtpLastSentAt?.getTime() || 0;

    if (Date.now() - lastSentAt < OTP_RESEND_DELAY_MS) {
      return res.status(429).json({
        message: 'Please wait one minute before requesting another code.',
      });
    }

    const otp = generateOtp();

    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = new Date();

    await user.save();

    await sendOtpEmail(email, otp);

    return res.json({
      message: 'A new verification code has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);

    return res.status(500).json({
      message: 'Could not resend the verification code.',
    });
  }
});

// POST /api/auth/login
// Restricted users can still log in to submit appeals.
// New accounts must verify their email before logging in.
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        message: 'Invalid email or password.',
      });
    }

    // Existing accounts without the field remain compatible.
    if (user.emailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return res.json({
      token: generateToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.',
    });
  }
});

/**
 * PATCH /api/auth/change-password
 * Change the password of the currently authenticated user.
 */
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (
      typeof currentPassword !== 'string' ||
      !currentPassword ||
      typeof newPassword !== 'string' ||
      !newPassword ||
      typeof confirmPassword !== 'string' ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: 'Please complete all password fields.',
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        message: 'Your new password must be 8 to 128 characters long.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'The new password and confirmation do not match.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'Your new password must differ from your current password.',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'Your account could not be found.',
      });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({
        message: 'Your current password is incorrect.',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      message: 'Your password has been changed successfully.',
    });
  } catch (error) {
    console.error('Change password error:', error);

    return res.status(500).json({
      message: 'Could not change your password. Please try again.',
    });
  }
});

// DELETE /api/auth/me
// Preserve historical reservations and food listings.
router.delete('/me', protect, async (req, res) => {
  try {
    if (!['Donor', 'Recipient'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Admin accounts cannot be deleted using this option.',
      });
    }

    const { password } = req.body;

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Enter your password to confirm account deletion.',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'Your account could not be found.',
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        message: 'Incorrect password. Your account was not deleted.',
      });
    }

    const userId = user._id;

    await Reservation.updateMany(
      { recipient: userId },
      { $unset: { recipient: 1 } }
    );

    await FoodListing.updateMany(
      { donor: userId },
      { $unset: { donor: 1 } }
    );

    await Appeal.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });

    return res.json({
      message:
        'Your account has been permanently deleted. Your historical reservations and food listings were retained.',
      accountDeleted: true,
    });
  } catch (error) {
    console.error('Permanent account deletion error:', error);

    return res.status(500).json({
      message:
        'Account deletion could not be completed. Please try again.',
    });
  }
});

// GET /api/auth/providers
router.get(
  '/providers',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const providers = await User.find({ role: 'Donor' })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return res.json(providers.map(safeAccount));
    } catch (error) {
      console.error('Error fetching providers:', error);

      return res.status(500).json({
        message: 'Could not load provider accounts.',
      });
    }
  }
);

// GET /api/auth/accounts
router.get(
  '/accounts',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const accounts = await User.find({
        role: { $in: ['Donor', 'Recipient'] },
      })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return res.json(accounts.map(safeAccount));
    } catch (error) {
      console.error('Error fetching user accounts:', error);

      return res.status(500).json({
        message: 'Could not load user accounts.',
      });
    }
  }
);

// Validate an account managed by Admin.
const findManagedAccount = async (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid account ID.' });
    return null;
  }

  const user = await User.findById(id);

  if (!user) {
    res.status(404).json({ message: 'Account not found.' });
    return null;
  }

  if (!['Donor', 'Recipient'].includes(user.role)) {
    res.status(403).json({
      message: 'Admin accounts cannot be changed.',
    });
    return null;
  }

  return user;
};

// PATCH /api/auth/providers/:id/deactivate
router.patch(
  '/providers/:id/deactivate',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const user = await findManagedAccount(req.params.id, res);

      if (!user) return;

      user.accountActive = false;
      user.isArchived = false;
      await user.save();

      return res.json({
        message: 'Account deactivated. The user can still log in and appeal.',
        user: safeAccount(user),
      });
    } catch (error) {
      console.error('Deactivate account error:', error);

      return res.status(500).json({
        message: 'Could not deactivate account.',
      });
    }
  }
);

// PATCH /api/auth/providers/:id/reactivate
router.patch(
  '/providers/:id/reactivate',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const user = await findManagedAccount(req.params.id, res);

      if (!user) return;

      if (user.isArchived === true) {
        return res.status(400).json({
          message: 'Restore the archived account before reactivating it.',
        });
      }

      user.accountActive = true;
      await user.save();

      return res.json({
        message: 'Account reactivated successfully.',
        user: safeAccount(user),
      });
    } catch (error) {
      console.error('Reactivate account error:', error);

      return res.status(500).json({
        message: 'Could not reactivate account.',
      });
    }
  }
);

// PATCH /api/auth/providers/:id/archive
router.patch(
  '/providers/:id/archive',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const user = await findManagedAccount(req.params.id, res);

      if (!user) return;

      user.accountActive = false;
      user.isArchived = true;
      await user.save();

      return res.json({
        message: 'Account archived. Its history has been preserved.',
        user: safeAccount(user),
      });
    } catch (error) {
      console.error('Archive account error:', error);

      return res.status(500).json({
        message: 'Could not archive account.',
      });
    }
  }
);

// PATCH /api/auth/providers/:id/restore
router.patch(
  '/providers/:id/restore',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const user = await findManagedAccount(req.params.id, res);

      if (!user) return;

      user.isArchived = false;
      user.accountActive = false;
      await user.save();

      return res.json({
        message: 'Account restored from archive but remains deactivated.',
        user: safeAccount(user),
      });
    } catch (error) {
      console.error('Restore account error:', error);

      return res.status(500).json({
        message: 'Could not restore account.',
      });
    }
  }
);

export default router;
