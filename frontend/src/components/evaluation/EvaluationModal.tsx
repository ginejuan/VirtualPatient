import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface EvaluationModalProps {
  onClose: () => void;
  onSubmit: (juicio: string) => Promise<void>;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({ onClose, onSubmit }) => {
  const [juicio, setJuicio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!juicio.trim()) return;
    setIsSubmitting(true);
    await onSubmit(juicio);
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel fade-in">
        <button className="btn-close" onClick={onClose} disabled={isSubmitting}>
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Juicio Clínico</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Describe tu diagnóstico diferencial, las pruebas que solicitarías y el tratamiento o manejo a seguir.
        </p>

        <textarea
          className="clinical-textarea"
          value={juicio}
          onChange={(e) => setJuicio(e.target.value)}
          placeholder="Ej: Paciente con posible cólico nefrítico. Solicito analítica de orina y ecografía..."
          disabled={isSubmitting}
        />

        <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!juicio.trim() || isSubmitting}
          >
            {isSubmitting ? (
               <span className="typing-indicator" style={{ padding: '0 10px'}}>
                 <span></span><span></span><span></span>
               </span>
            ) : (
              <>
                <Send size={16} style={{ marginRight: '8px' }} />
                Enviar y Evaluar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
