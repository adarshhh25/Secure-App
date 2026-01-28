import sharp from "sharp";

class SteganographyService {
  constructor() {
    // Magic header to identify steganographic images
    this.magic = "STEGO_V1";
    this.delimiter = "###END###";
  }

  /**
   * Convert text to binary string
   */
  textToBinary(text) {
    return text
      .split("")
      .map(char => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
  }

  /**
   * Convert binary string to text
   */
  binaryToText(binary) {
    const bytes = binary.match(/.{8}/g) || [];
    return bytes
      .map(byte => String.fromCharCode(parseInt(byte, 2)))
      .join("");
  }

  /**
   * Calculate maximum payload capacity for an image
   */
  getMaxPayload(width, height) {
    const totalPixels = width * height;
    const availableBits = totalPixels * 3; // RGB channels
    const headerBits = this.textToBinary(this.magic + this.delimiter).length;
    const delimiterBits = this.textToBinary(this.delimiter).length;
    
    // Reserve bits for header, delimiter, and length indicator (32 bits)
    return Math.floor((availableBits - headerBits - delimiterBits - 32) / 8);
  }

  /**
   * Embed encrypted text into image using LSB steganography
   * @param {Buffer} imageBuffer - Original PNG image buffer
   * @param {string} encryptedText - Encrypted text to hide
   * @returns {Buffer} - Modified image buffer with hidden text
   */
  async embedText(imageBuffer, encryptedText) {
    try {
      // Get image metadata and pixel data
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (metadata.format !== "png") {
        throw new Error("Only PNG images are supported");
      }

      const { width, height } = metadata;
      const maxPayload = this.getMaxPayload(width, height);

      if (encryptedText.length > maxPayload) {
        throw new Error(`Message too long. Maximum: ${maxPayload} characters, provided: ${encryptedText.length}`);
      }

      // Get raw pixel data
      const { data } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Create message with header and length
      const message = this.magic + encryptedText + this.delimiter;
      const messageLength = encryptedText.length.toString(2).padStart(32, "0");
      const fullBinary = this.textToBinary(this.magic) + messageLength + this.textToBinary(encryptedText) + this.textToBinary(this.delimiter);

      // Embed binary data into LSBs
      let bitIndex = 0;
      const modifiedData = Buffer.from(data);

      for (let i = 0; i < modifiedData.length && bitIndex < fullBinary.length; i += 4) {
        // Skip alpha channel, only use RGB
        for (let channel = 0; channel < 3 && bitIndex < fullBinary.length; channel++) {
          const pixelIndex = i + channel;
          
          // Clear LSB and set new bit
          modifiedData[pixelIndex] = (modifiedData[pixelIndex] & 0xFE) | parseInt(fullBinary[bitIndex]);
          bitIndex++;
        }
      }

      // Create new image with modified pixel data
      const resultBuffer = await sharp(modifiedData, {
        raw: {
          width,
          height,
          channels: 4
        }
      })
      .png()
      .toBuffer();

      return resultBuffer;

    } catch (error) {
      console.error("Steganography embedding failed:", error);
      throw new Error(`Failed to embed text: ${error.message}`);
    }
  }

  /**
   * Extract encrypted text from steganographic image
   * @param {Buffer} imageBuffer - Steganographic PNG image buffer
   * @returns {string} - Extracted encrypted text
   */
  async extractText(imageBuffer) {
    try {
      // Get image pixel data
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (metadata.format !== "png") {
        throw new Error("Only PNG images are supported");
      }

      const { data } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Extract binary data from LSBs
      let binaryData = "";
      for (let i = 0; i < data.length; i += 4) {
        // Extract from RGB channels only
        for (let channel = 0; channel < 3; channel++) {
          const pixelIndex = i + channel;
          binaryData += (data[pixelIndex] & 1).toString();
        }
      }

      // Check for magic header
      const magicBinary = this.textToBinary(this.magic);
      const extractedMagic = binaryData.substring(0, magicBinary.length);
      
      if (extractedMagic !== magicBinary) {
        throw new Error("No steganographic data found");
      }

      // Extract message length (32 bits after magic)
      const lengthBinary = binaryData.substring(magicBinary.length, magicBinary.length + 32);
      const messageLength = parseInt(lengthBinary, 2);

      if (messageLength <= 0 || messageLength > 100000) {
        throw new Error("Invalid message length detected");
      }

      // Extract message data
      const messageStart = magicBinary.length + 32;
      const messageBinary = binaryData.substring(messageStart, messageStart + (messageLength * 8));
      
      if (messageBinary.length < messageLength * 8) {
        throw new Error("Incomplete message data");
      }

      const extractedText = this.binaryToText(messageBinary);

      // Verify delimiter
      const delimiterStart = messageStart + (messageLength * 8);
      const delimiterBinary = this.textToBinary(this.delimiter);
      const extractedDelimiter = binaryData.substring(delimiterStart, delimiterStart + delimiterBinary.length);
      
      if (extractedDelimiter !== delimiterBinary) {
        throw new Error("Message delimiter not found - data may be corrupted");
      }

      return extractedText;

    } catch (error) {
      console.error("Steganography extraction failed:", error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Check if image contains steganographic data
   */
  async hasHiddenData(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const { data } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Extract potential magic header
      let binaryData = "";
      const magicBinary = this.textToBinary(this.magic);
      
      for (let i = 0; i < data.length && binaryData.length < magicBinary.length; i += 4) {
        for (let channel = 0; channel < 3 && binaryData.length < magicBinary.length; channel++) {
          const pixelIndex = i + channel;
          binaryData += (data[pixelIndex] & 1).toString();
        }
      }

      return binaryData === magicBinary;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get steganography capacity information
   */
  async getCapacityInfo(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      const { width, height } = metadata;
      const maxPayload = this.getMaxPayload(width, height);
      
      return {
        width,
        height,
        maxPayloadBytes: maxPayload,
        maxPayloadChars: maxPayload,
        format: metadata.format
      };

    } catch (error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }
}

export default new SteganographyService();