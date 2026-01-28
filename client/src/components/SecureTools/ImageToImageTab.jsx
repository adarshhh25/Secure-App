import { useState } from 'react';
import { Upload, Image as ImageIcon, Layers, AlertCircle, Eye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const ImageToImageTab = ({ onSecureSend, onClose }) => {
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [secretImage, setSecretImage] = useState(null);
  const [secretPreview, setSecretPreview] = useState(null);

  const handleCoverImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Cover image must be under 10MB');
        return;
      }
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSecretImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Secret image must be under 5MB');
        return;
      }
      setSecretImage(file);
      setSecretPreview(URL.createObjectURL(file));
    }
  };

  const handleSend = async () => {
    if (!coverImage || !secretImage) {
      toast.error('Please select both cover and secret images');
      return;
    }

    try {
      await onSecureSend({
        type: 'image-image',
        coverImage,
        secretImage,
        isSecure: true,
        stegoType: 'image-image'
      });
      toast.success('Images processed successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to process images');
    }
  };

  const isValid = coverImage && secretImage;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-300 leading-relaxed">
          <span className="font-semibold text-blue-400">Image-in-Image Steganography</span>
          <br />
          Hide a secret image completely inside a cover image. The cover image will look normal, but contains hidden visual data.
        </p>
      </div>

      {/* Cover Image Card */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
            1
          </div>
          Cover Image (Visible)
        </label>
        
        <div className="p-4 bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20 rounded-xl space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverImage}
            className="hidden"
            id="cover-image"
          />
          
          {!coverPreview ? (
            <label
              htmlFor="cover-image"
              className="flex flex-col items-center gap-3 py-8 cursor-pointer group"
            >
              <div className="p-4 bg-violet-500/10 rounded-full group-hover:bg-violet-500/20 transition-colors">
                <ImageIcon className="w-8 h-8 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Upload cover image</p>
                <p className="text-xs text-gray-500 mt-1">This will be the visible image</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative group">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                  Cover
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{coverImage.name}</span>
                <button
                  onClick={() => {
                    setCoverImage(null);
                    setCoverPreview(null);
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

      {/* Connection Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-12 w-0.5 bg-gradient-to-b from-violet-500/50 to-purple-500/50" />
          <Layers className="w-5 h-5 text-violet-400" />
          <div className="h-12 w-0.5 bg-gradient-to-b from-purple-500/50 to-violet-500/50" />
        </div>
      </div>

      {/* Secret Image Card */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs">
            2
          </div>
          Secret Image (Hidden)
        </label>
        
        <div className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleSecretImage}
            className="hidden"
            id="secret-image"
          />
          
          {!secretPreview ? (
            <label
              htmlFor="secret-image"
              className="flex flex-col items-center gap-3 py-8 cursor-pointer group"
            >
              <div className="p-4 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Upload secret image</p>
                <p className="text-xs text-gray-500 mt-1">This will be hidden inside</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative group">
                <img
                  src={secretPreview}
                  alt="Secret"
                  className="w-full h-40 object-cover rounded-lg opacity-80"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-purple-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Secret
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{secretImage.name}</span>
                <button
                  onClick={() => {
                    setSecretImage(null);
                    setSecretPreview(null);
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

      {/* Preview Result */}
      {isValid && (
        <div className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
            <Eye className="w-4 h-4" />
            <span>Result Preview</span>
          </div>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>Recipients will see:</span>
              <span className="text-gray-300">Cover image only</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hidden content:</span>
              <span className="text-purple-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Secret image embedded
              </span>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleSend}
          disabled={!isValid}
          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
            ${isValid
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
              : 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hide & Send</span>
        </button>
      </div>
    </div>
  );
};

export default ImageToImageTab;
