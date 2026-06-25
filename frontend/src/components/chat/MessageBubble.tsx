import { User, Activity } from 'lucide-react';

export type Role = 'user' | 'patient';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-patient'}`}>
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-patient'}`}>
        {isUser ? <User size={18} /> : <Activity size={18} />}
      </div>
      <div className="message-content glass-panel">
        <p>{message.content}</p>
        <span className="message-time">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
