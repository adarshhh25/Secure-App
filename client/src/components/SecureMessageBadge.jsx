import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import OtpModal from "./OtpModal";
import toast from "react-hot-toast";

const SecureMessageBadge = ({ message, onDecode }) => {
  const { authUser } = useContext(AuthContext);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedContent, setDecodedContent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // OTP states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingDecodeData, setPendingDecodeData] = useState(null);

  // Debug log
  console.log('SecureMessageBadge message:', {
    isSecure: message.isSecure,
    stegoType: message.stegoType,
    hasImage: !!message.image,
    imageUrl: message.image,
    isEncrypted: message.isEncrypted
  });

  // Don't show badge for non-secure messages
  if (!message.isSecure) return null;

  const handleDecode = async () => {
    // If encrypted, show password modal first
    if (message.isEncrypted && !password) {
      setShowPasswordModal(true);
      return;
    }

    // Request OTP for decoding
    setIsRequestingOtp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stego/request-decode-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      // Store decode data for later use
      setPendingDecodeData({
        message,
        password
      });

      setShowOtpModal(true);
      setShowPasswordModal(false);
      toast.success('OTP sent to your registered email');

    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Handle OTP verification and decoding
  const handleOtpVerify = async (otp) => {
    setIsVerifyingOtp(true);
    try {
      console.log('🔍 Starting OTP verification:', {
        otp,
        hasPassword: !!pendingDecodeData?.password,
        hasMessage: !!pendingDecodeData?.message,
        hasImage: !!pendingDecodeData?.message?.image,
        imageUrl: pendingDecodeData?.message?.image
      });

      // Create FormData for the request
      const formData = new FormData();
      formData.append('otp', otp);
      
      if (pendingDecodeData.password) {
        formData.append('decryptionPassword', pendingDecodeData.password);
      }

      // Convert image URL to blob and append
      if (pendingDecodeData.message.image) {
        console.log('📥 Fetching image from:', pendingDecodeData.message.image);
        const imageResponse = await fetch(pendingDecodeData.message.image);
        
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        
        const blob = await imageResponse.blob();
        console.log('✅ Image fetched, size:', blob.size, 'bytes, type:', blob.type);
        
        // Ensure the blob is of type image/png
        const pngBlob = blob.type.includes('image') ? blob : new Blob([blob], { type: 'image/png' });
        formData.append('stegoImage', pngBlob, 'stego.png');
        
        console.log('✅ Image appended to FormData as stegoImage');
      } else {
        console.error('❌ No image found in message');
        throw new Error('No image found in message');
      }

      console.log('📤 Sending decode request...');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stego/verify-decode-otp`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      console.log('📨 Server response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to decode message');
      }

      // Success - show decoded content
      setDecodedContent({
        text: result.secretMessage,
        success: true
      });
      
      setShowOtpModal(false);
      setPendingDecodeData(null);
      
      toast.success("🔓 Message decoded successfully!");

    } catch (error) {
      console.error('❌ Decode error:', error);
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle OTP modal close
  const handleOtpModalClose = () => {
    setShowOtpModal(false);
    setPendingDecodeData(null);
    setIsVerifyingOtp(false);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    handleDecode();
  };

  const getStegoTypeLabel = () => {
    switch (message.stegoType) {
      case "text-image":
        return "📝 Text in Image";
      case "image-image":
        return "🖼️ Image in Image";
      case "audio":
        return "🔊 Audio Stego";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="mt-2">
      {/* Secure Badge */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
          🔒 Secure
        </span>
        <span className="text-gray-400">{getStegoTypeLabel()}</span>
        {message.isEncrypted && (
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            🔐 Encrypted
          </span>
        )}
      </div>

      {/* Decode Button or Decoded Content */}
      {!decodedContent ? (
        <button
          onClick={handleDecode}
          disabled={isRequestingOtp || isVerifyingOtp}
          className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 
                     text-white px-4 py-2 rounded-lg text-sm transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingOtp ? (
            <>
              <span className="animate-spin">⏳</span>
              Requesting OTP...
            </>
          ) : (
            <>
              🔓 Decode Message
            </>
          )}
        </button>
      ) : (
        <div className="mt-2 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2">
            ✅ Decoded Successfully
          </div>

          {/* Show decoded text */}
          {decodedContent.text && (
            <p className="text-white break-words">{decodedContent.text}</p>
          )}

          {/* Show decoded image */}
          {(decodedContent.image || decodedContent.secretImage) && (
            <img
              src={decodedContent.secretImage || (decodedContent.image?.startsWith('data:') ? decodedContent.image : `data:image/png;base64,${decodedContent.image}`)}
              alt="Decoded"
              className="mt-2 max-w-full rounded-lg"
            />
          )}
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🔐 Enter Decryption Password
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              This message is encrypted. Enter the password to decode it.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             pr-12"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 
                             hover:text-white text-xl"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white 
                             py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!password || isRequestingOtp}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             py-2.5 rounded-lg transition-colors disabled:opacity-50
                             disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRequestingOtp ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Requesting OTP...
                    </>
                  ) : (
                    "🔓 Request OTP"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={handleOtpModalClose}
        onVerify={handleOtpVerify}
        isLoading={isVerifyingOtp}
        purpose="DECODE"
        email={authUser?.email}
      />
    </div>
  );
};

export default SecureMessageBadge;
