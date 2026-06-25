import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Message } from './MessageBubble';
import { MessageBubble } from './MessageBubble';

export interface ChatBoxProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, isTyping, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-container glass-panel">
      <div className="chat-header">
        <h3>Consulta: Paciente #2041</h3>
        <span className="status-badge">Simulación Activa</span>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="message-wrapper message-patient">
            <div className="message-avatar avatar-patient">
               <div className="typing-indicator">
                 <span></span><span></span><span></span>
               </div>
            </div>
            <div className="message-content glass-panel typing-box">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hazle una pregunta a la paciente..."
          className="chat-input"
          disabled={isTyping}
        />
        <button 
          onClick={handleSend} 
          className="btn btn-primary btn-icon"
          disabled={!inputValue.trim() || isTyping}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
