
import mongoose from 'mongoose';

const dailyAvailabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ]
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    startTime: {
      type: String,
      default: '09:00',
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },

    endTime: {
      type: String,
      default: '17:00',
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    }
  },
  { _id: false }
);

const foodListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      default: 'Cooked Meals'
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },

    unit: {
      type: String,
      default: 'servings'
    },

    pickupLocation: {
      type: String,
      required: true
    },

    expirationDate: {
      type: Date,
      required: true
    },

    // Pickup hours configured for this specific food listing.
    pickupSchedule: {
      type: [dailyAvailabilitySchema],
      default: () => [
        { day: 'Monday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Thursday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Friday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Saturday', isAvailable: true, startTime: '09:00', endTime: '17:00' },
        { day: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
      ]
    },

    status: {
      type: String,
      default: 'Available'
    },

    providerName: {
      type: String
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('FoodListing', foodListingSchema);
