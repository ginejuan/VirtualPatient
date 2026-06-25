import React from 'react';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ResultsPageProps {
  result: {
    es_correcto: boolean;
    nota_final?: number;
    diagnostico_real: string;
    puntos_fuertes: string[];
    puntos_debiles: string[];
    feedback: string;
  };
  onBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ result, onBack }) => {
  return (
    <div className="simulation-page results-page">
      <header className="simulation-header glass-panel">
        <button onClick={onBack} className="btn-icon-text">
          <ArrowLeft size={20} />
          <span>Volver al Panel</span>
        </button>
        <h2>Resultados de Evaluación</h2>
        <div style={{ width: '100px' }}></div> {/* Spacer for flex layout */}
      </header>

      <main className="results-content fade-in">
        <div className="results-grid">
          <div className="glass-panel text-center result-card-main">
            <h3 className="result-title">Nota Final</h3>
            <div className={`score-circle ${result.nota_final && result.nota_final >= 5 ? 'score-pass' : 'score-fail'}`}>
              {result.nota_final !== undefined ? result.nota_final : (result.es_correcto ? '10' : '0')}
            </div>
            <div className="diagnosis-status">
              {result.es_correcto ? (
                <div className="status-badge success"><CheckCircle size={16} /> Diagnóstico Correcto</div>
              ) : (
                <div className="status-badge error"><XCircle size={16} /> Diagnóstico Incorrecto</div>
              )}
            </div>
            <p className="real-diagnosis">
              <strong>Diagnóstico Real:</strong><br/>
              {result.diagnostico_real}
            </p>
          </div>

          <div className="glass-panel feedback-card">
            <h3>Feedback Pedagógico</h3>
            <p className="feedback-text">{result.feedback}</p>
            
            <div className="points-container">
              <div className="points-column">
                <h4 className="points-title success-text"><CheckCircle size={18}/> Puntos Fuertes</h4>
                <ul className="points-list">
                  {result.puntos_fuertes?.map((punto, i) => (
                    <li key={i}>{punto}</li>
                  ))}
                  {(!result.puntos_fuertes || result.puntos_fuertes.length === 0) && (
                    <li className="text-muted">No se destacaron puntos fuertes.</li>
                  )}
                </ul>
              </div>

              <div className="points-column">
                <h4 className="points-title error-text"><AlertCircle size={18}/> Áreas de Mejora</h4>
                <ul className="points-list">
                  {result.puntos_debiles?.map((punto, i) => (
                    <li key={i}>{punto}</li>
                  ))}
                  {(!result.puntos_debiles || result.puntos_debiles.length === 0) && (
                    <li className="text-muted">No se detectaron errores importantes.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
