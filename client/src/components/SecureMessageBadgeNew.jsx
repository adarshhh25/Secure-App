import { useState } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SecureMessageBadge = ({ message, onDecode }) => {
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedContent, setDecodedContent] = useState(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  if (!message.isSecure) return null;

  const getStegoTypeLabel = () => {
    switch (message.stegoType) {
      case 'text-image': return 'Text → Image';
      case 'image-image': return 'Image → Image';
      case 'audio': return 'Text → Audio';
      default: return 'Secure Message';
    }
  };

  const getStegoTypeColor = () => {
    switch (message.stegoType) {
      case 'text-image': return 'violet';
      case 'image-image': return 'purple';
      case 'audio': return 'pink';
      default: return 'violet';
    }
  };

  const handleDecodeClick = async () => {
    if (message.isEncrypted && !showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    if (message.isEncrypted && !password) {
      toast.error('Please enter the decryption password');
      return;
    }

    try {
      setIsDecoding(true);
      setError(null);
      
      const result = await onDecode(message, password || null);
      
      if (result.success) {
        setDecodedContent(result.text || result.image);
        toast.success('Message decoded successfully!');
        setShowPasswordInput(false);
      } else {
        setError(result.error || 'Failed to decode message');
        toast.error(result.error || 'Failed to decode message');
      }
    } catch (error) {
      setError(error.message || 'Decoding error');
      toast.error(error.message || 'Failed to decode message');
    } finally {
      setIsDecoding(false);
    }
  };

  const color = getStegoTypeColor();
  
  return (
    <div className="mt-3 space-y-2">
      {/* Secure Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg 
        bg-${color}-500/10 border border-${color}-500/30`}>
        <Shield className={`w-3.5 h-3.5 text-${color}-400`} />
        <span className={`text-xs font-medium text-${color}-300`}>
          {getStegoTypeLabel()}
        </span>
        {message.isEncrypted && (
          <Lock className={`w-3 h-3 text-${color}-400`} />
        )}
      </div>

      {/* Decode Section */}
      {!decodedContent && (
        <div className="space-y-2">
          {showPasswordInput && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full pl-9 pr-4 py-2 bg-black/30 border border-gray-600/50 rounded-lg 
                           text-white text-sm placeholder-gray-500 focus:outline-none 
                           focus:border-violet-500/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleDecodeClick()}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleDecodeClick}
            disabled={isDecoding}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all ${isDecoding
                ? 'bg-gray-600/20 text-gray-500 cursor-wait'
                : `bg-${color}-500/20 hover:bg-${color}-500/30 text-${color}-300 border border-${color}-500/30`
              }`}
          >
            {isDecoding ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                <span>Decoding...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>{showPasswordInput ? 'Decode Now' : 'Reveal Hidden Message'}</span>
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Decoded Content */}
      {decodedContent && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-300">Decoded Message:</span>
          </div>
          {typeof decodedContent === 'string' ? (
            <p className="text-sm text-white pl-6">{decodedContent}</p>
          ) : (
            <img 
              src={decodedContent} 
              alt="Decoded" 
              className="w-full rounded-lg mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SecureMessageBadge;
