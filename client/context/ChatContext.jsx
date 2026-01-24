import { useContext, useState, useEffect, createContext } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  // Get all users for sidebar
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      console.log('📥 getMessages response:', {
        success: data.success,
        messageCount: data.message?.length,
        firstMessage: data.message?.[0] ? {
          id: data.message[0]._id,
          isSecure: data.message[0].isSecure,
          hasImage: !!data.message[0].image,
          imageUrl: data.message[0].image
        } : null
      });
      if (data.success) {
        setMessages(Array.isArray(data.message) ? data.message : []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Send message to selected user
  const sendMessage = async (messageData) => {
    // Debug: Log what we're sending
    console.log('📤 ChatContext sendMessage:', {
      isSecure: messageData.isSecure,
      stegoType: messageData.stegoType,
      hasMessage: !!messageData.message,
      hasCoverImage: !!messageData.coverImage,
      coverImageLength: messageData.coverImage?.length || 0,
      hasPassword: !!messageData.password
    });
    
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        // Append new message to state, don't replace entire array
        setMessages((prevMessages) => [
          ...(Array.isArray(prevMessages) ? prevMessages : []),
          data.newMessage
        ]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Subscribe to incoming messages via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      console.log("Socket received:", newMessage);

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        // Mark as seen and append to chat
        newMessage.seen = true;
        setMessages((prevMessages) => [
          ...(Array.isArray(prevMessages) ? prevMessages : []),
          newMessage
        ]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        // Increment unseen count for sender
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: prev[newMessage.senderId]
            ? prev[newMessage.senderId] + 1
            : 1
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
};
