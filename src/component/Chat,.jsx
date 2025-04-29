import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

function Chat() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const joinRoom = () => {
    if (roomId.trim() === '') return;
    
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io('http://localhost:5000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', {
        roomId: roomId,
        userName: username || undefined
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('message_history', (history) => {
      setMessages(history);
    });

    newSocket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    setSocket(newSocket);
  };

  const sendMessage = () => {
    if (message.trim() === '' || !socket) return;
    
    const messageData = { 
      room: roomId, 
      message: message.trim(),
      content: message.trim()
    };
    
    socket.emit('send_message', messageData);
    setMessage('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg, index) => {
    if (msg.type === 'system') {
      return (
        <div key={index} className="system-message">
          {msg.content}
        </div>
      );
    }

    const isCurrentUser = msg.isCurrentUser;
    
    return (
      <div 
        key={index} 
        className={`message-wrapper ${!isCurrentUser ? 'message-wrapper-other' : ''}`}
      >
        <div className={`message-bubble ${isCurrentUser ? 'message-bubble-current' : 'message-bubble-other'}`}>
          {!isCurrentUser && (
            <div className="sender-name">
              {msg.sender}
            </div>
          )}
          <div className="message-content">{msg.content}</div>
          <div className="message-time">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-container">
      {!socket || !isConnected ? (
        <div className="join-container">
          <h2 className="join-title">Join Chat Room</h2>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input-field"
            />
          </div>
          <button 
            onClick={joinRoom}
            className="join-button"
          >
            Join Chat
          </button>
        </div>
      ) : (
        <div className="chat-room">
          <div className="chat-header">
            <h3 className="room-title">Room: {roomId}</h3>
            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="messages-container">
            {messages.length === 0 ? (
              <p className="no-messages">
                No messages yet. Say hello!
              </p>
            ) : (
              messages.map((msg, i) => renderMessage(msg, i))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="message-input-area">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="message-input"
            />
            <button 
              onClick={sendMessage}
              disabled={!isConnected || message.trim() === ''}
              className={`send-button ${isConnected && message.trim() !== '' ? 'send-button-enabled' : 'send-button-disabled'}`}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;