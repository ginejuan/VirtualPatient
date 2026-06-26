import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, CheckCircle, XCircle, Plus, Search, UploadCloud, BookOpen, Edit2, Trash2 } from 'lucide-react';

export const ProfessorDashboard: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'cases'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  
  // States for new student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLastName1, setNewLastName1] = useState('');
  const [newLastName2, setNewLastName2] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTratamiento, setNewTratamiento] = useState('Doctor');

  // States for edit student modal
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentLastName1, setEditStudentLastName1] = useState('');
  const [editStudentLastName2, setEditStudentLastName2] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');
  const [editStudentTratamiento, setEditStudentTratamiento] = useState('Doctor');

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch(`/api/cases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCases(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCases();
  }, [token]);

  const fetchSimulations = async (student: any) => {
    setSelectedStudent(student);
    try {
      const res = await fetch(`/api/simulations/${student.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSimulations(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/students`, {
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
          password: newPassword,
          tratamiento: newTratamiento
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewEmail(''); setNewName(''); setNewLastName1(''); setNewLastName2(''); setNewPassword(''); setNewTratamiento('Doctor');
        fetchStudents();
      } else {
        alert("Error al añadir alumno (el email ya existe)");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditStudent = (student: any) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentLastName1(student.last_name_1 || '');
    setEditStudentLastName2(student.last_name_2 || '');
    setEditStudentEmail(student.email);
    setEditStudentTratamiento(student.tratamiento || 'Doctor');
    setEditStudentPassword('');
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          email: editStudentEmail, 
          name: editStudentName, 
          last_name_1: editStudentLastName1,
          last_name_2: editStudentLastName2,
          password: editStudentPassword,
          tratamiento: editStudentTratamiento
        })
      });
      if (res.ok) {
        setEditingStudent(null);
        fetchStudents();
        // If the selected student is being viewed in details, update that too if needed
        if (selectedStudent && selectedStudent.id === editingStudent.id) {
          setSelectedStudent({ ...selectedStudent, name: editStudentName });
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || "Error al editar alumno"}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar a este alumno y TODAS sus simulaciones? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedStudent && selectedStudent.id === id) {
          setSelectedStudent(null);
          setSimulations([]);
        }
        fetchStudents();
      } else {
        alert("Error al eliminar el alumno");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // States for new case upload
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseFile, setCaseFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseFile) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', caseTitle);
    formData.append('description', caseDescription);
    formData.append('file', caseFile);

    try {
      const res = await fetch(`/api/cases/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setCaseTitle(''); setCaseDescription(''); setCaseFile(null);
        fetchCases();
        alert("Caso subido con éxito a ChromaDB");
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Case editing and deletion
  const [editingCase, setEditingCase] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;
    try {
      const res = await fetch(`/api/cases/${editingCase.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: editTitle, description: editDescription })
      });
      if (res.ok) {
        setEditingCase(null);
        fetchCases();
      } else {
        alert("Error al actualizar el caso");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCase = async (caseId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este caso? Esta acción es irreversible.")) return;
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCases();
      } else {
        alert("Error al eliminar el caso");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/Logo_UCA.png" alt="Logo UCA" className="w-12 h-auto object-contain mr-3" />
          <div>
            <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', margin: 0 }}>Panel del Profesor</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestión de alumnos y auditoría de casos clínicos</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', marginRight: '1rem', borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
            <strong style={{ color: 'var(--text-main)', display: 'block' }}>{user?.name}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
          </div>
          <button className="btn btn-secondary" onClick={logout}>Salir</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('students')}
        >
          <Users size={18} style={{ marginRight: '8px' }} /> Alumnos
        </button>
        <button 
          className={`btn ${activeTab === 'cases' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('cases')}
        >
          <BookOpen size={18} style={{ marginRight: '8px' }} /> Casos Clínicos (RAG)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
        {activeTab === 'students' ? (
          <>
            {/* Lista de Alumnos */}
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Users size={20} /> Alumnos Matriculados
                </h3>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <Plus size={16} style={{ marginRight: '4px' }} />
                  Añadir Alumno
                </button>
              </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Nombre</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Simulaciones</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Nota Media</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', background: selectedStudent?.id === student.id ? 'rgba(0,0,0,0.03)' : 'transparent' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{student.name}</td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{student.email}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>{student.completed_simulations}</td>
                    <td style={{ padding: '1rem 0.5rem', color: student.average_score >= 5 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {student.completed_simulations > 0 ? student.average_score : '-'}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="btn-icon-text" onClick={() => fetchSimulations(student)} style={{ marginRight: '1rem' }}>
                         Ver Detalles
                      </button>
                      <button className="btn-icon-text" onClick={() => openEditStudent(student)} style={{ color: 'var(--text-secondary)', padding: '0.3rem' }} title="Editar">
                         <Edit2 size={16} />
                      </button>
                      <button className="btn-icon-text" onClick={() => handleDeleteStudent(student.id)} style={{ color: '#ef4444', padding: '0.3rem' }} title="Eliminar">
                         <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No hay alumnos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de Detalles (Auditoría) */}
        <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {selectedStudent ? (
            <>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} /> Historial de {selectedStudent.name}
              </h3>
              
              {simulations.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>El alumno no ha completado ninguna simulación.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {simulations.map(sim => (
                    <div key={sim.id} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <strong>Caso #{sim.caso_id}</strong>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(sim.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nota Final</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: sim.nota_final >= 5 ? '#10b981' : '#ef4444' }}>{sim.nota_final}</div>
                        </div>
                        <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)', flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Diagnóstico Correcto</div>
                          <div style={{ marginTop: '0.2rem' }}>
                            {sim.es_correcto ? <CheckCircle color="#10b981" /> : <XCircle color="#ef4444" />}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>Juicio Clínico del Alumno:</strong>
                        <p style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          {sim.juicio_clinico}
                        </p>
                      </div>

                      <details style={{ cursor: 'pointer', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <summary style={{ fontWeight: 500, color: 'var(--color-primary-base)' }}>Ver Transcripción Completa del Chat</summary>
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                          {sim.chat_history.map((msg: any, i: number) => (
                            <div key={i} style={{ padding: '0.5rem', background: msg.role === 'user' ? 'var(--color-primary-light)' : '#f3f4f6', borderRadius: '8px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                              <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                                {msg.role === 'user' ? 'Alumno' : 'Paciente'}
                              </strong>
                              <span style={{ fontSize: '0.9rem' }}>{msg.content}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Selecciona un alumno para ver su historial de simulaciones</p>
            </div>
          )}
        </div>
          </>
        ) : (
          <>
            {/* Panel de Gestión de Casos */}
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} /> Casos Disponibles
              </h3>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {cases.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No has subido ningún caso clínico todavía.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {cases.map(c => (
                      <div key={c.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{c.title}</h4>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{c.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => {
                              setEditingCase(c);
                              setEditTitle(c.title);
                              setEditDescription(c.description || '');
                            }}
                          >
                            Editar
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#ef4444', color: 'white', border: 'none' }}
                            onClick={() => handleDeleteCase(c.id)}
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Formulario de Subida de PDF */}
            <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} /> Subir Nuevo Caso (PDF)
              </h3>
              <form onSubmit={handleUploadCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Título del Caso</label>
                  <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={caseTitle} onChange={e => setCaseTitle(e.target.value)} placeholder="Ej: Preeclampsia 32 semanas" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Descripción (Opcional)</label>
                  <textarea className="chat-input" style={{ width: '100%', borderRadius: '8px', minHeight: '80px', resize: 'vertical' }} value={caseDescription} onChange={e => setCaseDescription(e.target.value)} placeholder="Breve resumen del caso y objetivos docentes..." />
                </div>
                <div style={{ border: '2px dashed var(--color-border)', padding: '2rem', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.01)' }}>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={e => setCaseFile(e.target.files ? e.target.files[0] : null)}
                    style={{ display: 'block', margin: '0 auto' }} 
                    required 
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: 0 }}>
                    Sube un PDF con la Historia Clínica y la Rúbrica de evaluación. El sistema RAG extraerá el texto y lo vectorizará en ChromaDB automáticamente.
                  </p>
                </div>
                <div style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={isUploading || !caseFile}>
                  {isUploading ? "Procesando e indexando..." : "Subir y Crear Caso"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Modal para añadir alumno */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in">
            <button className="btn-close" onClick={() => setShowAddModal(false)}>
              <XCircle size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Nuevo Alumno</h2>
            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '30%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Tratamiento</label>
                  <select className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newTratamiento} onChange={e => setNewTratamiento(e.target.value)}>
                    <option value="Doctor">Doctor</option>
                    <option value="Doctora">Doctora</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nombre</label>
                  <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
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
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email</label>
                <input required type="email" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Contraseña Inicial</label>
                <input required type="text" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar Alumno</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar alumno */}
      {editingStudent && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in">
            <button className="btn-close" onClick={() => setEditingStudent(null)}>
              <XCircle size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Alumno</h2>
            <form onSubmit={handleEditStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '30%' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Tratamiento</label>
                  <select className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editStudentTratamiento} onChange={e => setEditStudentTratamiento(e.target.value)}>
                    <option value="Doctor">Doctor</option>
                    <option value="Doctora">Doctora</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nombre</label>
                  <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editStudentName} onChange={e => setEditStudentName(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Primer Apellido</label>
                  <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editStudentLastName1} onChange={e => setEditStudentLastName1(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Segundo Apellido</label>
                  <input className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editStudentLastName2} onChange={e => setEditStudentLastName2(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email</label>
                <input required type="email" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editStudentEmail} onChange={e => setEditStudentEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nueva Contraseña (Opcional)</label>
                <input type="text" className="chat-input" style={{ width: '100%', borderRadius: '8px' }} placeholder="Dejar en blanco para no cambiarla" value={editStudentPassword} onChange={e => setEditStudentPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar caso */}
      {editingCase && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in">
            <button className="btn-close" onClick={() => setEditingCase(null)}>
              <XCircle size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Caso Clínico</h2>
            <form onSubmit={handleEditCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Título del Caso</label>
                <input required className="chat-input" style={{ width: '100%', borderRadius: '8px' }} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Descripción</label>
                <textarea className="chat-input" style={{ width: '100%', borderRadius: '8px', minHeight: '80px', resize: 'vertical' }} value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
