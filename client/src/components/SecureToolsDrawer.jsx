import { useState } from 'react';
import { X, Lock, Image, FileImage, AudioWaveform, Info, Shield, Eye, EyeOff } from 'lucide-react';
import TextToImageTab from './SecureTools/TextToImageTab';
import ImageToImageTab from './SecureTools/ImageToImageTab';
import TextToAudioTab from './SecureTools/TextToAudioTab';

const SecureToolsDrawer = ({ isOpen, onClose, onSecureSend }) => {
  const [activeTab, setActiveTab] = useState('text-image');

  const tabs = [
    { 
      id: 'text-image', 
      label: 'Text → Image', 
      icon: Image,
      description: 'Hide text message inside an image'
    },
    { 
      id: 'image-image', 
      label: 'Image → Image', 
      icon: FileImage,
      description: 'Conceal an image within another image'
    },
    { 
      id: 'text-audio', 
      label: 'Text → Audio', 
      icon: AudioWaveform,
      description: 'Embed text message in audio file'
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'text-image':
        return <TextToImageTab onSecureSend={onSecureSend} onClose={onClose} />;
      case 'image-image':
        return <ImageToImageTab onSecureSend={onSecureSend} onClose={onClose} />;
      case 'text-audio':
        return <TextToAudioTab onSecureSend={onSecureSend} onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] lg:w-[560px] 
          bg-gradient-to-br from-gray-900/95 via-purple-900/20 to-gray-900/95 
          backdrop-blur-2xl border-l border-purple-500/20 shadow-2xl
          transform transition-transform duration-300 ease-out z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-500/20 bg-black/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Lock className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Secure Tools</h2>
                <p className="text-xs text-gray-400">Advanced steganography features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <Info className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="font-semibold text-violet-400">What is steganography?</span>
              <br />
              Hide secret messages inside images or audio files. Only recipients with the right password can reveal the hidden content.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-purple-500/20 bg-black/10">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl
                    transition-all duration-200 group relative overflow-hidden
                    ${activeTab === tab.id
                      ? 'bg-violet-500/20 border border-violet-500/40 shadow-lg shadow-violet-500/20'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30'
                    }`}
                >
                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500" />
                  )}
                  
                  <Icon className={`w-5 h-5 transition-colors
                    ${activeTab === tab.id ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-400'}`} 
                  />
                  <span className={`text-xs font-medium transition-colors
                    ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Description */}
          <div className="mt-3 px-3 py-2 bg-violet-500/5 rounded-lg border border-violet-500/10">
            <p className="text-xs text-gray-400 text-center">
              {tabs.find(t => t.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-black/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span>End-to-end encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              <span>Invisible to third parties</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SecureToolsDrawer;
