// import jwt from 'jsonwebtoken';
// import User from '../models/User.js';

// const protectRoute = async (req, res, next) => {
//     try {
//         const token = req.headers.token;

//         if (!token) {
//             console.warn('⚠️ No token provided for protected route');
//             return res.status(401).json({success: false, message: "No authentication token provided"});
//         }

//         console.log('🔑 Verifying token for protected route...');
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         if(!decoded) {
//             console.warn('⚠️ Invalid token provided');
//             return res.status(401).json({success: false, message: "Invalid authentication token"});
//         }

//         const user = await User.findById(decoded.userId).select("-password");

//         if(!user) {
//             console.warn('⚠️ User not found for token:', decoded.userId);
//             return res.status(401).json({success: false, message: "User not found"});
//         }

//         console.log('✅ Token verified for user:', user.username);
//         req.user = user;
//         next();
//     } catch (error) {
//         console.error("❌ Error during token verification:", error.message);
//         if (error.name === 'JsonWebTokenError') {
//             return res.status(401).json({success: false, message: "Invalid authentication token"});
//         } else if (error.name === 'TokenExpiredError') {
//             return res.status(401).json({success: false, message: "Authentication token expired"});
//         }
//         res.status(500).json({success: false, message: "Authentication error"});
//     }
// }


// export { protectRoute};


import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoute = async (req, res, next) => {
  try {
    // Read JWT from HTTP-only cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }
};

export { protectRoute };
