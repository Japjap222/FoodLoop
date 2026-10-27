
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import appealRoutes from './routes/appealRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

import FoodListing from './models/FoodListing.js';
import Reservation from './models/Reservation.js';
import User from './models/User.js';

dotenv.config();

connectDB();

const app = express();

// Allowed frontend origins for local development and deployment.
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'https://foodloop-cbo9.onrender.com',
  'https://food-loop-5ged.vercel.app',
  'https://food-loop-ht0d.onrender.com',
  'https://foodloopph.vercel.app',
  'https://foodloop-f2u8ph5w3-food-loop1.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS configuration.
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header, such as curl.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parse JSON request bodies.
app.use(express.json());

// Root health-check endpoint.
app.get('/', (req, res) => {
  res.send('FoodLoop API is running...');
});

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/reviews', reviewRoutes);

// ==========================================
// DASHBOARD STATISTICS
// GET /api/stats
// ==========================================

app.get('/api/stats', async (req, res) => {
  try {
    const availableCount = await FoodListing.countDocuments({
      status: 'Available',
    });

    const reservationCount = await Reservation.countDocuments();

    // Count only active, non-archived providers.
    const providerCount = await User.countDocuments({
      role: 'Donor',
      accountActive: { $ne: false },
      isArchived: { $ne: true },
    });

    const completedReservations = await Reservation.find({
      status: {
        $in: ['Picked up', 'Completed', 'Ready'],
      },
    });

    const totalRedistributed = completedReservations.reduce(
      (sum, item) =>
        sum + (item.quantityReserved || item.quantityClaimed || 1),
      0
    );

    return res.json({
      availableCount,
      reservationCount,
      providerCount,
      totalRedistributed,
    });
  } catch (error) {
    console.error('Error fetching live stats:', error);

    return res.status(500).json({
      message: 'Error calculating dashboard stats.',
    });
  }
});

// ==========================================
// REPORTS AND ANALYTICS
// GET /api/reports
// ==========================================

app.get('/api/reports', async (req, res) => {
  try {
    const reservations = await Reservation.find();

    const mealsRescued = reservations.reduce(
      (sum, item) =>
        sum +
        (Number(item.quantityReserved || item.quantityClaimed) || 1),
      0
    );

    const totalWeightKg = Math.round(mealsRescued * 0.4);
    const estimatedValueSaved = mealsRescued * 50;

    // Count only active, non-archived Donor accounts.
    const activePartners = await User.countDocuments({
      role: 'Donor',
      accountActive: { $ne: false },
      isArchived: { $ne: true },
    });

    const categoryCounts = await FoodListing.aggregate([
      {
        $group: {
          _id: '$category',
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const totalListingUnits =
      categoryCounts.reduce(
        (sum, category) => sum + category.totalQuantity,
        0
      ) || 1;

    const defaultCategories = [
      'Cooked Meals',
      'Bakery',
      'Produce',
      'Pantry',
    ];

    const categoryBreakdown = defaultCategories.map((category) => {
      const match = categoryCounts.find(
        (item) =>
          item._id === category ||
          (category === 'Bakery' &&
            item._id === 'Bakery & Pastries') ||
          (category === 'Cooked Meals' &&
            item._id === 'Meals')
      );

      const quantity = match ? match.totalQuantity : 0;

      const percentage = Math.round(
        (quantity / totalListingUnits) * 100
      );

      return {
        category,
        percentage,
        totalQuantity: quantity,
      };
    });

    return res.json({
      mealsRescued,
      totalWeightKg,
      estimatedValueSaved,
      activePartners,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);

    return res.status(500).json({
      message: 'Error generating report analytics.',
    });
  }
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'This frontend origin is not allowed by CORS.',
    });
  }

  console.error('Unhandled server error:', error);

  return res.status(500).json({
    message: 'An unexpected server error occurred.',
  });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
