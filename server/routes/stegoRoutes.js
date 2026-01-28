import express from 'express';
import multer from 'multer';
import stegoController from '../controllers/stegoController.js';
import { protectRoute } from '../middlewares/auth.js';

const router = express.Router();

// Configure multer for image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// OTP Routes
router.post('/request-send-otp', protectRoute, stegoController.requestSendOtp);
router.post('/verify-send-otp', protectRoute, upload.single('coverImage'), stegoController.verifySendOtp);

// Decode OTP Routes
router.post('/request-decode-otp', protectRoute, stegoController.requestDecodeOtp);
router.post('/verify-decode-otp', protectRoute, upload.single('stegoImage'), stegoController.verifyDecodeOtp);

export default router;