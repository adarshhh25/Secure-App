import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    text: {
        type: String,
    },
    image: {
        type: String,
    },
    audio: {
        type: String,
    },
    // Steganography fields
    isSecure: {
        type: Boolean,
        default: false,
    },
    stegoType: {
        type: String,
        enum: ["text-image", "image-image", "audio", "none", null],
        default: null,
    },
    isEncrypted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;