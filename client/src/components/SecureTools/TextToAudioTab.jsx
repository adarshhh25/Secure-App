import { useState } from 'react';
import { Upload, AudioWaveform, Lock, AlertCircle, Eye, Music } from 'lucide-react';
import toast from 'react-hot-toast';

const TextToAudioTab = ({ onSecureSend, onClose }) => {
  const [audioFile, setAudioFile] = useState(null);
  const [secretMessage, setSecretMessage] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  const handleAudioSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.includes('audio')) {
        toast.error('Please select an audio file');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Audio file must be under 20MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleSend = async () => {
    if (!audioFile || !secretMessage.trim()) {
      toast.error('Please provide both audio file and secret message');
      return;
    }
    if (usePassword && !password) {
      toast.error('Please enter an encryption password');
      return;
    }

    try {
      await onSecureSend({
        type: 'text-audio',
        audio: audioFile,
        message: secretMessage,
        password: usePassword ? password : null,
        isSecure: true,
        stegoType: 'audio'
      });
      toast.success('Audio message prepared!');
      onClose();
    } catch (error) {
      toast.error('Failed to process audio');
    }
  };

  const isValid = audioFile && secretMessage.trim() && (!usePassword || password);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-300 leading-relaxed">
          <span className="font-semibold text-amber-400">Audio Steganography</span>
          <br />
          Embed text messages within audio files. The audio sounds identical, but contains hidden data in the waveform.
        </p>
      </div>

      {/* Step 1: Audio File */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
            1
          </div>
          Audio File (Carrier)
        </label>
        
        <div className={`p-4 border border-dashed rounded-xl transition-all
          ${audioFile
            ? 'border-violet-500/40 bg-violet-500/5'
            : 'border-gray-600/50 bg-white/5 hover:border-violet-500/40'
          }`}>
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
            id="audio-file"
          />
          
          {!audioFile ? (
            <label
              htmlFor="audio-file"
              className="flex flex-col items-center gap-3 py-6 cursor-pointer"
            >
              <div className="p-4 bg-violet-500/10 rounded-full">
                <AudioWaveform className="w-8 h-8 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Upload audio file</p>
                <p className="text-xs text-gray-500 mt-1">MP3, WAV, or other formats • Max 20MB</p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              {/* Audio Player */}
              <div className="p-4 bg-black/20 rounded-lg">
                <audio controls className="w-full">
                  <source src={URL.createObjectURL(audioFile)} />
                </audio>
              </div>
              
              {/* Audio Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">
                    {audioFile.name}
                  </span>
                </div>
                <button
                  onClick={() => setAudioFile(null)}
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
        <div className="relative">
          <textarea
            value={secretMessage}
            onChange={(e) => setSecretMessage(e.target.value)}
            placeholder="Enter the text message to hide in the audio..."
            className="w-full px-4 py-3 bg-white/5 border border-gray-600/50 rounded-xl 
                     text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 
                     focus:bg-white/10 transition-all resize-none"
            rows={5}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            {secretMessage.length} chars
          </div>
        </div>
      </div>

      {/* Step 3: Optional Encryption */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs">
              3
            </div>
            Password Protection
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
              placeholder="Encryption password"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-gray-600/50 rounded-xl 
                       text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 
                       focus:bg-white/10 transition-all"
            />
          </div>
        )}
      </div>

      {/* Preview Result */}
      {isValid && (
        <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
            <Eye className="w-4 h-4" />
            <span>What will be sent</span>
          </div>
          <div className="space-y-1 pl-6 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Audio file (sounds normal when played)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Hidden message in audio waveform</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${usePassword ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span>Encryption: {usePassword ? 'Yes' : 'No'}</span>
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
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/50'
              : 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            }`}
        >
          <AudioWaveform className="w-4 h-4" />
          <span>Embed & Send</span>
        </button>
      </div>
    </div>
  );
};

export default TextToAudioTab;
