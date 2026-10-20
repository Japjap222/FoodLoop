import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';

import FoodListing from './models/FoodListing.js';
import Reservation from './models/Reservation.js';
import User from './models/User.js';

dotenv.config();
connectDB();

const app = express();

// Updated CORS: Include live Vercel frontend domain alongside localhost and Render
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://foodloop-cbo9.onrender.com', // Render live deployment
  'https://food-loop-5ged.vercel.app',  // Live Vercel Frontend
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Root / Health-check route for Render health checks
app.get('/', (req, res) => {
  res.send('FoodLoop API is running...');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/reservations', reservationRoutes);

// Dynamic Dashboard Stats Endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const availableCount = await FoodListing.countDocuments({ status: 'Available' });
    const reservationCount = await Reservation.countDocuments();
    const providerCount = await User.countDocuments({ role: { $in: ['Donor', 'Admin'] } });
    
    const completedReservations = await Reservation.find({ status: { $in: ['Picked up', 'Completed', 'Ready'] } });
    const totalRedistributed = completedReservations.reduce(
      (sum, item) => sum + (item.quantityReserved || item.quantityClaimed || 1), 
      0
    );

    res.json({
      availableCount,
      reservationCount,
      providerCount,
      totalRedistributed
    });
  } catch (error) {
    console.error('Error fetching live stats:', error);
    res.status(500).json({ message: 'Error calculating dashboard stats' });
  }
});

// Dynamic Reports & Analytics Endpoint
app.get('/api/reports', async (req, res) => {
  try {
    const reservations = await Reservation.find();
    const mealsRescued = reservations.reduce(
      (sum, item) => sum + (Number(item.quantityReserved || item.quantityClaimed) || 1),
      0
    );

    const totalWeightKg = Math.round(mealsRescued * 0.4);
    const estimatedValueSaved = mealsRescued * 50;

    const activePartners = await User.countDocuments({ role: { $in: ['Donor', 'Admin'] } });

    const categoryCounts = await FoodListing.aggregate([
      { $group: { _id: '$category', totalQuantity: { $sum: '$quantity' } } }
    ]);

    const totalListingUnits = categoryCounts.reduce((sum, c) => sum + c.totalQuantity, 0) || 1;

    const defaultCategories = ['Cooked Meals', 'Bakery', 'Produce', 'Pantry'];
    const categoryBreakdown = defaultCategories.map((cat) => {
      const match = categoryCounts.find(
        (c) => c._id === cat || (cat === 'Bakery' && c._id === 'Bakery & Pastries') || (cat === 'Cooked Meals' && c._id === 'Meals')
      );
      const qty = match ? match.totalQuantity : 0;
      const percentage = Math.round((qty / totalListingUnits) * 100);
      return { category: cat, percentage, totalQuantity: qty };
    });

    res.json({
      mealsRescued,
      totalWeightKg,
      estimatedValueSaved,
      activePartners,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ message: 'Error generating report analytics' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));