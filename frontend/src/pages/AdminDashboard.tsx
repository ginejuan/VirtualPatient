import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, XCircle, Users } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [professors, setProfessors] = useState<any[]>([]);
  
  // States for new professor modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newLastName1, setNewLastName1] = useState('');
  const [newLastName2, setNewLastName2] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchProfessors = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/professors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProfessors(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfessors();
  }, [token]);

  const handleAddProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/professors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          email: newEmail, 
          name: newName, 
          last_name_1: newLastName1,
          last_name_2: newLastName2,
          password: newPassword 
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmail(''); setNewName(''); setNewLastName1(''); setNewLastName2(''); setNewPassword('');
        fetchProfessors();
      } else {
        alert("Error al añadir profesor (el email ya existe)");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={32} color="var(--color-primary-base)" />
            Panel de Administrador
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión global de profesores</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', marginRight: '1rem', borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block' }}>{user?.name}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            Añadir Profesor
          </button>
          <button className="btn btn-secondary" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} /> Profesores Activos
        </h3>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Nombre</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Alumnos a su cargo</th>
              </tr>
            </thead>
            <tbody>
              {professors.map(prof => (
                <tr key={prof.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{prof.name}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{prof.email}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ background: 'var(--color-primary-light)', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem' }}>
                      {prof.students_count} alumnos
                    </span>
                  </td>
                </tr>
              ))}
              {professors.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No hay profesores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para añadir profesor */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in">
            <button className="btn-close" onClick={() => setShowAddModal(false)}>
              <XCircle size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Nuevo Profesor</h2>
            <form onSubmit={handleAddProfessor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nombre</label>
                <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Primer Apellido</label>
                  <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newLastName1} onChange={e => setNewLastName1(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Segundo Apellido</label>
                  <input className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newLastName2} onChange={e => setNewLastName2(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email Institucional</label>
                <input required type="email" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Contraseña Inicial</label>
                <input required type="text" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar Profesor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
