
import express from 'express';
import mongoose from 'mongoose';
import FoodListing from '../models/FoodListing.js';
import {
  protect,
  authorize,
  requireActiveAccount,
} from '../middleware/authMiddleware.js';

const router = express.Router();

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday',
];

const DEFAULT_PICKUP_SCHEDULE = DAYS_OF_WEEK.map((day) => ({
  day,
  isAvailable: day !== 'Sunday',
  startTime: '09:00',
  endTime: '17:00',
}));

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const validatePickupSchedule = (schedule) => {
  if (!Array.isArray(schedule) || schedule.length !== 7) {
    return 'Pickup schedule must include all seven days of the week.';
  }

  const seen = new Set();

  for (const entry of schedule) {
    if (!entry || !DAYS_OF_WEEK.includes(entry.day)) {
      return 'Pickup schedule contains an invalid day.';
    }

    if (seen.has(entry.day)) {
      return `Duplicate schedule entry for ${entry.day}.`;
    }
    seen.add(entry.day);

    if (typeof entry.isAvailable !== 'boolean') {
      return `Choose whether ${entry.day} is open or closed.`;
    }

    if (
      typeof entry.startTime !== 'string' ||
      !TIME_REGEX.test(entry.startTime) ||
      typeof entry.endTime !== 'string' ||
      !TIME_REGEX.test(entry.endTime)
    ) {
      return `Enter valid pickup hours for ${entry.day}.`;
    }

    if (entry.isAvailable && entry.startTime >= entry.endTime) {
      return `Closing time on ${entry.day} must be later than opening time.`;
    }
  }

  if (!DAYS_OF_WEEK.every((day) => seen.has(day))) {
    return 'Pickup schedule must include every day of the week.';
  }

  return null;
};

const normalizePickupSchedule = (schedule) =>
  DAYS_OF_WEEK.map((day) => {
    const entry = schedule.find((item) => item.day === day);

    return {
      day,
      isAvailable: entry.isAvailable,
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  });

const canManage = (listing, user) => {
  if (user.role === 'Admin') return true;

  const donorId = listing.donor?._id || listing.donor;
  return donorId && String(donorId) === String(user.id);
};

// GET all listings.
// Public browsing remains available to everyone.
router.get('/', async (req, res) => {
  try {
    const listings = await FoodListing.find().sort({ createdAt: -1 });
    return res.json(listings);
  } catch (error) {
    console.error('Fetch listings error:', error);
    return res.status(500).json({
      message: 'Failed to fetch food listings.',
    });
  }
});

// CREATE listing.
router.post(
  '/',
  protect,
  authorize('Donor', 'Admin'),
  requireActiveAccount,
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        quantity,
        unit,
        pickupLocation,
        expirationDate,
        pickupSchedule,
      } = req.body;

      if (
        !title?.trim() ||
        !description?.trim() ||
        !pickupLocation?.trim()
      ) {
        return res.status(400).json({
          message: 'Title, description, and pickup location are required.',
        });
      }

      const parsedQuantity = Number(quantity);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({
          message: 'Quantity must be greater than zero.',
        });
      }

      const expiry = new Date(expirationDate);

      if (
        !expirationDate ||
        Number.isNaN(expiry.getTime()) ||
        expiry <= new Date()
      ) {
        return res.status(400).json({
          message: 'Please provide a valid future expiration date and time.',
        });
      }

      const schedule = pickupSchedule ?? DEFAULT_PICKUP_SCHEDULE;
      const scheduleError = validatePickupSchedule(schedule);

      if (scheduleError) {
        return res.status(400).json({ message: scheduleError });
      }

      const listing = await FoodListing.create({
        title: title.trim(),
        description: description.trim(),
        category: category || 'Cooked Meals',
        quantity: parsedQuantity,
        unit: unit || 'servings',
        pickupLocation: pickupLocation.trim(),
        expirationDate: expiry,
        pickupSchedule: normalizePickupSchedule(schedule),
        status: 'Available',
        providerName: req.user.name,
        donor: req.user.id,
      });

      return res.status(201).json(listing);
    } catch (error) {
      console.error('Create listing error:', error);
      return res.status(400).json({ message: error.message });
    }
  }
);

// UPDATE listing: owner Donor or Admin.
router.put(
  '/:id',
  protect,
  authorize('Donor', 'Admin'),
  requireActiveAccount,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid listing ID.' });
      }

      const listing = await FoodListing.findById(req.params.id);

      if (!listing) {
        return res.status(404).json({ message: 'Food listing not found.' });
      }

      if (!canManage(listing, req.user)) {
        return res.status(403).json({
          message: 'You are not allowed to edit this listing.',
        });
      }

      const {
        title,
        description,
        category,
        quantity,
        unit,
        pickupLocation,
        expirationDate,
        pickupSchedule,
      } = req.body;

      if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
          return res.status(400).json({
            message: 'Food title cannot be empty.',
          });
        }
        listing.title = title.trim();
      }

      if (description !== undefined) {
        if (typeof description !== 'string' || !description.trim()) {
          return res.status(400).json({
            message: 'Food description cannot be empty.',
          });
        }
        listing.description = description.trim();
      }

      if (category !== undefined) listing.category = category;
      if (unit !== undefined) listing.unit = unit;

      if (pickupLocation !== undefined) {
        if (
          typeof pickupLocation !== 'string' ||
          !pickupLocation.trim()
        ) {
          return res.status(400).json({
            message: 'Pickup location cannot be empty.',
          });
        }
        listing.pickupLocation = pickupLocation.trim();
      }

      if (expirationDate !== undefined) {
        const expiry = new Date(expirationDate);

        if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
          return res.status(400).json({
            message: 'Expiration date must be a valid future date and time.',
          });
        }

        listing.expirationDate = expiry;
      }

      if (pickupSchedule !== undefined) {
        const scheduleError = validatePickupSchedule(pickupSchedule);

        if (scheduleError) {
          return res.status(400).json({ message: scheduleError });
        }

        listing.pickupSchedule = normalizePickupSchedule(pickupSchedule);
      }

      // Do not change stock for reserved or unavailable listings.
      if (quantity !== undefined) {
        if (listing.status !== 'Available') {
          return res.status(400).json({
            message:
              'Quantity cannot be changed for a reserved or unavailable listing.',
          });
        }

        const parsedQuantity = Number(quantity);

        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          return res.status(400).json({
            message: 'Quantity must be greater than zero.',
          });
        }

        listing.quantity = parsedQuantity;
      }

      const updatedListing = await listing.save();
      return res.json(updatedListing);
    } catch (error) {
      console.error('Update listing error:', error);
      return res.status(400).json({ message: error.message });
    }
  }
);

// DELETE listing: owner Donor or Admin.
router.delete(
  '/:id',
  protect,
  authorize('Donor', 'Admin'),
  requireActiveAccount,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid listing ID.' });
      }

      const listing = await FoodListing.findById(req.params.id);

      if (!listing) {
        return res.status(404).json({
          message: 'Food listing not found.',
        });
      }

      if (!canManage(listing, req.user)) {
        return res.status(403).json({
          message: 'You are not allowed to delete this listing.',
        });
      }

      await listing.deleteOne();

      return res.json({
        message: 'Listing deleted successfully.',
      });
    } catch (error) {
      console.error('Delete listing error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
);

export default router;
