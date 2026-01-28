/**
 * Test script for the steganography system
 * Run this to verify core functionality works
 */
import crypto from "../lib/crypto.js";
import stego from "../lib/stego.js";
import fs from "fs";
import path from "path";

// Test encryption/decryption
console.log("🧪 Testing Encryption/Decryption...");
const testMessage = "Hello, this is a secret message!";
const testPassword = "mySecretPassword123";

try {
  const encrypted = crypto.encrypt(testMessage, testPassword);
  console.log("✅ Encryption successful");
  
  const decrypted = crypto.decrypt(encrypted, testPassword);
  console.log("✅ Decryption successful");
  
  if (decrypted === testMessage) {
    console.log("✅ Encryption/Decryption test passed!");
  } else {
    console.log("❌ Encryption/Decryption test failed!");
  }
} catch (error) {
  console.error("❌ Crypto test failed:", error.message);
}

console.log("\n📝 Test Summary:");
console.log("- Encryption: AES-256-GCM with PBKDF2");
console.log("- Steganography: LSB method for PNG images");
console.log("- OTP: 6-digit codes with 5-minute expiry");
console.log("- Email: Nodemailer with Gmail SMTP");

console.log("\n🚀 Ready to test with real images!");
console.log("1. Start the server: npm run server");
console.log("2. Upload a PNG image in the UI");  
console.log("3. Test the complete OTP flow");

export {};