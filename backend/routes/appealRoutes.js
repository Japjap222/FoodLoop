import express from 'express';
import mongoose from 'mongoose';
import Appeal from '../models/Appeal.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/appeals
// Restricted users may still submit appeals.
router.post('/', protect, async (req, res) => {
  try {
    if (!['Donor', 'Recipient'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Only Donors and Recipients can submit appeals.',
      });
    }

    const reason =
      typeof req.body.reason === 'string'
        ? req.body.reason.trim()
        : '';

    if (!reason) {
      return res.status(400).json({
        message: 'Please provide a reason for your appeal.',
      });
    }

    if (reason.length > 2000) {
      return res.status(400).json({
        message: 'Your appeal cannot exceed 2000 characters.',
      });
    }

    // Prevent multiple pending appeals for the same account.
    const pendingAppeal = await Appeal.findOne({
      user: req.user.id,
      status: 'Pending',
    });

    if (pendingAppeal) {
      return res.status(409).json({
        message: 'You already have a pending appeal.',
        appeal: pendingAppeal,
      });
    }

    const appeal = await Appeal.create({
      user: req.user.id,
      reason,
    });

    const result = await Appeal.findById(appeal._id)
      .populate('user', 'name email role organization');

    return res.status(201).json({
      message: 'Your appeal has been submitted to the Admin.',
      appeal: result,
    });
  } catch (error) {
    console.error('Submit appeal error:', error);
    return res.status(500).json({
      message: 'Could not submit your appeal.',
    });
  }
});

// Handler for fetching logged-in user's appeals
const getMyAppealsHandler = async (req, res) => {
  try {
    const appeals = await Appeal.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    return res.json(appeals);
  } catch (error) {
    console.error('Fetch my appeals error:', error);
    return res.status(500).json({
      message: 'Could not load your appeals.',
    });
  }
};

// GET /api/appeals/mine, /api/appeals/my, and /api/appeals/user
// Users can see their own appeal history, even when restricted.
router.get('/mine', protect, getMyAppealsHandler);
router.get('/my', protect, getMyAppealsHandler);
router.get('/user', protect, getMyAppealsHandler);

// GET /api/appeals
// Only Admins can view all submitted appeals.
router.get('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const appeals = await Appeal.find()
      .populate('user', 'name email role organization accountActive isArchived')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json(appeals);
  } catch (error) {
    console.error('Fetch all appeals error:', error);
    return res.status(500).json({
      message: 'Could not load appeals.',
    });
  }
});

// PATCH /api/appeals/:id/review
// Admin approves or rejects an appeal.
router.patch(
  '/:id/review',
  protect,
  authorize('Admin'),
  async (req, res) => {
    try {
      const { status, adminResponse = '' } = req.body;

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid appeal ID.',
        });
      }

      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({
          message: 'Choose Approved or Rejected.',
        });
      }

      if (
        typeof adminResponse !== 'string' ||
        adminResponse.length > 2000
      ) {
        return res.status(400).json({
          message: 'The Admin response cannot exceed 2000 characters.',
        });
      }

      const appeal = await Appeal.findById(req.params.id);

      if (!appeal) {
        return res.status(404).json({
          message: 'Appeal not found.',
        });
      }

      if (appeal.status !== 'Pending') {
        return res.status(409).json({
          message: `This appeal has already been ${appeal.status.toLowerCase()}.`,
        });
      }

      const user = await User.findById(appeal.user);

      if (!user) {
        return res.status(404).json({
          message: 'The account associated with this appeal was not found.',
        });
      }

      appeal.status = status;
      appeal.adminResponse = adminResponse.trim();
      appeal.reviewedBy = req.user.id;
      appeal.reviewedAt = new Date();

      // An approved appeal removes restrictions and archive status.
      // A rejected appeal leaves the account status unchanged.
      if (status === 'Approved') {
        user.accountActive = true;
        user.isArchived = false;
        await user.save();
      }

      await appeal.save();

      const result = await Appeal.findById(appeal._id)
        .populate('user', 'name email role organization accountActive isArchived')
        .populate('reviewedBy', 'name email');

      return res.json({
        message:
          status === 'Approved'
            ? 'Appeal approved. The account is active again.'
            : 'Appeal rejected. The account restrictions remain unchanged.',
        appeal: result,
      });
    } catch (error) {
      console.error('Review appeal error:', error);
      return res.status(500).json({
        message: 'Could not review the appeal.',
      });
    }
  }
);

export default router;
