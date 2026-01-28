import cloudinary from "../lib/cloudinary.js";
import generateToken from "../lib/utils.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import bcrypt from 'bcrypt';

const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;
    try {
        if (!fullName || !email || !password || !bio) {
            return res.json({ success: false, message: "Some required fields are missing" })
        }

        // Validate email format
        if (!email.includes('@') || !email.includes('.')) {
            return res.json({ success: false, message: "Invalid email format" })
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exist" })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName, email, password: hashedPassword, bio
        })

        const token = generateToken(newUser._id);

        // Set JWT in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true, // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, user: newUser, message: "User created successfully" });

    } catch (error) {
        console.error("Error during signup:", error);
        res.json({ success: false, message: error.message });
    }
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userData = await User.findOne({ email });
        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.json({ success: false, message: "Invalid password" })
        }

        const token = generateToken(userData._id);

        // Set JWT in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true, // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, user: userData, message: "Login successful" });

    } catch (error) {
        console.error("Error during login:", error);
        res.json({ success: false, message: error.message });
    }
}

const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
}

const updateProfile = async (req, res) => {
    try {
        const { profilePic, fullName, bio } = req.body;
        const userId = req.user._id;

        const updates = {};
        if (fullName) updates.fullName = fullName;
        if (bio) updates.bio = bio;

        if (profilePic) {
            // If a new profile pic is provided, upload it
            const upload = await cloudinary.uploader.upload(profilePic);
            updates.profilePic = upload.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });

        res.json({ success: true, user: updatedUser, message: "Profile updated successfully" });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.json({ success: false, message: error.message });
    }
}

const logout = async (req, res) => {
    try {
        // Clear the HTTP-only cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Error during logout:", error);
        res.json({ success: false, message: error.message });
    }
}

export { signup, login, checkAuth, updateProfile, logout };