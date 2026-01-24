import React, { useState, useRef, useContext } from 'react';
import { ChatContext } from '../../context/ChatContext';
import toast from 'react-hot-toast';

/**
 * Secure Send Panel Component
 * Provides steganography controls for secure message sending
 */
const SecureSendPanel = ({ onSecureSend, isExpanded, onToggle }) => {
  const [stegoType, setStegoType] = useState('text-image');
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(true);
  const [coverImage, setCoverImage] = useState(null);
  const [secretImage, setSecretImage] = useState(null);
  const [secretMessage, setSecretMessage] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capacity, setCapacity] = useState(null);

  const coverImageRef = useRef(null);
  const secretImageRef = useRef(null);
  const audioRef = useRef(null);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle cover image selection
  const handleCoverImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const base64 = await fileToBase64(file);
    setCoverImage({ file, base64, name: file.name });

    // Check capacity
    try {
      const response = await fetch('/api/stego/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      const data = await response.json();
      if (data.success) {
        setCapacity(data.capacity);
      }
    } catch (err) {
      console.error('Capacity check failed:', err);
    }
  };

  // Handle secret image selection
  const handleSecretImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const base64 = await fileToBase64(file);
    setSecretImage({ file, base64, name: file.name });
  };

  // Handle audio file selection
  const handleAudioSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.wav')) {
      toast.error('Only WAV audio files are supported');
      return;
    }

    const base64 = await fileToBase64(file);
    setAudioFile({ file, base64, name: file.name });
  };

  // Handle secure send
  const handleSecureSend = async () => {
    if (isProcessing) return;

    // Validation
    if (stegoType === 'text-image') {
      if (!coverImage) {
        toast.error('Please select a cover image');
        return;
      }
      if (!secretMessage.trim()) {
        toast.error('Please enter a secret message');
        return;
      }
      if (useEncryption && !password) {
        toast.error('Please enter an encryption password');
        return;
      }
    } else if (stegoType === 'image-image') {
      if (!coverImage) {
        toast.error('Please select a cover image');
        return;
      }
      if (!secretImage) {
        toast.error('Please select a secret image to hide');
        return;
      }
    } else if (stegoType === 'audio') {
      if (!audioFile) {
        toast.error('Please select a WAV audio file');
        return;
      }
      if (!secretMessage.trim()) {
        toast.error('Please enter a secret message');
        return;
      }
    }

    setIsProcessing(true);

    try {
      await onSecureSend({
        stegoType,
        message: secretMessage,
        coverImage: coverImage?.base64,
        secretImage: secretImage?.base64,
        audio: audioFile?.base64,
        password: useEncryption ? password : null,
        isSecure: true
      });

      // Reset form
      setSecretMessage('');
      setCoverImage(null);
      setSecretImage(null);
      setAudioFile(null);
      setPassword('');
      setCapacity(null);
      
      toast.success('🔒 Secure message sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to send secure message');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all selections
  const handleClear = () => {
    setSecretMessage('');
    setCoverImage(null);
    setSecretImage(null);
    setAudioFile(null);
    setPassword('');
    setCapacity(null);
    if (coverImageRef.current) coverImageRef.current.value = '';
    if (secretImageRef.current) secretImageRef.current.value = '';
    if (audioRef.current) audioRef.current.value = '';
  };

  return (
    <div className="border-t border-stone-600 bg-black/30 backdrop-blur-sm">
      {/* Toggle Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-violet-400">
          <span className="text-lg">🔐</span>
          <span className="font-medium">Secure Send Panel</span>
          {isExpanded && (
            <span className="text-xs bg-violet-500/30 px-2 py-0.5 rounded-full">
              {stegoType === 'text-image' && 'Text → Image'}
              {stegoType === 'image-image' && 'Image → Image'}
              {stegoType === 'audio' && 'Audio Stego'}
            </span>
          )}
        </span>
        <span className="text-gray-400">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Stego Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setStegoType('text-image')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                stegoType === 'text-image'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              📝 Text → Image
            </button>
            <button
              onClick={() => setStegoType('image-image')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                stegoType === 'image-image'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🖼️ Image → Image
            </button>
            <button
              onClick={() => setStegoType('audio')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                stegoType === 'audio'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🔊 Audio Stego
            </button>
          </div>

          {/* Text → Image Mode */}
          {stegoType === 'text-image' && (
            <div className="space-y-3">
              {/* Cover Image Selection */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cover Image (message will be hidden here)</label>
                <div className="flex gap-2">
                  <input
                    ref={coverImageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/bmp"
                    onChange={handleCoverImageSelect}
                    className="hidden"
                    id="cover-image"
                  />
                  <label
                    htmlFor="cover-image"
                    className="flex-1 py-2 px-3 bg-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/20 transition-colors text-center"
                  >
                    {coverImage ? `📷 ${coverImage.name}` : '📷 Select Cover Image'}
                  </label>
                  {coverImage && (
                    <img src={coverImage.base64} alt="Cover" className="w-10 h-10 rounded object-cover" />
                  )}
                </div>
                {capacity && (
                  <p className="text-xs text-gray-500 mt-1">
                    Capacity: ~{capacity.max_chars.toLocaleString()} characters
                  </p>
                )}
              </div>

              {/* Secret Message */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Message</label>
                <textarea
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  placeholder="Enter your secret message..."
                  className="w-full py-2 px-3 bg-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Encryption Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEncryption}
                    onChange={(e) => setUseEncryption(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-gray-600 text-violet-500 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-300">🔑 AES-256 Encryption</span>
                </label>
              </div>

              {/* Password Field */}
              {useEncryption && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Encryption Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter encryption password..."
                    className="w-full py-2 px-3 bg-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Image → Image Mode */}
          {stegoType === 'image-image' && (
            <div className="space-y-3">
              {/* Cover Image */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cover Image (visible image)</label>
                <div className="flex gap-2">
                  <input
                    ref={coverImageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/bmp"
                    onChange={handleCoverImageSelect}
                    className="hidden"
                    id="cover-image-ii"
                  />
                  <label
                    htmlFor="cover-image-ii"
                    className="flex-1 py-2 px-3 bg-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/20 transition-colors text-center"
                  >
                    {coverImage ? `📷 ${coverImage.name}` : '📷 Select Cover Image'}
                  </label>
                  {coverImage && (
                    <img src={coverImage.base64} alt="Cover" className="w-10 h-10 rounded object-cover" />
                  )}
                </div>
              </div>

              {/* Secret Image */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Image (will be hidden)</label>
                <div className="flex gap-2">
                  <input
                    ref={secretImageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/bmp"
                    onChange={handleSecretImageSelect}
                    className="hidden"
                    id="secret-image"
                  />
                  <label
                    htmlFor="secret-image"
                    className="flex-1 py-2 px-3 bg-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/20 transition-colors text-center"
                  >
                    {secretImage ? `🔒 ${secretImage.name}` : '🔒 Select Secret Image'}
                  </label>
                  {secretImage && (
                    <img src={secretImage.base64} alt="Secret" className="w-10 h-10 rounded object-cover" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audio Mode */}
          {stegoType === 'audio' && (
            <div className="space-y-3">
              {/* Audio File */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Audio File (WAV only)</label>
                <input
                  ref={audioRef}
                  type="file"
                  accept=".wav"
                  onChange={handleAudioSelect}
                  className="hidden"
                  id="audio-file"
                />
                <label
                  htmlFor="audio-file"
                  className="block py-2 px-3 bg-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/20 transition-colors text-center"
                >
                  {audioFile ? `🔊 ${audioFile.name}` : '🔊 Select WAV Audio'}
                </label>
              </div>

              {/* Secret Message */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Secret Message</label>
                <textarea
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  placeholder="Enter your secret message..."
                  className="w-full py-2 px-3 bg-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleSecureSend}
              disabled={isProcessing}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                isProcessing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-violet-500 text-white hover:bg-violet-600'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Encoding...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Send Securely</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureSendPanel;
