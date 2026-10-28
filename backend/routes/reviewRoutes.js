import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Reservation from '../models/Reservation.js';
import FoodListing from '../models/FoodListing.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// SUBMIT A REVIEW
// Only the recipient who owns an eligible
// reservation can review it.
// ==========================================
router.post('/', protect, async (req, res) => {
  try {
    const account = req.dbUser || req.user;

    if (account.isArchived === true || account.accountActive === false) {
      return res.status(403).json({
        message: 'Your account cannot submit reviews right now.',
      });
    }

    if (req.user.role !== 'Recipient') {
      return res.status(403).json({
        message: 'Only recipients can submit reviews.',
      });
    }

    const { reservationId, rating, comment = '' } = req.body;

    if (
      !reservationId ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        message: 'A valid reservation ID is required.',
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: 'Rating must be a whole number from 1 to 5.',
      });
    }

    if (typeof comment !== 'string' || comment.trim().length > 1000) {
      return res.status(400).json({
        message: 'Your comment must be 1000 characters or fewer.',
      });
    }

    const reservation = await Reservation.findById(reservationId)
      .populate('listing');

    if (!reservation) {
      return res.status(404).json({
        message: 'Reservation not found.',
      });
    }

    if (String(reservation.recipient) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'You can only review your own reservations.',
      });
    }

    if (!['Picked up', 'Completed'].includes(reservation.status)) {
      return res.status(400).json({
        message: 'You can review food only after it has been picked up or completed.',
      });
    }

    if (!reservation.listing) {
      return res.status(404).json({
        message: 'The food listing for this reservation was not found.',
      });
    }

    const donorId = reservation.listing.donor;

    if (!donorId) {
      return res.status(400).json({
        message: 'The donor for this listing could not be identified.',
      });
    }

    const existingReview = await Review.findOne({
      reservation: reservation._id,
    });

    if (existingReview) {
      return res.status(409).json({
        message: 'You have already reviewed this reservation.',
      });
    }

    const review = await Review.create({
      reservation: reservation._id,
      recipient: req.user.id,
      donor: donorId,
      rating: numericRating,
      comment: comment.trim(),
    });

    const populatedReview = await Review.findById(review._id)
      .populate('recipient', 'name organization')
      .populate('donor', 'name organization')
      .populate('reservation', 'reservationDate reservationTime status');

    return res.status(201).json({
      message: 'Review submitted successfully.',
      review: populatedReview,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You have already reviewed this reservation.',
      });
    }

    console.error('Submit review error:', error);

    return res.status(500).json({
      message: 'Failed to submit review.',
      error: error.message,
    });
  }
});

// ==========================================
// GET REVIEWS FOR A DONOR
// Publicly readable.
// ==========================================
router.get('/donor/:donorId', async (req, res) => {
  try {
    const { donorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      return res.status(400).json({
        message: 'Invalid donor ID.',
      });
    }

    const donorListings = await FoodListing.find({
      donor: donorId,
    }).select('_id');

    const listingIds = donorListings.map((listing) => listing._id);

    const reviews = await Review.find({
      $or: [
        { donor: donorId },
        {
          reservation: {
            $in: await Reservation.find({
              listing: { $in: listingIds },
            }).distinct('_id'),
          },
        },
      ],
    })
      .populate('recipient', 'name organization')
      .sort({ createdAt: -1 });

    const ratingSummary = await Review.aggregate([
      {
        $match: {
          donor: new mongoose.Types.ObjectId(donorId),
        },
      },
      {
        $group: {
          _id: '$donor',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const summary = ratingSummary[0] || {
      averageRating: 0,
      reviewCount: 0,
    };

    return res.json({
      averageRating: Number(summary.averageRating.toFixed(1)),
      reviewCount: summary.reviewCount,
      reviews,
    });
  } catch (error) {
    console.error('Fetch donor reviews error:', error);

    return res.status(500).json({
      message: 'Failed to fetch donor reviews.',
      error: error.message,
    });
  }
});

// Handler function for fetching user reviews
const getMyReviewsHandler = async (req, res) => {
  try {
    if (req.user.role !== 'Recipient') {
      return res.status(403).json({
        message: 'Only recipients can view their reviews.',
      });
    }

    const reviews = await Review.find({
      recipient: req.user.id,
    })
      .populate('donor', 'name organization')
      .populate('reservation', 'reservationDate reservationTime status')
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch (error) {
    console.error('Fetch my reviews error:', error);

    return res.status(500).json({
      message: 'Failed to fetch your reviews.',
      error: error.message,
    });
  }
};

// ==========================================
// GET REVIEWS WRITTEN BY THE LOGGED-IN RECIPIENT
// ==========================================
router.get('/mine', protect, getMyReviewsHandler);
router.get('/my', protect, getMyReviewsHandler);
router.get('/user', protect, getMyReviewsHandler);

export default router;
