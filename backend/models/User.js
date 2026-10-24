
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['Donor', 'Recipient', 'Admin'],
      default: 'Recipient',
    },

    organization: {
      type: String,
      default: '',
      trim: true,
    },

    // New registrations must verify their email before logging in.
    // Existing accounts without this field remain compatible.
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Temporary OTP data. Never return these fields to the frontend.
    emailOtpHash: {
      type: String,
      select: false,
    },

    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    emailOtpLastSentAt: {
      type: Date,
      select: false,
    },

    isApproved: {
      type: Boolean,
      default: true,
    },

    // Restricted users can still log in and submit appeals.
    accountActive: {
      type: Boolean,
      default: true,
    },

    // Archived accounts are hidden from normal active account lists.
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User || mongoose.model('User', userSchema);

export default User;
