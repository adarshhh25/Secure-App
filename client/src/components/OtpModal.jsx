import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const OtpModal = ({ isOpen, onClose, onVerify, email, purpose }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await onVerify(otp);
    } catch (error) {
      toast.error("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendCooldown(60); // 60 seconds cooldown
      
      const endpoint = purpose === 'SEND' 
        ? '/api/stego/request-send-otp' 
        : '/api/stego/request-decode-otp';
      
      const requestBody = purpose === 'SEND' && email 
        ? JSON.stringify({ email })
        : null;
        
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        ...(requestBody && { body: requestBody })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success("OTP resent successfully");
        setOtp(""); // Clear current OTP
      } else {
        toast.error(data.message || 'Failed to resend OTP');
        setResendCooldown(0);
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      setResendCooldown(0);
    }
  };

  const getMaskedEmail = () => {
    if (!email || !email.includes('@')) {
      return 'your registered email';
    }
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return email;
    }
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="otp-modal">
        <div className="modal-header">
          <h3>🔐 Email Verification</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          <p className="otp-instruction">
            We've sent a 6-digit OTP to:
          </p>
          <p className="masked-email">{getMaskedEmail()}</p>
          
          <div className="otp-input-container">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="otp-input"
              maxLength={6}
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button 
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="verify-button"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button 
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className="resend-button"
            >
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : 'Resend OTP'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpModal;