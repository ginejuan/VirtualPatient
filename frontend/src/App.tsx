import { useState, useEffect } from 'react'
import './index.css'
import { SimulationPage } from './pages/SimulationPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { ProfessorDashboard } from './pages/ProfessorDashboard'
import { AdminDashboard } from './pages/AdminDashboard'

function MainApp() {
  const { user, token, logout } = useAuth();
  const [isSimulating, setIsSimulating] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('demo');

  useEffect(() => {
    if (user && user.role === 'student') {
      fetch(`${import.meta.env.VITE_API_URL || window.location.protocol + '//' + window.location.hostname + ':8000'}/cases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setCases(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].id.toString());
        }
      })
      .catch(err => console.error(err));
    }
  }, [user, token]);

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'professor') {
    return <ProfessorDashboard />;
  }

  if (isSimulating) {
    return <SimulationPage casoId={selectedCaseId} onBack={() => setIsSimulating(false)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: 'var(--spacing-xl)' }}>
      <header style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block' }}>{user.name}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>
            Salir
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: 'var(--spacing-xs)' }}>
          <img src="https://www.uca.es/wp-content/uploads/2017/11/logo-uca-color.png" alt="Logo UCA" style={{ height: '50px' }} />
          <h1 style={{ color: 'hsl(var(--color-primary-base))', fontSize: '2.5rem', margin: 0 }}>
            VirtualPatient<span style={{ color: 'hsl(var(--color-accent))'}}>UCA</span>
          </h1>
        </div>
        <p style={{ color: 'hsl(var(--color-text-muted))', fontSize: '1.1rem' }}>
          Simulación Clínica Avanzada con IA
        </p>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }} className="glass-panel">
        <div style={{ padding: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Hola, {user.name}</h2>
          <p style={{ marginBottom: 'var(--spacing-lg)', color: 'hsl(var(--color-text-muted))' }}>
            Este entorno te permite interactuar con pacientes virtuales obstétricas para practicar la anamnesis,
            el razonamiento clínico y el trato a la paciente en un ambiente seguro y controlado.
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <select 
              className="chat-input" 
              style={{ padding: '0.8rem', borderRadius: '8px', minWidth: '200px' }}
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
            >
              <option value="demo">Demo Caso #2041</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setIsSimulating(true)}>
              Iniciar Simulación
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          <MainApp />
        </div>
        <footer style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--bg-card)' }}>
          © Copyright 2026 Prof. Dr. Juan Jesús Fernández Alba - Universidad de Cádiz
        </footer>
      </div>
    </AuthProvider>
  )
}

export default App
