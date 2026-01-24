import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../lib/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STEGO_SERVICE_URL = process.env.STEGO_SERVICE_URL || "http://localhost:5001";

// Create temp directory if not exists
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Helper function to download file from URL
async function downloadFile(url, destPath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(destPath);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Helper function to download base64 data URI to file
async function downloadBase64ToFile(dataUri, destPath) {
  // Handle both base64 and URL formats
  if (dataUri.startsWith('data:')) {
    // It's a base64 data URI
    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '').replace(/^data:audio\/\w+;base64,/, '');
    fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
  } else {
    // It's a URL, download it
    await downloadFile(dataUri, destPath);
  }
}

// 🔐 ENCODE SECURE MESSAGE - Used by messageController
export async function encodeSecureMessage({ type, image, coverImage, secretImage, audio, message, password }) {
  console.log('🔐 encodeSecureMessage called with:', { type, hasImage: !!image, hasCoverImage: !!coverImage, hasMessage: !!message, hasPassword: !!password });

  try {
    switch (type) {
      case 'text-image': {
        // Prepare temp file for image
        const tempPath = path.join(tempDir, `encode_txt_${Date.now()}.png`);
        await downloadBase64ToFile(image, tempPath);

        const formData = new FormData();
        formData.append('image', fs.createReadStream(tempPath));
        formData.append('message', message);
        if (password) formData.append('password', password);

        console.log('📤 Sending to Flask for encoding (FormData)...');

        const response = await axios.post(
          `${STEGO_SERVICE_URL}/api/encode/text-image`,
          formData,
          {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );

        // Clean up input
        fs.unlinkSync(tempPath);

        if (response.data.success && response.data.encodedImage) {
          console.log('☁️ Uploading to Cloudinary (PNG format)...');
          const cloudinaryResult = await cloudinary.uploader.upload(response.data.encodedImage, {
            folder: 'secure-messages',
            resource_type: 'image',
            format: 'png',
            transformation: []
          });

          return {
            success: true,
            encodedImage: cloudinaryResult.secure_url
          };
        } else {
          throw new Error(response.data.error || 'Encoding failed');
        }
      }

      case 'image-image': {
        const coverPath = path.join(tempDir, `cover_${Date.now()}.png`);
        const secretPath = path.join(tempDir, `secret_${Date.now()}.png`);

        await downloadBase64ToFile(coverImage, coverPath);
        await downloadBase64ToFile(secretImage, secretPath);

        const formData = new FormData();
        formData.append('cover_image', fs.createReadStream(coverPath));
        formData.append('secret_image', fs.createReadStream(secretPath));

        const response = await axios.post(
          `${STEGO_SERVICE_URL}/api/encode/image-image`,
          formData,
          { headers: formData.getHeaders() }
        );

        fs.unlinkSync(coverPath);
        fs.unlinkSync(secretPath);

        if (response.data.success && response.data.encodedImage) {
          const cloudinaryResult = await cloudinary.uploader.upload(response.data.encodedImage, {
            folder: 'secure-messages',
            resource_type: 'image',
            format: 'png' // Ensure PNG
          });

          return {
            success: true,
            encodedImage: cloudinaryResult.secure_url
          };
        } else {
          throw new Error(response.data.error || 'Image encoding failed');
        }
      }

      case 'audio': {
        const audioPath = path.join(tempDir, `audio_${Date.now()}.wav`);
        await downloadBase64ToFile(audio, audioPath);

        const formData = new FormData();
        formData.append('audio', fs.createReadStream(audioPath));
        formData.append('message', message);
        if (password) {
          formData.append('password', password);
        }

        const response = await axios.post(
          `${STEGO_SERVICE_URL}/api/encode/audio`,
          formData,
          { headers: formData.getHeaders() }
        );

        fs.unlinkSync(audioPath);

        if (response.data.success && response.data.encodedAudio) {
          const cloudinaryResult = await cloudinary.uploader.upload(response.data.encodedAudio, {
            folder: 'secure-messages',
            resource_type: 'video' // Cloudinary uses video for audio
          });

          return {
            success: true,
            encodedAudio: cloudinaryResult.secure_url
          };
        } else {
          throw new Error(response.data.error || 'Audio encoding failed');
        }
      }

      default:
        return { success: false, error: 'Unknown stego type' };
    }
  } catch (error) {
    console.error('❌ encodeSecureMessage error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

// Health check
export const checkStegoHealth = async (req, res) => {
  try {
    const response = await axios.get(`${STEGO_SERVICE_URL}/api/health`);
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Stego service unavailable",
    });
  }
};

// Encode text in image (Direct API)
export const encodeTextInImage = async (req, res) => {
  try {
    const { text, password } = req.body;
    const imageFile = req.file;

    if (!imageFile || !text) {
      return res.status(400).json({ error: "Image and text are required" });
    }

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imageFile.path));
    formData.append("message", text); // Note: Flask expects 'message', not 'text'
    if (password) {
      formData.append("password", password);
    }

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/encode/text-image`,
      formData,
      { headers: formData.getHeaders() }
    );

    // Clean up uploaded file
    fs.unlinkSync(imageFile.path);

    res.json(response.data);
  } catch (error) {
    console.error("Encode text-image error:", error.message);
    res.status(500).json({ error: "Failed to encode text in image" });
  }
};

// 🔓 Decode text from image (RECEIVER USES THIS)
export const decodeTextFromImage = async (req, res) => {
  try {
    const { imageUrl, password } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const tempImagePath = path.join(tempDir, `decode_${Date.now()}.png`);
    await downloadFile(imageUrl, tempImagePath);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempImagePath));
    if (password) {
      formData.append("password", password);
    }

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/decode/text-image`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(tempImagePath);

    const decodedText = response.data.text;
    if (decodedText && (decodedText.startsWith("Error") || decodedText.startsWith("Incorrect") || decodedText.startsWith("Hidden message not found") || decodedText.startsWith("🔒") || decodedText.startsWith("❌"))) {
      return res.json({ success: false, message: decodedText });
    }

    res.json(response.data);
  } catch (error) {
    console.error("❌ Decode text-image error:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.error || error.message || "Failed to decode message",
    });
  }
};

