import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import type { Message } from './MessageBubble';
import { MessageBubble } from './MessageBubble';

export interface ChatBoxProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
}

// Support for browser speech APIs
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const synthesis = window.speechSynthesis;

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, isTyping, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Load voices
    if (synthesis) {
      synthesis.getVoices();
      synthesis.onvoiceschanged = () => synthesis.getVoices();
    }
    return () => {
      synthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'patient' && isVoiceEnabled) {
        speak(lastMessage.content);
      }
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!synthesis) return;
    synthesis.cancel(); // Stop current speech
    
    // Clean markdown images before speaking
    const cleanText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    
    const voices = synthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.lang.includes('es') && 
      (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('mujer') || 
       v.name.includes('Monica') || v.name.includes('Sabina') || v.name.includes('Helena'))
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    synthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      synthesis?.cancel();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el reconocimiento de voz. Usa Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInputValue(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    synthesis?.cancel();
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
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Consulta: Paciente #2041</h3>
          <span className="status-badge">Simulación Activa</span>
        </div>
        <button 
          onClick={toggleVoice} 
          className="btn-icon-text" 
          style={{ padding: '0.25rem 0.5rem', background: isVoiceEnabled ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
          title={isVoiceEnabled ? 'Silenciar paciente' : 'Activar voz de paciente'}
        >
          {isVoiceEnabled ? <Volume2 size={18} color="hsl(var(--color-primary-base))" /> : <VolumeX size={18} color="var(--text-muted)" />}
        </button>
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
        <button 
          onClick={toggleListening} 
          className={`btn btn-icon ${isListening ? 'btn-danger' : 'btn-secondary'}`}
          title={isListening ? 'Detener grabación' : 'Hablar por micrófono'}
          style={{ marginRight: '0.5rem' }}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Escuchando..." : "Hazle una pregunta a la paciente..."}
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
