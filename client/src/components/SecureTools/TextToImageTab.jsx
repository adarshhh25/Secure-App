import { useState, useContext } from 'react';
import { Upload, Image as ImageIcon, Check, Lock, Eye, FileCheck, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import OtpModal from '../OtpModal';

const TextToImageTab = ({ onSecureSend, onClose }) => {
  const { authUser } = useContext(AuthContext);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [secretMessage, setSecretMessage] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.includes('png')) {
        toast.error('Please select a PNG image for optimal security');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be under 10MB');
        return;
      }
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.includes('image')) {
      const mockEvent = { target: { files: [file] } };
      handleImageSelect(mockEvent);
    }
  };

  const handleSendSecurely = async () => {
    if (!coverImage) {
      toast.error('Please select a cover image');
      return;
    }
    if (!secretMessage.trim()) {
      toast.error('Please enter a secret message');
      return;
    }
    if (usePassword && !password) {
      toast.error('Please enter an encryption password');
      return;
    }

    try {
      setLoading(true);
      
      console.log('📧 Requesting OTP for email:', authUser.email);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stego/request-send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: authUser.email })
      });

      const data = await response.json();
      
      console.log('📬 OTP Response:', data);
      
      if (response.ok && data.success) {
        toast.success(`OTP sent to ${data.maskedEmail}`);
        setShowOtpModal(true);
      } else {
        // Show detailed error message
        const errorMsg = data.message || 'Failed to send OTP';
        const errorNote = data.note ? `\n\n${data.note}` : '';
        toast.error(errorMsg + errorNote, { duration: 6000 });
        console.error('❌ OTP request failed:', data);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
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
      if (usePassword) {
        formData.append('password', password);
      }

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
        
        await onSecureSend({
          image: stegoImageBlob,
          isSecure: true,
          stegoType: 'text-image',
          hasPassword: usePassword
        });
        
        // Reset and close
        setCoverImage(null);
        setCoverImagePreview(null);
        setSecretMessage('');
        setPassword('');
        setShowOtpModal(false);
        onClose();
      } else {
        toast.error(data.message || 'Failed to create secure image');
      }
    } catch (error) {
      toast.error('Failed to process image. Please try again.');
    }
  };

  const isValid = coverImage && secretMessage.trim() && (!usePassword || password);

  return (
    <div className="space-y-6">
      {/* Step 1: Cover Image */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
              1
            </div>
            Cover Image
          </label>
          {coverImage && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <FileCheck className="w-3 h-3" />
              <span>Ready</span>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all
            ${coverImagePreview
              ? 'border-violet-500/40 bg-violet-500/5'
              : 'border-gray-600/50 bg-white/5 hover:border-violet-500/40 hover:bg-violet-500/5'
            }`}
        >
          <input
            type="file"
            accept="image/png"
            onChange={handleImageSelect}
            className="hidden"
            id="cover-image-input"
          />
          
          {!coverImagePreview ? (
            <label htmlFor="cover-image-input" className="flex flex-col items-center gap-3 cursor-pointer">
              <div className="p-4 bg-violet-500/10 rounded-full">
                <Upload className="w-8 h-8 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">
                  Drop image here or <span className="text-violet-400">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">PNG format recommended • Max 10MB</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <img
                src={coverImagePreview}
                alt="Cover preview"
                className="w-full h-48 object-cover rounded-xl"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 truncate">{coverImage.name}</span>
                <button
                  onClick={() => {
                    setCoverImage(null);
                    setCoverImagePreview(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Secret Message */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
            2
          </div>
          Secret Message
        </label>
        <textarea
          value={secretMessage}
          onChange={(e) => setSecretMessage(e.target.value)}
          placeholder="Enter the text you want to hide in the image..."
          className="w-full px-4 py-3 bg-white/5 border border-gray-600/50 rounded-xl 
                   text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 
                   focus:bg-white/10 transition-all resize-none"
          rows={5}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{secretMessage.length} characters</span>
          {secretMessage.length > 0 && (
            <span className="text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Message entered
            </span>
          )}
        </div>
      </div>

      {/* Step 3: Optional Encryption */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
              3
            </div>
            Encryption (Optional)
          </label>
          <button
            onClick={() => setUsePassword(!usePassword)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
              ${usePassword
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                : 'bg-white/5 text-gray-400 border border-gray-600/50 hover:border-violet-500/40'
              }`}
          >
            {usePassword ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {usePassword && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter encryption password"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-gray-600/50 rounded-xl 
                       text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 
                       focus:bg-white/10 transition-all"
            />
          </div>
        )}
      </div>

      {/* Status Preview */}
      <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <Eye className="w-4 h-4 text-violet-400" />
          <span className="font-medium">What will be sent:</span>
        </div>
        <div className="pl-6 space-y-1 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${coverImage ? 'bg-green-400' : 'bg-gray-600'}`} />
            <span>An innocent-looking image</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${secretMessage ? 'bg-green-400' : 'bg-gray-600'}`} />
            <span>Hidden message embedded inside (invisible)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${usePassword ? 'bg-green-400' : 'bg-gray-600'}`} />
            <span>Password protection: {usePassword ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-white/5 border border-gray-600/50 rounded-xl 
                   text-gray-300 font-medium hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSendSecurely}
          disabled={!isValid || loading}
          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
            ${isValid && !loading
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/50'
              : 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Send Securely</span>
            </>
          )}
        </button>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <OtpModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleOtpVerified}
          email={authUser.email}
          purpose="SEND"
        />
      )}
    </div>
  );
};

export default TextToImageTab;
