import { useContext, useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import SecureSendPanel from './SecureSendPanel'
import SecureMessageBadge from './SecureMessageBadge'
import toast from 'react-hot-toast'

const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } = useContext(ChatContext)
  const { authUser, onlineUsers } = useContext(AuthContext)

  const scrollEnd = useRef()
  const [input, setInput] = useState('')
  const [securePanelExpanded, setSecurePanelExpanded] = useState(false)

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
      await sendMessage(secureData)
      toast.success('Secure message sent!')
    } catch (error) {
      toast.error('Failed to send secure message')
    }
  }

  // 🔓 Handle decoding a secure message
  const handleDecodeMessage = async (message, password = null) => {
    try {
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

      // Get token from localStorage
      const token = localStorage.getItem('token')
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Decoding failed')
      }

      // Respect backend success flag
      if (data.success === false) {
        return {
          success: false,
          error: data.message || data.error || 'Decoding failed',
          text: data.text // Pass text if needed for debugging
        }
      }

      return {
        success: true,
        text: data.text || null,
        image: data.image || null,
        secretImage: data.secretImage || null, // Handle image-image result
      }
    } catch (error) {
      console.error('Decode error:', error)
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

      {/* Secure Send Panel */}
      <SecureSendPanel
        isExpanded={securePanelExpanded}
        onToggle={() => setSecurePanelExpanded(!securePanelExpanded)}
        onSecureSend={handleSecureSend}
      />

      {/* Regular Input */}
      {!securePanelExpanded && (
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 text-white px-4 py-2 rounded-full 
                       focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleSendImage}
              className="hidden"
            />
            <img src={assets.gallery_icon} alt="" className="w-6" />
          </label>
          <button type="submit">
            <img src={assets.send_button} alt="" className="w-8" />
          </button>
        </form>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <img src={assets.logo_icon} alt="" className="w-16 mb-4" />
      <p className="text-lg">Select a chat to start messaging</p>
    </div>
  )
}

export default ChatContainer
