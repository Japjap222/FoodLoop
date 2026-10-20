// backend/routes/listingRoutes.js
import express from 'express';
import FoodListing from '../models/FoodListing.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET all active listings (Public access for recipients/visitors)
router.get('/', async (req, res) => {
  try {
    const listings = await FoodListing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a new listing (Protected: Donors & Admins only)
router.post('/', protect, authorize('Donor', 'Admin'), async (req, res) => {
  try {
    const listing = new FoodListing({
      title: req.body.title,
      category: req.body.category || 'Cooked Meals',
      quantity: Number(req.body.quantity) || 1,
      unit: req.body.unit || 'servings',
      pickupLocation: req.body.pickupLocation,
      status: req.body.status || 'Available',
      providerName: req.body.providerName || req.user?.name,
      donor: req.user?.id || req.body.donor
    });

    const savedListing = await listing.save();
    res.status(201).json(savedListing);
  } catch (err) {
    console.error('Save listing error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// DELETE a listing by ID (Protected: Donors & Admins only)
router.delete('/:id', protect, authorize('Donor', 'Admin'), async (req, res) => {
  try {
    await FoodListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;