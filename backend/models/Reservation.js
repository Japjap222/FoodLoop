// backend/models/Reservation.js
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  listing: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'FoodListing', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  recipientName: { 
    type: String, 
    required: true 
  },
  quantityReserved: { 
    type: Number, 
    required: true, 
    default: 1 
  },
  status: { 
    type: String, 
    enum: ['Reserved', 'Ready', 'Picked up', 'Cancelled', 'Completed'], 
    default: 'Reserved' 
  },
  reservedAtTime: { 
    type: String, 
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
  }
}, { timestamps: true });

export default mongoose.model('Reservation', reservationSchema);