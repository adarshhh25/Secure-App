import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { protectRoute } from "../middlewares/auth.js";
import {
  checkStegoHealth,
  encodeTextInImage,
  decodeTextFromImage,
  encodeImageInImage,
  decodeImageFromImage,
  encodeAudio,
  decodeAudio,
  checkCapacity
} from "../controllers/stegoController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp directory exists
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const stegoRouter = express.Router();

// Health check (public)
stegoRouter.get("/health", checkStegoHealth);

// Encode routes (protected)
stegoRouter.post("/encode/text-image", protectRoute, upload.single('image'), encodeTextInImage);
stegoRouter.post("/encode/image-image", protectRoute, upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'secret_image', maxCount: 1 }]), encodeImageInImage);
stegoRouter.post("/encode/audio", protectRoute, upload.single('audio'), encodeAudio);

// Decode routes (protected)
// Note: These accept JSON with file URL, so they don't need file upload middleware normally.
// BUT if they accept direct file upload (not implemented in controller currently, controller implementation expects URL), then no multer.
// Controller `decodeTextFromImage` expects `imageUrl` in body.
stegoRouter.post("/decode/text-image", protectRoute, decodeTextFromImage);
stegoRouter.post("/decode/image-image", protectRoute, decodeImageFromImage);
stegoRouter.post("/decode/audio", protectRoute, decodeAudio);

// Capacity check (protected)
stegoRouter.post("/capacity", protectRoute, upload.single('image'), checkCapacity);

export default stegoRouter;
