import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otpHash: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['SEND', 'DECODE'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash OTP before saving
otpSchema.pre('save', async function(next) {
  if (!this.isModified('otpHash')) return next();
  this.otpHash = await bcrypt.hash(this.otpHash, 12);
  next();
});

// Compare OTP method
otpSchema.methods.compareOtp = async function(candidateOtp) {
  return await bcrypt.compare(candidateOtp, this.otpHash);
};

export default mongoose.model('Otp', otpSchema);