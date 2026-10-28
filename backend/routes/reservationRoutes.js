import express from 'express';
import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import FoodListing from '../models/FoodListing.js';
import {
  protect,
  donorOnly,
  requireActiveAccount,
} from '../middleware/authMiddleware.js';

const router = express.Router();

const MAX_ITEMS_PER_PERSON = 3;
const RESERVATION_WINDOW_MS = 60 * 60 * 1000;

// Use the server's local calendar date and time.
const getLocalDateTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
};

// Get all reservations for donors/admins.
// Restricted donors can still view their reservation history.
router.get('/', protect, donorOnly, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'Donor') {
      const donorListings = await FoodListing.find({
        donor: req.user.id,
      }).select('_id');

      query.listing = {
        $in: donorListings.map((item) => item._id),
      };
    }

    const reservations = await Reservation.find(query)
      .populate('listing')
      .populate('recipient', 'name email organization')
      .sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (error) {
    console.error('Fetch reservations error:', error);
    return res.status(500).json({
      message: 'Failed to fetch reservations.',
      error: error.message,
    });
  }
});

// Handler function for fetching recipient reservations
const getRecipientReservationsHandler = async (req, res) => {
  try {
    if (req.user.role !== 'Recipient') {
      return res.status(403).json({
        message: 'Only recipients can view this reservation list.',
      });
    }

    const reservations = await Reservation.find({
      recipient: req.user.id,
    })
      .populate('listing')
      .populate('recipient', 'name email organization')
      .sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (error) {
    console.error('Fetch recipient reservations error:', error);
    return res.status(500).json({
      message: 'Failed to fetch your reservations.',
      error: error.message,
    });
  }
};

// Get the logged-in recipient's reservations.
// Restricted recipients can still view their history and appeal.
router.get('/mine', protect, getRecipientReservationsHandler);
router.get('/my', protect, getRecipientReservationsHandler);
router.get('/user', protect, getRecipientReservationsHandler);

// Get reservations belonging to the logged-in donor/admin.
router.get('/donor', protect, donorOnly, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'Donor') {
      const donorListings = await FoodListing.find({
        donor: req.user.id,
      }).select('_id');

      query.listing = {
        $in: donorListings.map((item) => item._id),
      };
    }

    const reservations = await Reservation.find(query)
      .populate('listing')
      .populate('recipient', 'name email organization')
      .sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (error) {
    console.error('Fetch donor reservations error:', error);
    return res.status(500).json({
      message: 'Failed to fetch donor reservations.',
      error: error.message,
    });
  }
});

