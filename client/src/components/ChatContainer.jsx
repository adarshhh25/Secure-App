import { useContext, useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import SecureToolsDrawer from './SecureToolsDrawer'
import SecureMessageBadge from './SecureMessageBadge'
import { Lock, Send, Image as ImageIcon, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'

const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } = useContext(ChatContext)
  const { authUser, onlineUsers } = useContext(AuthContext)

  const scrollEnd = useRef()
  const [input, setInput] = useState('')
  const [secureDrawerOpen, setSecureDrawerOpen] = useState(false)

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (input.trim() === '') return

    await sendMessage({ text: input.trim() })
    setInput('')
  }

  // Handle sending a secure message
  const handleSecureSend = async (secureData) => {
    try {
      console.log('🔒 handleSecureSend called with:', {
        hasImage: !!secureData.image,
        isBlob: secureData.image instanceof Blob,
        isSecure: secureData.isSecure,
        stegoType: secureData.stegoType
      });

      // If image is a Blob, convert it to base64
      if (secureData.image && secureData.image instanceof Blob) {
        console.log('📦 Converting Blob to base64...');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const messageData = {
            ...secureData,
            image: reader.result // base64 string
          };
          console.log('✅ Blob converted, sending message with base64 image');
          await sendMessage(messageData);
          toast.success('Secure message sent!');
        };
        reader.readAsDataURL(secureData.image);
      } else {
        await sendMessage(secureData);
        toast.success('Secure message sent!');
      }
    } catch (error) {
      console.error('❌ Error sending secure message:', error);
      toast.error('Failed to send secure message');
    }
  }

  // 🔓 Handle decoding a secure message
  const handleDecodeMessage = async (message, password = null) => {
    try {
      console.log('🔓 Starting decode for message:', {
        type: message.stegoType,
        hasImage: !!message.image,
        hasPassword: !!password
      })

      let endpoint = ''
      let body = {}

      // Determine endpoint based on stegoType
      switch (message.stegoType) {
        case 'text-image':
          endpoint = '/api/stego/decode/text-image'
          body = { imageUrl: message.image, password: password || undefined }
          break
        case 'image-image':
          endpoint = '/api/stego/decode/image-image'
          body = { imageUrl: message.image }
          break
        case 'audio':
          endpoint = '/api/stego/decode/audio'
          body = { audioUrl: message.audio, password: password || undefined }
          break
        default:
          throw new Error('Unknown stego type')
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

      console.log(`📤 Making request to: ${backendUrl}${endpoint}`)

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Send cookies with request
        body: JSON.stringify(body),
      })

      const data = await response.json()
      console.log('📥 Decode response:', { success: data.success, hasText: !!data.text, hasError: !!data.error })

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Decoding failed'
        console.error('❌ Decode request failed:', errorMsg)
        throw new Error(errorMsg)
      }

      // Respect backend success flag
      if (data.success === false) {
        console.warn('⚠️ Backend marked decode as unsuccessful:', data.message || data.error)
        return {
          success: false,
          error: data.message || data.error || 'Decoding failed',
          text: data.text // Pass text if needed for debugging
        }
      }

      console.log('✅ Decode successful')
      return {
        success: true,
        text: data.text || null,
        image: data.image || null,
        secretImage: data.secretImage || null, // Handle image-image result
      }
    } catch (error) {
      console.error('❌ Decode error:', {
        message: error.message,
        stack: error.stack
      })
      return {
        success: false,
        error: error.message || 'Failed to decode message',
      }
    }
  }

  // Handle sending an image
  const handleSendImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id)
    }
  }, [selectedUser])

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return selectedUser ? (
    <div className="h-full overflow-scroll flex flex-col backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <p className="flex-1 font-medium text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="w-5 cursor-pointer"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg._id || index}
            className={`flex ${msg.senderId === authUser._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${msg.senderId === authUser._id
                  ? 'bg-violet-500/30 rounded-br-none'
                  : 'bg-white/10 rounded-bl-none'
                }`}
            >
              {/* Show image if exists */}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="attachment"
                  className="max-w-full rounded-lg mb-2"
                />
              )}

              {/* Show audio if exists */}
              {msg.audio && (
                <audio controls className="max-w-full mb-2">
                  <source src={msg.audio} type="audio/wav" />
                </audio>
              )}

              {/* Show text only if NOT secure (secure text is hidden in image) */}
              {msg.text && !msg.isSecure && (
                <p className="text-white">{msg.text}</p>
              )}

              {/* 🔐 Secure Message Badge with Decode Button */}
              <SecureMessageBadge message={msg} onDecode={handleDecodeMessage} />

              {/* Timestamp */}
              <p className="text-xs text-gray-400 mt-1">
                {formatMessageTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>

      {/* Message Input Area - Modern Design */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-4">
          {/* Secure Tools Button */}
          <button
            type="button"
            onClick={() => setSecureDrawerOpen(true)}
            className="p-3 bg-violet-500/20 hover:bg-violet-500/30 rounded-xl border border-violet-500/40 
                     transition-all group relative"
            title="Secure Send Tools"
          >
            <Lock className="w-5 h-5 text-violet-400 group-hover:text-violet-300" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 text-white px-5 py-3 rounded-2xl 
                     focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white/15
                     placeholder-gray-500 transition-all"
          />

          {/* Image Upload Button */}
          <label className="p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all">
            <input
              type="file"
              accept="image/*"
              onChange={handleSendImage}
              className="hidden"
            />
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </label>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-3 rounded-xl transition-all flex items-center justify-center
              ${input.trim()
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/50'
                : 'bg-gray-600/20 cursor-not-allowed'
              }`}
          >
            <Send className={`w-5 h-5 ${input.trim() ? 'text-white' : 'text-gray-500'}`} />
          </button>
        </form>
      </div>

      {/* Secure Tools Drawer */}
      <SecureToolsDrawer
        isOpen={secureDrawerOpen}
        onClose={() => setSecureDrawerOpen(false)}
        onSecureSend={handleSecureSend}
      />
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <img src={assets.logo_icon} alt="" className="w-16 mb-4" />
      <p className="text-lg">Select a chat to start messaging</p>
    </div>
  )
}

export default ChatContainer
