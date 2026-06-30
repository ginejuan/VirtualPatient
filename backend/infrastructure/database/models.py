from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # 'student', 'professor', 'admin'
    name = Column(String)
    last_name_1 = Column(String, nullable=True)
    last_name_2 = Column(String, nullable=True)
    tratamiento = Column(String, default="Doctor")
    professor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    simulations = relationship("Simulation", back_populates="student")


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    caso_id = Column(String, nullable=False)
    
    # Se guardará la lista de mensajes en JSON
    chat_history = Column(JSON, nullable=False)
    
    # Evaluación
    juicio_clinico = Column(Text)
    nota_final = Column(Float)
    es_correcto = Column(Integer) # SQLite no tiene bool nativo, usamos 1/0
    feedback = Column(Text)
    diagnostico_real = Column(String)
    puntos_fuertes = Column(JSON)
    puntos_debiles = Column(JSON)
    
    evaluacion_rubrica = Column(String)  # JSON o texto de por qué tiene esa nota
    
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", back_populates="simulations")

class ClinicalCase(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gestational_weeks = Column(Integer, nullable=True)
    reason = Column(String, nullable=True)
    rubric = Column(Text, nullable=True)
    chroma_id = Column(String, nullable=False, unique=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
