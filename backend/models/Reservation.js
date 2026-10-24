
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodListing',
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    quantityReserved: {
      type: Number,
      required: true,
      min: 1,
    },

    reservationDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    reservationTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    status: {
      type: String,
      enum: [
        'Reserved',
        'Ready',
        'Picked up',
        'Cancelled',
        'Completed',
      ],
      default: 'Reserved',
    },

    reservedAtTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Reservation', reservationSchema);