// Create reservation.
// Check account restrictions before checking the role.
router.post('/', protect, async (req, res) => {
  let listing = null;
  let quantityReserved = 0;
  let stockUpdated = false;

  try {
    const account = req.dbUser || req.user;

    // Archived accounts receive a specific message.
    if (account.isArchived === true) {
      return res.status(403).json({
        code: 'ACCOUNT_ARCHIVED',
        message:
          'Your account has been archived. You cannot reserve food right now. Please submit an appeal to request restoration.',
      });
    }

    // Deactivated accounts receive a specific message.
    if (account.accountActive === false) {
      return res.status(403).json({
        code: 'ACCOUNT_DEACTIVATED',
        message:
          'Your account has been deactivated. You cannot reserve food right now. Please submit an appeal to request reactivation.',
      });
    }

    if (req.user.role !== 'Recipient') {
      return res.status(403).json({
        code: 'RECIPIENTS_ONLY',
        message: 'Only recipients can reserve food.',
      });
    }

    const {
      listingId,
      quantityReserved: requestedQuantity,
      quantityClaimed,
      reservationDate,
      reservationTime,
    } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        message: 'Invalid food listing ID.',
      });
    }

    if (!reservationDate || !reservationTime) {
      return res.status(400).json({
        message: 'Reservation date and pickup time are required.',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
      return res.status(400).json({
        message: 'Invalid reservation date format.',
      });
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reservationTime)) {
      return res.status(400).json({
        message: 'Invalid reservation time format.',
      });
    }

    const selectedDateTime = new Date(
      `${reservationDate}T${reservationTime}:00`
    );

    if (Number.isNaN(selectedDateTime.getTime())) {
      return res.status(400).json({
        message: 'Invalid reservation date or time.',
      });
    }

    const now = new Date();
    const current = getLocalDateTime(now);

    if (reservationDate < current.date) {
      return res.status(400).json({
        message: 'Please choose today or a future date.',
      });
    }

    if (
      reservationDate === current.date &&
      reservationTime <= current.time
    ) {
      return res.status(400).json({
        message:
          'That pickup time has already passed. Please choose a later time today.',
      });
    }

    const recipientId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(401).json({
        message: 'Invalid user identity. Please log in again.',
      });
    }

    quantityReserved = Number(
      requestedQuantity ?? quantityClaimed ?? 1
    );

    if (
      !Number.isInteger(quantityReserved) ||
      quantityReserved < 1 ||
      quantityReserved > MAX_ITEMS_PER_PERSON
    ) {
      return res.status(400).json({
        message: 'You can reserve a maximum of 3 items.',
      });
    }

    const personId = new mongoose.Types.ObjectId(recipientId);
    const listingObjectId = new mongoose.Types.ObjectId(listingId);

    const windowStart = new Date(
      now.getTime() - RESERVATION_WINDOW_MS
    );

    const recentReservations = await Reservation.find({
      recipient: personId,
      createdAt: { $gte: windowStart },
    })
      .select('quantityReserved createdAt')
      .sort({ createdAt: 1 });

    const alreadyReserved = recentReservations.reduce(
      (total, reservation) =>
        total + Number(reservation.quantityReserved || 0),
      0
    );

    if (alreadyReserved + quantityReserved > MAX_ITEMS_PER_PERSON) {
      const oldestReservation = recentReservations[0];

      const nextAvailableAt = oldestReservation
        ? new Date(
            oldestReservation.createdAt.getTime() +
              RESERVATION_WINDOW_MS
          )
        : new Date(now.getTime() + RESERVATION_WINDOW_MS);

      const waitMinutes = Math.max(
        1,
        Math.ceil(
          (nextAvailableAt.getTime() - now.getTime()) / 60000
        )
      );

      return res.status(429).json({
        message: `You have used ${alreadyReserved} of your 3 food items for this hour. You can reserve again in about ${waitMinutes} minute(s).`,
        itemsReserved: alreadyReserved,
        remainingAllowance: Math.max(
          0,
          MAX_ITEMS_PER_PERSON - alreadyReserved
        ),
        nextAvailableAt,
      });
    }

    const duplicate = await Reservation.findOne({
      recipient: personId,
      listing: listingObjectId,
      createdAt: { $gte: windowStart },
    }).sort({ createdAt: -1 });

    if (duplicate) {
      const nextAvailableAt = new Date(
        duplicate.createdAt.getTime() + RESERVATION_WINDOW_MS
      );

      const waitMinutes = Math.max(
        1,
        Math.ceil(
          (nextAvailableAt.getTime() - now.getTime()) / 60000
        )
      );

      return res.status(429).json({
        message: `You have already reserved this food. You can reserve it again in about ${waitMinutes} minute(s).`,
        nextAvailableAt,
        itemsReserved: alreadyReserved,
        remainingAllowance: Math.max(
          0,
          MAX_ITEMS_PER_PERSON - alreadyReserved
        ),
      });
    }

    const existingListing = await FoodListing.findById(
      listingObjectId
    );

    if (!existingListing) {
      return res.status(404).json({
        message: 'Food listing not found.',
      });
    }

    if (
      existingListing.expirationDate &&
      new Date(existingListing.expirationDate) <= now
    ) {
      return res.status(400).json({
        message: 'This food listing has expired.',
      });
    }

    if (
      existingListing.expirationDate &&
      selectedDateTime.getTime() >
        new Date(existingListing.expirationDate).getTime()
    ) {
      return res.status(400).json({
        message:
          'The selected pickup time is after the food expiration time.',
      });
    }

    // Validate the donor's weekly pickup schedule.
    if (
      Array.isArray(existingListing.pickupSchedule) &&
      existingListing.pickupSchedule.length > 0
    ) {
      const weekday = selectedDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      const scheduleForDay = existingListing.pickupSchedule.find(
        (day) => day.day === weekday
      );

      if (!scheduleForDay || !scheduleForDay.isAvailable) {
        return res.status(400).json({
          message: `Pickup is not available on ${weekday}. Please choose another date.`,
        });
      }

      if (
        reservationTime < scheduleForDay.startTime ||
        reservationTime > scheduleForDay.endTime
      ) {
        return res.status(400).json({
          message: `Pickup time must be between ${scheduleForDay.startTime} and ${scheduleForDay.endTime} on ${weekday}.`,
        });
      }
    }

    // Deduct stock only when the listing is still available.
    listing = await FoodListing.findOneAndUpdate(
      {
        _id: listingObjectId,
        status: 'Available',
        quantity: { $gte: quantityReserved },
        expirationDate: { $gt: now },
      },
      {
        $inc: { quantity: -quantityReserved },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!listing) {
      const currentListing = await FoodListing.findById(
        listingObjectId
      );

      if (!currentListing) {
        return res.status(404).json({
          message: 'Food listing not found.',
        });
      }

      if (
        currentListing.expirationDate &&
        new Date(currentListing.expirationDate) <= now
      ) {
        return res.status(400).json({
          message: 'This food listing has expired.',
        });
      }

      if (currentListing.status !== 'Available') {
        return res.status(400).json({
          message: 'This food listing is no longer available.',
        });
      }

      return res.status(400).json({
        message: `Not enough stock. Only ${currentListing.quantity} item(s) remain.`,
      });
    }

    stockUpdated = true;

    if (Number(listing.quantity) === 0) {
      await FoodListing.updateOne(
        { _id: listing._id, quantity: 0 },
        { $set: { status: 'Reserved' } }
      );
    }

    const reservation = await Reservation.create({
      listing: listing._id,
      recipient: personId,
      recipientName: req.user.name || 'Community Recipient',
      quantityReserved,
      reservationDate,
      reservationTime,
      status: 'Reserved',
    });

    const result = await Reservation.findById(reservation._id)
      .populate('listing')
      .populate('recipient', 'name email organization');

    return res.status(201).json({
      message: 'Reservation created successfully.',
      reservation: result,
      itemsReserved: alreadyReserved + quantityReserved,
      remainingAllowance:
        MAX_ITEMS_PER_PERSON - alreadyReserved - quantityReserved,
    });
  } catch (error) {
    console.error('Create reservation error:', error);

    if (stockUpdated && listing) {
      try {
        await FoodListing.updateOne(
          { _id: listing._id },
          {
            $inc: { quantity: quantityReserved },
            $set: {
              status:
                Number(listing.quantity) + quantityReserved > 0
                  ? 'Available'
                  : listing.status,
            },
          }
        );
      } catch (rollbackError) {
        console.error(
          'Failed to restore listing stock:',
          rollbackError
        );
      }
    }

    return res.status(500).json({
      message: 'Could not complete the reservation.',
      error: error.message,
    });
  }
});

