import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import OtpModal from "./OtpModal";
import toast from "react-hot-toast";

const SecureSendPanel = ({ onSendImage }) => {
  const { authUser } = useContext(AuthContext);
  const [coverImage, setCoverImage] = useState(null);
  const [secretMessage, setSecretMessage] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.includes('png')) {
        toast.error('Please select a PNG image for better security');
        return;
      }
      setCoverImage(file);
    }
  };

  const handleSendSecurely = async () => {
    // Validation
    if (!coverImage) {
      toast.error('Please select a cover image');
      return;
    }
    if (!secretMessage.trim()) {
      toast.error('Please enter a secret message');
      return;
    }

    try {
      setLoading(true);
      
      // Request OTP from backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stego/request-send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: authUser.email
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`OTP sent to ${data.maskedEmail}`);
        setShowOtpModal(true);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP request error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async (otp) => {
    try {
      const formData = new FormData();
      formData.append('coverImage', coverImage);
      formData.append('secretMessage', secretMessage);
      formData.append('otp', otp);
      formData.append('email', authUser.email);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stego/verify-send-otp`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Message hidden successfully!');
        
        // Convert base64 to blob
        const binaryString = atob(data.stegoImage);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const stegoImageBlob = new Blob([bytes], { type: 'image/png' });
        
        onSendImage(stegoImageBlob, 'stego-image.png');
        
        // Reset form
        setCoverImage(null);
        setSecretMessage("");
        setShowOtpModal(false);
      } else {
        toast.error(data.message || 'Failed to create secure image');
      }
    } catch (error) {
      console.error('Stego creation error:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const handleClear = () => {
    setCoverImage(null);
    setSecretMessage("");
    setShowOtpModal(false);
  };

  return (
    <div className="secure-send-panel">
      <div className="panel-header">
        <h3>🔐 Secure Send Panel</h3>
        <span className="mode-badge">Text → Image</span>
      </div>

      {/* Cover Image Section */}
      <div className="input-section">
        <label className="input-label">
          Cover Image (message will be hidden here)
        </label>
        <div className="image-upload-area">
          <input
            type="file"
            accept="image/png"
            onChange={handleImageSelect}
            className="hidden-input"
            id="cover-image"
          />
          <label htmlFor="cover-image" className="upload-button">
            📸 Select Cover Image
          </label>
          {coverImage && (
            <div className="image-preview">
              <img 
                src={URL.createObjectURL(coverImage)} 
                alt="Cover" 
                className="preview-img"
              />
              <span className="file-name">{coverImage.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Secret Message Section */}
      <div className="input-section">
        <label className="input-label">Secret Message</label>
        <textarea
          value={secretMessage}
          onChange={(e) => setSecretMessage(e.target.value)}
          placeholder="Enter your secret message..."
          className="secret-textarea"
          rows={4}
        />
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          onClick={handleClear}
          className="clear-button"
        >
          Clear
        </button>
        <button 
          onClick={handleSendSecurely}
          disabled={loading || !coverImage || !secretMessage.trim()}
          className="send-secure-button"
        >
          {loading ? (
            <>🔄 Requesting OTP...</>
          ) : (
            <>🔒 Send Securely</>
          )}
        </button>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <OtpModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleOtpVerified}
          email={authUser?.email}
          purpose="SEND"
        />
      )}
    </div>
  );
};

export default SecureSendPanel;
