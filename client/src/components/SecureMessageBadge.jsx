import { useState } from "react";
import toast from "react-hot-toast";

const SecureMessageBadge = ({ message, onDecode }) => {
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedContent, setDecodedContent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

    setIsDecoding(true);
    try {
      const result = await onDecode(message, password);

      // Check for error strings in text even if success is true
      const isErrorText = result.text && (
        result.text.startsWith("Error") ||
        result.text.startsWith("Incorrect") ||
        result.text.startsWith("Hidden message") ||
        result.text.startsWith("🔒") ||
        result.text.startsWith("❌")
      );

      if (result.success && !isErrorText) {
        setDecodedContent(result);
        setShowPasswordModal(false);
        toast.success("Message decoded successfully!");
      } else {
        // Use result.message or result.text or default error
        const errorMsg = result.message || (isErrorText ? result.text : null) || result.error || "Decoding failed";
        toast.error(errorMsg);
        // Clear content if it was error
        setDecodedContent(null);
      }
    } catch (error) {
      console.error("Decode error:", error);
      toast.error("Failed to decode message");
    } finally {
      setIsDecoding(false);
    }
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
          disabled={isDecoding}
          className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 
                     text-white px-4 py-2 rounded-lg text-sm transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDecoding ? (
            <>
              <span className="animate-spin">⏳</span>
              Decoding...
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
          {decodedContent.image && (
            <img
              src={`data:image/png;base64,${decodedContent.image}`}
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
                  disabled={!password || isDecoding}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             py-2.5 rounded-lg transition-colors disabled:opacity-50
                             disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDecoding ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Decoding...
                    </>
                  ) : (
                    "🔓 Decode"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureMessageBadge;
