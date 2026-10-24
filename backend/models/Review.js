
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      unique: true,
      index: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number from 1 to 5.',
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ donor: 1, createdAt: -1 });

const Review =
  mongoose.models.Review ||
  mongoose.model('Review', reviewSchema);

export default Review;
