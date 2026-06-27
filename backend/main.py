from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from sqlalchemy import text

from infrastructure.providers.chroma_provider import ChromaProvider
from infrastructure.providers.groq_provider import GroqProvider
from infrastructure.database.database import Base, engine, get_db
from infrastructure.database.models import User, Simulation, ClinicalCase
from infrastructure.auth.auth_handler import verify_password, get_password_hash, create_access_token, decode_access_token
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import json
import PyPDF2
import io

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN tratamiento VARCHAR DEFAULT 'Doctor'"))
        conn.commit()
except Exception:
    pass


load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Inyección de dependencia para obtener el usuario actual
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


load_dotenv()

# Instanciar el proveedor de LLM
llm_provider = GroqProvider()

class ChatMessage(BaseModel):
    role: str
    content: str

class SimularRequest(BaseModel):
    query: str
    history: List[ChatMessage]
    caso_id: str

class EvaluarRequest(BaseModel):
    history: List[ChatMessage]
    juicio_clinico: str
    caso_id: str


app = FastAPI(
    title="VirtualPatientUCA API",
    description="Backend API for the virtual gynecological patient simulation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to VirtualPatientUCA API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- AUTHENTICATION ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    last_name_1: str = ""
    last_name_2: str = ""
    tratamiento: str = "Doctor"

class EditStudentRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    last_name_1: Optional[str] = None
    last_name_2: Optional[str] = None
    tratamiento: Optional[str] = None

@app.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Solo para desarrollo: en producción deberías proteger esta ruta (ej. solo el admin puede registrar)
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        name=request.name,
        last_name_1=request.last_name_1,
        last_name_2=request.last_name_2,
        tratamiento=request.tratamiento
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    full_name = f"{user.name} {user.last_name_1 or ''} {user.last_name_2 or ''}".strip()
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": user.email, "name": full_name, "role": user.role, "tratamiento": user.tratamiento}}

@app.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    full_name = f"{current_user.name} {current_user.last_name_1 or ''} {current_user.last_name_2 or ''}".strip()
    return {"email": current_user.email, "name": full_name, "role": current_user.role, "tratamiento": current_user.tratamiento}

# --- SIMULATION ---

# Mock data for Demo Case #2041
MOCK_CASE_CONTEXT = """
Paciente: Ana García, 28 años.
Gestación: 32 semanas.
Motivo de consulta: Dolor abdominal en hemiabdomen inferior, tipo pinchazo, acompañado de mareo leve.
Antecedentes: Ninguno de interés. Sin alergias conocidas. Primer embarazo.
Constantes: Tensión arterial 110/70, Frecuencia cardíaca 85 lpm.
Nota para IA: NO tienes sangrado vaginal, ni contracciones regulares. El dolor mejora un poco al tumbarte de lado izquierdo.
"""

@app.post("/simular")
async def simular_chat(request: SimularRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Format history for the LLM Provider
        formatted_history = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        # In a real app, we would fetch the context using request.caso_id from ChromaDB
        context = MOCK_CASE_CONTEXT
        if request.caso_id and request.caso_id != "demo":
            case_record = db.query(ClinicalCase).filter(ClinicalCase.id == request.caso_id).first()
            if case_record:
                chroma_text = ChromaProvider.get_case(case_record.chroma_id)
                if chroma_text:
                    context = chroma_text
        
        # Para la conversación con la paciente, pasamos el context, el historial y la nueva query
        response_text = llm_provider.generate_patient_response(
            context=context,
            history=[{"role": msg.role, "content": msg.content} for msg in request.history],
            query=request.query,
            tratamiento=getattr(current_user, "tratamiento", "Doctor")
        )
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import Response
class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
def generate_tts(request: TTSRequest, current_user: User = Depends(get_current_user)):
    from openai import OpenAI
    import os
    
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OpenAI API Key not configured")
        
    client = OpenAI(api_key=openai_key)
    
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=request.text
        )
        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

MOCK_RUBRIC = """
1. Anamnesis (30%): ¿Realizó preguntas lógicas para acotar el problema principal? ¿Indagó en antecedentes relevantes (médicos, quirúrgicos, ginecológicos, sexuales según corresponda)?
2. Exploración y Pruebas (30%): ¿Solicitó exploración física o pruebas complementarias coherentes con la sospecha clínica?
3. Diagnóstico (40%): ¿El diagnóstico final coincide con la enfermedad real del paciente descrita en la ficha clínica?
"""

@app.post("/evaluar")
async def evaluar_consulta(request: EvaluarRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        role_map = {"user": "ALUMNO", "patient": "PACIENTE", "ai": "SISTEMA"}
        formatted_history = "\n".join([f"{role_map.get(msg.role, msg.role.upper())}: {msg.content}" for msg in request.history])
        
        context = MOCK_CASE_CONTEXT
        if request.caso_id and request.caso_id != "demo":
            case_record = db.query(ClinicalCase).filter(ClinicalCase.id == request.caso_id).first()
            if case_record:
                chroma_text = ChromaProvider.get_case(case_record.chroma_id)
                if chroma_text:
                    context = chroma_text
                    
        # Para la rúbrica, idealmente se extraería del mismo documento o de la BBDD
        # Por ahora enviamos el texto entero como contexto y que la IA extraiga la rúbrica si está ahí.
        
        evaluation_result = llm_provider.evaluate_consultation(
            case_context=context,
            rubric=MOCK_RUBRIC,
            history=formatted_history,
            student_judgment=request.juicio_clinico
        )
        
        # Guardar en Base de Datos
        new_simulation = Simulation(
            student_id=current_user.id,
            caso_id=request.caso_id,
            chat_history=[{"role": msg.role, "content": msg.content} for msg in request.history],
            juicio_clinico=request.juicio_clinico,
            nota_final=evaluation_result.get("nota_final"),
            es_correcto=1 if evaluation_result.get("es_correcto") else 0,
            feedback=evaluation_result.get("feedback"),
            diagnostico_real=evaluation_result.get("diagnostico_real"),
            puntos_fuertes=evaluation_result.get("puntos_fuertes"),
            puntos_debiles=evaluation_result.get("puntos_debiles")
        )
        db.add(new_simulation)
        db.commit()

        return {"evaluacion": evaluation_result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# --- PROFESSOR GOVERNANCE ---

# Solo accesible si el usuario actual es 'professor'
def get_current_professor(current_user: User = Depends(get_current_user)):
    if current_user.role != "professor":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# Solo accesible si el usuario actual es 'admin'
def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@app.get("/professors")
async def get_professors(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    professors = db.query(User).filter(User.role == "professor").all()
    result = []
    for p in professors:
        students_count = db.query(User).filter(User.role == "student", User.professor_id == p.id).count()
        full_name = f"{p.name} {p.last_name_1 or ''} {p.last_name_2 or ''}".strip()
        result.append({
            "id": p.id,
            "name": full_name,
            "email": p.email,
            "students_count": students_count
        })
    return result

@app.post("/professors")
async def create_professor(request: RegisterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    new_user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        name=request.name,
        last_name_1=request.last_name_1,
        last_name_2=request.last_name_2,
        tratamiento=request.tratamiento,
        role="professor"
    )
    db.add(new_user)
    db.commit()
    return {"message": "Profesor registrado correctamente", "email": new_user.email}

# --- CLINICAL CASES (RAG) ---

@app.post("/cases/upload")
async def upload_clinical_case(
    title: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_professor)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten archivos PDF")
    
    try:
        reader = PyPDF2.PdfReader(file.file)
        text_content = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text_content += extracted + "\n"
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="El PDF no contiene texto extraíble")
        
        # Save to ChromaDB
        chroma_id = ChromaProvider.store_case(
            text_content=text_content,
            metadata={"title": title, "professor_id": current_user.id}
        )
        
        # Save reference to SQLite
        new_case = ClinicalCase(
            title=title,
            description=description,
            chroma_id=chroma_id,
            created_by_id=current_user.id
        )
        db.add(new_case)
        db.commit()
        
        return {"message": "Caso subido y procesado con éxito", "case_id": new_case.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando PDF: {str(e)}")

@app.get("/cases")
async def get_clinical_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tanto alumnos como profesores pueden ver los casos
    cases = db.query(ClinicalCase).order_by(ClinicalCase.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "description": c.description} for c in cases]

class CaseEditRequest(BaseModel):
    title: str
    description: Optional[str] = None

@app.put("/cases/{case_id}")
async def edit_case(case_id: int, request: CaseEditRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    case_record = db.query(ClinicalCase).filter(ClinicalCase.id == case_id).first()
    if not case_record:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    # if case_record.created_by_id != current_user.id and current_user.role != "admin":
    #     raise HTTPException(status_code=403, detail="No autorizado")
    
    case_record.title = request.title
    case_record.description = request.description
    db.commit()
    return {"message": "Caso actualizado"}

@app.delete("/cases/{case_id}")
async def delete_case(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    case_record = db.query(ClinicalCase).filter(ClinicalCase.id == case_id).first()
    if not case_record:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
        
    try:
        ChromaProvider.delete_case(case_record.chroma_id)
    except Exception as e:
        print(f"Error borrando de Chroma: {e}")
        
    db.delete(case_record)
    db.commit()
    return {"message": "Caso eliminado"}


@app.get("/students")
async def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    # Devuelve solo los alumnos que pertenecen a este profesor
    students = db.query(User).filter(User.role == "student", User.professor_id == current_user.id).all()
    result = []
    for s in students:
        sims = db.query(Simulation).filter(Simulation.student_id == s.id).all()
        completed_sims = len(sims)
        avg_score = sum(sim.nota_final for sim in sims if sim.nota_final is not None) / completed_sims if completed_sims > 0 else 0
        full_name = f"{s.name} {s.last_name_1 or ''} {s.last_name_2 or ''}".strip()
        result.append({
            "id": s.id,
            "name": full_name,
            "email": s.email,
            "completed_simulations": completed_sims,
            "average_score": round(avg_score, 2)
        })
    return result

@app.get("/simulations/{student_id}")
async def get_student_simulations(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    # Verify the student belongs to this professor
    student = db.query(User).filter(User.id == student_id, User.professor_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
        
    sims = db.query(Simulation).filter(Simulation.student_id == student_id).order_by(Simulation.created_at.desc()).all()
    return sims

@app.post("/students")
async def create_student(request: RegisterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    # El profesor crea a un alumno
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    new_user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        name=request.name,
        last_name_1=request.last_name_1,
        last_name_2=request.last_name_2,
        tratamiento=request.tratamiento,
        role="student",
        professor_id=current_user.id
    )
    db.add(new_user)
    db.commit()
    return {"message": "Alumno registrado correctamente", "email": new_user.email}

@app.put("/students/{student_id}")
async def edit_student(student_id: int, request: EditStudentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    student = db.query(User).filter(User.id == student_id, User.professor_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no tienes permiso para editarlo")

    if request.email is not None and request.email != student.email:
        # Verify email is not taken by someone else
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        student.email = request.email

    if request.password is not None and len(request.password.strip()) > 0:
        student.hashed_password = get_password_hash(request.password)
    
    if request.name is not None:
        student.name = request.name
    if request.last_name_1 is not None:
        student.last_name_1 = request.last_name_1
    if request.last_name_2 is not None:
        student.last_name_2 = request.last_name_2
    if request.tratamiento is not None:
        student.tratamiento = request.tratamiento

    db.commit()
    return {"message": "Alumno actualizado correctamente"}

@app.delete("/students/{student_id}")
async def delete_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_professor)):
    student = db.query(User).filter(User.id == student_id, User.professor_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Alumno no encontrado o no tienes permiso para borrarlo")

    # Primero borramos todas sus simulaciones para evitar errores de clave foránea
    sims = db.query(Simulation).filter(Simulation.student_id == student_id).all()
    for sim in sims:
        db.delete(sim)
    
    # Finalmente borramos al usuario
    db.delete(student)
    db.commit()
    
    return {"message": "Alumno eliminado correctamente"}

