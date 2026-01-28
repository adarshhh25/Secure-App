import crypto from "crypto";

class CryptoService {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    this.iterations = 100000; // PBKDF2 iterations
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, "sha256");
  }

  /**
   * Encrypt text using AES-256-GCM
   * @param {string} text - Plain text to encrypt
   * @param {string} password - Password for encryption
   * @returns {Object} - Contains salt, iv, tag, and encrypted data
   */
  encrypt(text, password) {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from password
      const key = this.deriveKey(password, salt);
      
      // Create cipher
      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Create payload object
      const payload = {
        salt: salt.toString("hex"),
        iv: iv.toString("hex"),
        tag: tag.toString("hex"),
        encrypted: encrypted.toString("hex"),
        algorithm: this.algorithm
      };
      
      // Convert to base64 for storage
      return Buffer.from(JSON.stringify(payload)).toString("base64");
      
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   * @param {string} encryptedPayload - Base64 encoded encrypted payload
   * @param {string} password - Password for decryption
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedPayload, password) {
    try {
      // Parse payload
      const payload = JSON.parse(Buffer.from(encryptedPayload, "base64").toString("utf8"));
      
      // Validate algorithm
      if (payload.algorithm !== this.algorithm) {
        throw new Error("Invalid encryption algorithm");
      }
      
      // Extract components
      const salt = Buffer.from(payload.salt, "hex");
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");
      const encrypted = Buffer.from(payload.encrypted, "hex");
      
      // Derive key from password
      const key = this.deriveKey(password, salt);
      
      // Create decipher
      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the text
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString("utf8");
      
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Decryption failed - Invalid password or corrupted data");
    }
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(crypto.randomInt(chars.length));
    }
    return password;
  }

  /**
   * Hash data with SHA-256
   */
  hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Validate encryption payload format
   */
  isValidPayload(encryptedPayload) {
    try {
      const payload = JSON.parse(Buffer.from(encryptedPayload, "base64").toString("utf8"));
      return !!(payload.salt && payload.iv && payload.tag && payload.encrypted && payload.algorithm);
    } catch {
      return false;
    }
  }
}

export default new CryptoService();