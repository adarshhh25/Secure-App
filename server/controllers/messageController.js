import User from "../models/User.js";
import Message from "../models/Message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { encodeSecureMessage } from "./stegoController.js";

//Get all users except the logged in user
const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

    //Count number of message not seen
    const unseenMessages = {}

    const promises = filteredUsers.map(async (user) => {
      const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false })

      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    })

    await Promise.all(promises);
    res.json({ success: true, users: filteredUsers, unseenMessages })
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message })
  }
}

//Get all messages for selected user
const getMessages = async (req, res) => {
  try {
    const { id: selectedUser } = req.params;
    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: selectedUser, receiverId: myId },
        { senderId: myId, receiverId: selectedUser }
      ]
    })

    // Debug: Log what we're returning
    console.log('📥 getMessages returning:', messages.map(m => ({
      id: m._id,
      isSecure: m.isSecure,
      hasImage: !!m.image,
      imageUrl: m.image?.substring(0, 50)
    })));

    await Message.updateMany({ senderId: selectedUser, receiverId: myId }, { seen: true });

    res.json({ success: true, message: messages })
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message })
  }
}

//api to mark msg seen
const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndUpdate(id, { seen: true })
    res.json({ success: true })

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message })
  }
}

const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, isSecure, stegoType, password, coverImage, secretImage, message } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    // Debug logging
    console.log('📨 SendMessage called with:', {
      isSecure,
      stegoType,
      hasText: !!text,
      hasMessage: !!message,
      hasImage: !!image,
      hasCoverImage: !!coverImage,
      hasPassword: !!password
    });

    let imageUrl;
    let audioUrl;
    // Use coverImage if provided, otherwise use image
    let finalImage = coverImage || image;
    let finalAudio = audio;
    let isEncrypted = false;
    // Use message if provided, otherwise use text
    const secretText = message || text;

    // Debug: Check what we got
    console.log('🔍 Parsed data:', {
      hasCoverImageBase64: !!coverImage && coverImage.length > 100,
      hasImageBase64: !!image && image?.length > 100,
      finalImageLength: finalImage?.length || 0,
      secretTextLength: secretText?.length || 0
    });

    // Handle secure mode encoding
    if (isSecure && stegoType && stegoType !== 'none') {
      console.log('🔐 Secure mode enabled, encoding...');
      try {
        switch (stegoType) {
          case 'text-image':
            // Encode text inside image
            if (secretText && finalImage) {
              console.log('📝 Encoding text in image...');
              const result = await encodeSecureMessage({
                type: 'text-image',
                image: finalImage,
                message: secretText,
                password
              });
              console.log('📝 Encode result:', { success: result.success, hasEncodedImage: !!result.encodedImage });
              if (result.success) {
                finalImage = result.encodedImage;
                isEncrypted = !!password;
              }
            } else {
              console.log('⚠️ Missing text or image for text-image encoding');
            }
            break;

          case 'image-image':
            // Hide image inside cover image
            if (coverImage && secretImage) {
              const result = await encodeSecureMessage({
                type: 'image-image',
                coverImage,
                secretImage
              });
              if (result.success) {
                finalImage = result.encodedImage;
              }
            }
            break;

          case 'audio':
            // Encode text inside audio
            if (text && audio) {
              const result = await encodeSecureMessage({
                type: 'audio',
                audio,
                message: secretText
              });
              if (result.success) {
                finalAudio = result.encodedAudio;
              }
            }
            break;
        }
      } catch (stegoError) {
        console.error('Stego encoding failed:', stegoError);
        throw new Error(stegoError.message || "Steganography encoding failed");
      }
    }

    // Upload to cloudinary if we have media
    // Skip if already a Cloudinary URL (from encodeSecureMessage)
    if (finalImage) {
      if (finalImage.startsWith('https://res.cloudinary.com')) {
        // Already uploaded by encodeSecureMessage
        imageUrl = finalImage;
        console.log('✅ Image already on Cloudinary:', imageUrl);
      } else {
        // Need to upload to Cloudinary
        console.log('☁️ Uploading image to Cloudinary...');
        const uploadResponse = await cloudinary.uploader.upload(finalImage);
        imageUrl = uploadResponse.secure_url;
        console.log('✅ Cloudinary upload success:', imageUrl);
      }
    }

    if (finalAudio) {
      if (finalAudio.startsWith('https://res.cloudinary.com')) {
        // Already uploaded by encodeSecureMessage
        audioUrl = finalAudio;
      } else {
        const uploadResponse = await cloudinary.uploader.upload(finalAudio, {
          resource_type: 'video' // Cloudinary uses 'video' for audio files
        });
        audioUrl = uploadResponse.secure_url;
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: isSecure && stegoType === 'text-image' ? null : text, // Don't store plaintext if encoded
      image: imageUrl,
      audio: audioUrl,
      isSecure: isSecure || false,
      stegoType: isSecure ? stegoType : null,
      isEncrypted
    });

    console.log('✅ Message created:', {
      id: newMessage._id,
      isSecure: newMessage.isSecure,
      stegoType: newMessage.stegoType,
      hasImage: !!newMessage.image,
      imageUrl: newMessage.image,
      hasAudio: !!newMessage.audio
    });

    //Emit the new message to the receiver's socket
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage)
    }

    res.json({ success: true, newMessage })

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message })
  }
}


export { getUsersForSidebar, getMessages, markMessageAsSeen, sendMessage }