// Update reservation status.
// Restricted donors cannot manage reservations, but Admins can.
router.patch(
  '/:id/status',
  protect,
  donorOnly,
  requireActiveAccount,
  async (req, res) => {
    try {
      const allowedStatuses = [
        'Reserved',
        'Ready',
        'Picked up',
        'Cancelled',
        'Completed',
      ];

      const { status } = req.body;

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid reservation status.',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid reservation ID.',
        });
      }

      const reservation = await Reservation.findById(
        req.params.id
      ).populate('listing');

      if (!reservation) {
        return res.status(404).json({
          message: 'Reservation not found.',
        });
      }

      if (!reservation.listing) {
        return res.status(404).json({
          message:
            'Food listing connected to this reservation was not found.',
        });
      }

      const isAdmin = req.user.role === 'Admin';
      const listingOwnerId = reservation.listing.donor
        ? reservation.listing.donor.toString()
        : null;

      if (!isAdmin && listingOwnerId !== String(req.user.id)) {
        return res.status(403).json({
          message:
            'Access denied. You can only manage reservations for your own food listings.',
        });
      }

      reservation.status = status;
      await reservation.save();

      const updatedReservation = await Reservation.findById(
        reservation._id
      )
        .populate('listing')
        .populate('recipient', 'name email organization');

      return res.json(updatedReservation);
    } catch (error) {
      console.error('Update reservation status error:', error);
      return res.status(500).json({
        message: 'Failed to update reservation status.',
        error: error.message,
      });
    }
  }
);

export default router;