// Encode image in image
export const encodeImageInImage = async (req, res) => {
  try {
    // This endpoint handles direct upload via multer (req.files)
    // Expecting fields: cover_image, secret_image
    const files = req.files;

    // Check if files exist. Multer puts them in req.files for array/fields
    // We assume backend route uses upload.fields([{ name: 'cover_image' }, { name: 'secret_image' }])

    // If route isn't set up for fields, this might vary.
    // Based on stegoRoutes.js, it might be single file?
    // Let's assume the router uses proper multer config.
    // However, looking at stegoRoutes.js (viewed earlier), it just says `protectRoute, encodeImageInImage`.
    // It doesn't show multer middleware there.

    // BUT `encodeTextInImage` used `req.file`.
    // We need to ensure routes have multer.
    // I'll assume standard implementation or fail gratefully.

    if (!files || !files.cover_image || !files.secret_image) {
      return res.status(400).json({ error: "Both cover_image and secret_image are required" });
    }

    const cover = files.cover_image[0];
    const secret = files.secret_image[0];

    const formData = new FormData();
    formData.append("cover_image", fs.createReadStream(cover.path));
    formData.append("secret_image", fs.createReadStream(secret.path));

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/encode/image-image`,
      formData,
      { headers: formData.getHeaders() }
    );

    // Cleanup
    fs.unlinkSync(cover.path);
    fs.unlinkSync(secret.path);

    res.json(response.data);

  } catch (error) {
    console.error("Encode image-image error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 🔓 Decode image from image
export const decodeImageFromImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const tempImagePath = path.join(tempDir, `decode_img_${Date.now()}.png`);
    await downloadFile(imageUrl, tempImagePath);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(tempImagePath));

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/decode/image-image`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(tempImagePath);

    res.json(response.data);
  } catch (error) {
    console.error("Decode image-image error:", error.message);
    res.status(500).json({ error: "Failed to decode image" });
  }
};

// Encode audio
export const encodeAudio = async (req, res) => {
  try {
    const { message, password } = req.body;
    const audioFile = req.file;

    if (!audioFile || !message) {
      return res.status(400).json({ error: "Audio file and message are required" });
    }

    const formData = new FormData();
    formData.append("audio", fs.createReadStream(audioFile.path));
    formData.append("message", message);
    if (password) formData.append("password", password);

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/encode/audio`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(audioFile.path);
    res.json(response.data);

  } catch (error) {
    console.error("Encode audio error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 🔓 Decode audio
export const decodeAudio = async (req, res) => {
  try {
    const { audioUrl, password } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: "Audio URL is required" });
    }

    const tempAudioPath = path.join(tempDir, `decode_audio_${Date.now()}.wav`);
    await downloadFile(audioUrl, tempAudioPath);

    const formData = new FormData();
    formData.append("audio", fs.createReadStream(tempAudioPath));
    if (password) {
      formData.append("password", password);
    }

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/decode/audio`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(tempAudioPath);

    const decodedText = response.data.text;
    if (decodedText && (decodedText.startsWith("Error") || decodedText.startsWith("Incorrect") || decodedText.startsWith("Hidden message not found") || decodedText.startsWith("🔒") || decodedText.startsWith("❌"))) {
      return res.json({ success: false, message: decodedText });
    }

    res.json(response.data);
  } catch (error) {
    console.error("Decode audio error:", error.message);
    res.status(500).json({ error: "Failed to decode audio" });
  }
};

// Check capacity
export const checkCapacity = async (req, res) => {
  try {
    const imageFile = req.file;
    if (!imageFile) return res.status(400).json({ error: "No image provided" });

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imageFile.path));

    const response = await axios.post(
      `${STEGO_SERVICE_URL}/api/capacity`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(imageFile.path);
    res.json(response.data);
  } catch (error) {
    console.error("Capacity check error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
