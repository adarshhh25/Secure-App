import crypto from 'crypto';
import sharp from 'sharp';
import cloudinary from '../lib/cloudinary.js';
import steganographyService from '../lib/stego.js';
import Otp from '../models/Otp.js';
import emailService from '../lib/emailService.js';

class StegoController {

  constructor() {
    this.requestSendOtp = this.requestSendOtp.bind(this);
    this.verifySendOtp = this.verifySendOtp.bind(this);
    this.requestDecodeOtp = this.requestDecodeOtp.bind(this);
    this.verifyDecodeOtp = this.verifyDecodeOtp.bind(this);
  }

  // Generate 6-digit OTP
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Request OTP for sending secure message
  async requestSendOtp(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false,
          message: 'Email is required' 
        });
      }

      console.log(`📧 OTP requested for email: ${email}`);

      // Delete any existing OTPs for this email and purpose
      await Otp.deleteMany({ 
        email: email.toLowerCase(), 
        purpose: 'SEND' 
      });

      // Generate new OTP
      const otp = this.generateOtp();
      console.log(`🔑 Generated OTP: ${otp}`);
      
      // Save OTP to database
      const otpDoc = new Otp({
        email: email.toLowerCase(),
        otpHash: otp, // Will be hashed by pre-save middleware
        purpose: 'SEND'
      });
      
      await otpDoc.save();
      console.log('✅ OTP saved to database');

      // Send OTP via email (Nodemailer + Gmail SMTP)
      try {
        const emailResult = await emailService.sendStegOtp(email, otp, 'SEND');
        console.log('✅ Email sent successfully:', emailResult);
        
        // Only return success AFTER email is confirmed sent
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully',
          maskedEmail: emailService.getMaskedEmail(email)
        });
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError);
        
        // Delete the OTP from database since email failed
        await Otp.deleteMany({ 
          email: email.toLowerCase(), 
          purpose: 'SEND' 
        });
        
        // Return error - do NOT return success if email fails
        return res.status(500).json({ 
          success: false,
          message: 'Failed to send OTP email. Please check your email address.',
          error: emailError.message
        });
      }

    } catch (error) {
      console.error('❌ Request send OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to send OTP',
        error: error.message 
      });
    }
  }

  // Verify OTP and create steganographic image
  async verifySendOtp(req, res) {
    try {
      const { otp, email, secretMessage } = req.body;
      const coverImage = req.file;

      if (!otp || !email || !secretMessage || !coverImage) {
        return res.status(400).json({ 
          message: 'OTP, email, secret message, and cover image are required' 
        });
      }

      // Find and verify OTP
      const otpDoc = await Otp.findOne({
        email: email.toLowerCase(),
        purpose: 'SEND',
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpDoc) {
        return res.status(400).json({ 
          message: 'Invalid or expired OTP' 
        });
      }

      // Verify OTP
      const isOtpValid = await otpDoc.compareOtp(otp);
      if (!isOtpValid) {
        return res.status(400).json({ 
          message: 'Invalid OTP' 
        });
      }

      // Mark OTP as used
      otpDoc.used = true;
      await otpDoc.save();

      // Encrypt the secret message
      const encryptedData = this.encryptMessage(secretMessage);

      // Embed encrypted message into image
      const stegoImage = await this.embedMessageInImage(
        coverImage.buffer, 
        encryptedData
      );

      // Convert buffer to base64 for JSON response
      const base64Image = stegoImage.toString('base64');

      res.status(200).json({
        success: true,
        message: 'Secure image created successfully',
        stegoImage: base64Image
      });


    } catch (error) {
      console.error('Verify send OTP error:', error);
      res.status(500).json({ 
        message: 'Failed to create secure image',
        error: error.message 
      });
    }
  }

  // Encrypt message using AES-256-GCM
  encryptMessage(message) {
    const key = crypto.randomBytes(32); // 256-bit key
    const iv = crypto.randomBytes(16);   // 128-bit IV
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine key, iv, authTag, and encrypted data
    const payload = {
      key: key.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
    
    return JSON.stringify(payload);
  }

  // Embed message into image using LSB steganography
  async embedMessageInImage(imageBuffer, message) {
    try {
      // Convert image to PNG and get raw pixel data
      const { data, info } = await sharp(imageBuffer)
        .png()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      const messageBits = this.stringToBits(message);
      
      // Add message length prefix (32 bits)
      const lengthBits = this.numberToBits(messageBits.length, 32);
      const fullMessage = lengthBits + messageBits;

      // Check if image can hold the message
      if (fullMessage.length > pixels.length) {
        throw new Error('Image too small to hide the message');
      }

      // Embed message bits into LSB of pixels
      for (let i = 0; i < fullMessage.length; i++) {
        pixels[i] = (pixels[i] & 0xFE) | parseInt(fullMessage[i]);
      }

      // Convert back to PNG
      const stegoBuffer = await sharp(pixels, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels
        }
      }).png().toBuffer();

      return stegoBuffer;

    } catch (error) {
      console.error('Steganography error:', error);
      throw new Error('Failed to embed message in image');
    }
  }

  // Convert string to binary
  stringToBits(str) {
    return str.split('').map(char => 
      char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('');
  }

  // Convert number to binary with specified length
  numberToBits(num, length) {
    return num.toString(2).padStart(length, '0');
  }

  // Request OTP for decoding secure message
  async requestDecodeOtp(req, res) {
    try {
      const userId = req.user._id;
      const user = req.user;

      if (!user.email) {
        return res.status(400).json({ 
          success: false,
          message: 'User email not found' 
        });
      }

      console.log(`📧 Decode OTP requested for email: ${user.email}`);

      // Delete any existing OTPs for this user and purpose
      await Otp.deleteMany({ 
        email: user.email.toLowerCase(), 
        purpose: 'DECODE' 
      });

      // Generate new OTP
      const otp = this.generateOtp();
      console.log(`🔑 Generated decode OTP: ${otp}`);
      
      // Save OTP to database
      const otpDoc = new Otp({
        email: user.email.toLowerCase(),
        otpHash: otp, // Will be hashed by pre-save middleware
        purpose: 'DECODE'
      });
      
      await otpDoc.save();
      console.log('✅ Decode OTP saved to database');

      // Send OTP via email
      try {
        const emailResult = await emailService.sendStegOtp(user.email, otp, 'DECODE');
        console.log('✅ Decode OTP email sent successfully:', emailResult);
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully',
          maskedEmail: emailService.getMaskedEmail(user.email)
        });
      } catch (emailError) {
        console.error('❌ Decode OTP email sending failed:', emailError);
        
        // Delete the OTP from database since email failed
        await Otp.deleteMany({ 
          email: user.email.toLowerCase(), 
          purpose: 'DECODE' 
        });
        
        return res.status(500).json({ 
          success: false,
          message: 'Failed to send OTP email. Please check your email address.',
          error: emailError.message
        });
      }

    } catch (error) {
      console.error('❌ Request decode OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to send OTP',
        error: error.message 
      });
    }
  }

  // Verify OTP and decode steganographic image
  async verifyDecodeOtp(req, res) {
    try {
      const { otp, decryptionPassword } = req.body;
      const stegoImage = req.file;
      const user = req.user;

      console.log('🔍 Verify decode OTP request:', {
        hasOtp: !!otp,
        hasPassword: !!decryptionPassword,
        hasImage: !!stegoImage,
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body),
        userEmail: user?.email,
        stegoImageDetails: stegoImage ? {
          fieldname: stegoImage.fieldname,
          originalname: stegoImage.originalname,
          mimetype: stegoImage.mimetype,
          size: stegoImage.size
        } : 'No file'
      });

      if (!otp) {
        console.error('❌ OTP is missing');
        return res.status(400).json({ 
          success: false,
          message: 'OTP is required' 
        });
      }

      if (!stegoImage) {
        console.error('❌ Steganographic image is missing');
        return res.status(400).json({ 
          success: false,
          message: 'Steganographic image is required. Please make sure the image is attached.' 
        });
      }

      // Find and verify OTP
      const otpDoc = await Otp.findOne({
        email: user.email.toLowerCase(),
        purpose: 'DECODE',
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpDoc) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid or expired OTP' 
        });
      }

      // Verify OTP
      const isOtpValid = await otpDoc.compareOtp(otp);
      if (!isOtpValid) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid OTP' 
        });
      }

      // Mark OTP as used
      otpDoc.used = true;
      await otpDoc.save();
      console.log('✅ OTP verified and marked as used');

      // Extract hidden message from image
      const extractedData = await this.extractMessageFromImage(stegoImage.buffer);
      
      console.log('🔓 Message extracted from image, length:', extractedData.length);
      console.log('📝 First 100 chars:', extractedData.substring(0, 100));

      // Try to decrypt if it looks like encrypted data
      let decodedMessage = extractedData;
      let wasEncrypted = false;
      
      try {
        const payload = JSON.parse(extractedData);
        
        console.log('📦 Parsed payload keys:', Object.keys(payload));
        
        // Check if this is auto-encrypted (has embedded key)
        if (payload.key && payload.iv && payload.authTag && payload.data) {
          // Auto-encrypted with embedded key - decrypt automatically
          wasEncrypted = true;
          console.log('🔓 Auto-encrypted message detected, decrypting...');
          console.log('🔑 Key length:', payload.key.length);
          console.log('🔑 IV length:', payload.iv.length);
          console.log('🔑 AuthTag length:', payload.authTag.length);
          console.log('🔑 Data length:', payload.data.length);
          
          try {
            decodedMessage = this.decryptMessage(extractedData);
            console.log('✅ Message auto-decrypted successfully:', decodedMessage);
          } catch (decryptError) {
            console.error('❌ Decryption failed:', decryptError);
            throw decryptError;
          }
        }
        // Check if this is password-encrypted (no key field)
        else if (!payload.key && payload.iv && payload.authTag && payload.data) {
          // Password-encrypted - requires user password
          wasEncrypted = true;
          
          if (!decryptionPassword) {
            console.error('❌ Password-encrypted message but no password provided');
            return res.status(400).json({ 
              success: false,
              message: 'This message is encrypted. Please provide the decryption password.' 
            });
          }
          
          console.log('🔓 Password-encrypted message detected, decrypting with provided password...');
          decodedMessage = this.decryptMessageWithPassword(extractedData, decryptionPassword);
          console.log('✅ Message decrypted with password successfully');
        } else {
          console.log('ℹ️ Extracted data is JSON but not encrypted format');
        }
      } catch (e) {
        // Not encrypted JSON, use as is
        console.log('ℹ️ Message is not encrypted (plain text). Error:', e.message);
        // If it was supposed to be encrypted but decryption failed, use extractedData
        if (!wasEncrypted) {
          decodedMessage = extractedData;
        }
      }

      console.log('✅ Final decoded message:', decodedMessage);
      console.log('🔍 Decoded message type:', typeof decodedMessage);
      console.log('🔍 Is still JSON?', decodedMessage === extractedData);

      res.status(200).json({
        success: true,
        message: 'Message decoded successfully',
        secretMessage: decodedMessage,
        decodedMessage: decodedMessage,
        isEncrypted: wasEncrypted
      });

    } catch (error) {
      console.error('❌ Verify decode OTP error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to decode message',
        error: error.message 
      });
    }
  }

  // Extract message from image using LSB steganography
  async extractMessageFromImage(imageBuffer) {
    try {
      // Convert image to raw pixel data
      const { data, info } = await sharp(imageBuffer)
        .png()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      
      // Extract message length from first 32 bits
      let lengthBits = '';
      for (let i = 0; i < 32; i++) {
        lengthBits += (pixels[i] & 1).toString();
      }
      const messageLength = parseInt(lengthBits, 2);
      
      if (messageLength <= 0 || messageLength > pixels.length - 32) {
        throw new Error('Invalid or corrupted steganographic data');
      }

      // Extract message bits
      let messageBits = '';
      for (let i = 32; i < 32 + messageLength; i++) {
        messageBits += (pixels[i] & 1).toString();
      }

      // Convert bits to string
      const message = this.bitsToString(messageBits);
      
      return message;

    } catch (error) {
      console.error('❌ Message extraction error:', error);
      throw new Error('Failed to extract message from image. The image may not contain hidden data.');
    }
  }

  // Convert bits to string
  bitsToString(bits) {
    let str = '';
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.substr(i, 8);
      str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
  }

  // Decrypt auto-encrypted message (with embedded key)
  decryptMessage(encryptedData) {
    try {
      const payload = JSON.parse(encryptedData);
      const key = Buffer.from(payload.key, 'hex');
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      
      // Try without AAD first (new format)
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(payload.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } catch (newFormatError) {
        // If new format fails, try with AAD (old format for backward compatibility)
        console.log('⚠️ New format failed, trying old format with AAD...');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        decipher.setAAD(Buffer.from('steganography'));
        
        let decrypted = decipher.update(payload.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('✅ Decrypted with old format (AAD)');
        return decrypted;
      }
    } catch (error) {
      console.error('❌ Auto-decryption error:', error);
      throw new Error('Failed to decrypt message. The data may be corrupted.');
    }
  }

  // Decrypt message with password
  decryptMessageWithPassword(encryptedData, password) {
    try {
      const payload = JSON.parse(encryptedData);
      const key = crypto.scryptSync(password, 'salt', 32);
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(payload.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw new Error('Failed to decrypt message. Incorrect password or corrupted data.');
    }
  }

  // Encode secure message - main function called by messageController
  async encodeSecureMessage({ type, image, coverImage, secretImage, message, password }) {
    try {
      console.log(`🔐 Starting ${type} encoding...`);
      
      switch (type) {
        case 'text-image':
          // Encode text message into image
          if (!image || !message) {
            throw new Error('Image and message are required for text-image encoding');
          }
          
          let finalMessage = message;
          
          // Encrypt message if password provided
          if (password) {
            console.log('🔒 Encrypting message with password...');
            finalMessage = this.encryptMessageWithPassword(message, password);
          }
          
          // Convert image to buffer if it's a file object
          let imageBuffer = image;
          if (image.buffer) {
            imageBuffer = image.buffer;
          }
          
          // Embed message into image using steganography service
          const stegoBuffer = await steganographyService.embedText(imageBuffer, finalMessage);
          
          // Upload to Cloudinary
          const uploadResult = await this.uploadToCloudinary(stegoBuffer);
          
          return {
            success: true,
            encodedImage: uploadResult.secure_url
          };
          
        case 'image-image':
          // Hide secret image inside cover image
          if (!coverImage || !secretImage) {
            throw new Error('Cover image and secret image are required for image-image encoding');
          }
          
          // For now, just return the cover image - implement image-in-image later
          console.log('⚠️ Image-in-image encoding not fully implemented yet');
          return {
            success: true,
            encodedImage: coverImage
          };
          
        case 'image-text':
          // Hide image inside text (not implemented)
          throw new Error('Image-text encoding not implemented');
          
        default:
          throw new Error(`Unknown encoding type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Error in ${type} encoding:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Encrypt message with password using AES-256-GCM
  encryptMessageWithPassword(message, password) {
    const key = crypto.scryptSync(password, 'salt', 32); // Derive 256-bit key from password
    const iv = crypto.randomBytes(16);   // 128-bit IV
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    const payload = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    };
    
    return JSON.stringify(payload);
  }

  // Upload buffer to Cloudinary
  async uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'image',
          folder: 'steganography'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });
  }
}

export default new StegoController();

// Named exports for specific functions
export async function encodeSecureMessage(options) {
  const controller = new StegoController();
  return await controller.encodeSecureMessage(options);
}
