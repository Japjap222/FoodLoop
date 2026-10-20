// backend/routes/reservationRoutes.js
import express from 'express';
import Reservation from '../models/Reservation.js';
import FoodListing from '../models/FoodListing.js';

const router = express.Router();

// Get all reservations (Populates linked FoodListing document)
router.get('/', async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('listing')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new reservation & decrement listing quantity
router.post('/', async (req, res) => {
  try {
    const {
      listingId,
      recipientId,
      recipientName,
      quantityReserved,
      quantityClaimed,
      status
    } = req.body;

    const reservationData = {
      listing: listingId,
      recipientName: recipientName || 'Community Recipient',
      quantityReserved: Number(quantityReserved || quantityClaimed || 1),
      status: status || 'Reserved'
    };

    if (recipientId) {
      reservationData.recipient = recipientId;
    }

    const reservation = new Reservation(reservationData);
    await reservation.save();

    // Decrement inventory in MongoDB
    const listing = await FoodListing.findById(listingId);
    if (listing) {
      const newQty = Math.max(
        0,
        listing.quantity - reservationData.quantityReserved
      );
      listing.quantity = newQty;
      if (newQty === 0) {
        listing.status = 'Reserved';
      }
      await listing.save();
    }

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error saving reservation:', error);
    res.status(400).json({ message: error.message });
  }
});

// PATCH: Update reservation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('listing');

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(400).json({ message: error.message });
  }
});

export default router;