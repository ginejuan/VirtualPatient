import { useState } from 'react';
import { ChatBox } from '../components/chat/ChatBox';
import type { Message } from '../components/chat/MessageBubble';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import { EvaluationModal } from '../components/evaluation/EvaluationModal';
import { ResultsPage } from './ResultsPage';
import { useAuth } from '../context/AuthContext';

interface SimulationPageProps {
  casoId: string | number;
  onBack: () => void;
}

export const SimulationPage = ({ casoId, onBack }: SimulationPageProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'patient',
      content: 'Hola doctor... vengo porque no me encuentro muy bien hoy.',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const { token } = useAuth();

  const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      const response = await fetch(`/api/simular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: newUserMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          caso_id: casoId
        })
      });

      if (!response.ok) throw new Error('Error en el servidor');

      const data = await response.json();
      const newPatientMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'patient',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newPatientMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'patient',
        content: 'Lo siento, ha habido un problema de conexión. ¿Puedes repetirlo?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEvaluate = async (juicioClinico: string) => {
    try {
      const response = await fetch(`/api/evaluar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          history: messages.map(m => ({ role: m.role, content: m.content })),
          juicio_clinico: juicioClinico,
          caso_id: casoId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al evaluar');
      }
      const data = await response.json();
      setEvaluationResult(data.evaluacion);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Hubo un error al evaluar. Revisa la consola.");
    }
  };

  if (evaluationResult) {
    return <ResultsPage result={evaluationResult} onBack={onBack} />;
  }

  return (
    <div className="simulation-page">
      <header className="simulation-header glass-panel">
        <button onClick={onBack} className="btn-icon-text">
          <ArrowLeft size={20} />
          <span>Volver al Panel</span>
        </button>
        <h2>Sala de Consulta</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-finish">
          <Stethoscope size={18} style={{ marginRight: '8px' }} />
          Finalizar Diagnóstico
        </button>
      </header>

      <main className="simulation-content">
        <div className="patient-sidebar glass-panel">
          <h3>Datos Clínicos Conocidos</h3>
          <ul className="clinical-data-list">
             <li><strong>Edad:</strong> 28 años</li>
             <li><strong>Semanas Gestación:</strong> 32 semanas</li>
             <li><strong>Motivo de consulta:</strong> Derivada de urgencias por malestar general.</li>
          </ul>
          <div className="info-alert">
             La información completa solo se revelará a través de tu anamnesis.
          </div>
        </div>

        <div className="chat-area">
          <ChatBox 
            messages={messages} 
            isTyping={isTyping} 
            onSendMessage={handleSendMessage} 
          />
        </div>
      </main>

      {showModal && (
        <EvaluationModal 
          onClose={() => setShowModal(false)} 
          onSubmit={handleEvaluate} 
        />
      )}
    </div>
  );
};
