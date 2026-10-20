// backend/models/FoodListing.js
import mongoose from 'mongoose';

const foodListingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Cooked Meals' },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'servings' },
  pickupLocation: { type: String, required: true },
  status: { type: String, default: 'Available' },
  providerName: { type: String },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('FoodListing', foodListingSchema);