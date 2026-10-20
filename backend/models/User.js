import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Donor', 'Recipient', 'Admin'], 
    default: 'Recipient' 
  },
  organization: { type: String, default: '' },
  isApproved: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('User', userSchema);