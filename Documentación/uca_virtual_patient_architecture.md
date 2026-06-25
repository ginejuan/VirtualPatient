# Arquitectura de Software y Lógica para Paciente Virtual UCA
### Proyecto de Innovación Docente - Universidad de Cádiz (UCA)

Este documento detalla la arquitectura, el stack de software y los patrones de programación utilizados en **ObstetrIA** adaptados específicamente para el nuevo proyecto de la UCA: la creación de una **Paciente Virtual Obstétrica y Ginecológica**.

El objetivo es permitir a Gemini Flash generar el nuevo proyecto replicando exactamente los estándares de solidez, modularidad, diseño atómico y limpieza de código del proyecto base.

---

## 1. Concepto y Adaptación del Modelo

Mientras que **ObstetrIA** funciona como un copiloto clínico (el alumno pregunta y la IA responde con protocolos médicos usando RAG), el proyecto de la **Paciente Virtual** invierte los roles:

```mermaid
graph TD
    subgraph ObstetrIA (Asistente)
        M[Médico] -->|Pregunta clínica| LLM_A[LLM Expert]
        DB[(Protocolos SEGO/SAGO)] -->|Contexto| LLM_A
        LLM_A -->|Respuesta técnica y citada| M
    end

    subgraph Paciente Virtual UCA (Simulación)
        A[Alumno/Médico] -->|Anamnesis / Preguntas| LLM_P[LLM Paciente Virtual]
        CASES[(Fichas de Casos Clínicos)] -->|Historial / Síntomas| LLM_P
        LLM_P -->|Respuestas coloquiales de paciente| A
        A -->|Finaliza consulta| LLM_E[LLM Evaluador UCA]
        LLM_E -->|Nota e informe según rúbrica| A
    end
```

---

## 2. Stack de Software (La Ficha Técnica)

El proyecto utiliza exactamente el mismo stack robusto y moderno, idóneo para despliegues rápidos en contenedores (Docker/Dokploy) e integración docente:

*   **Backend:** Python 3.10+ con **FastAPI** (asíncrono, de alto rendimiento y auto-documentado con OpenAPI/Swagger).
*   **Servidor de Producción:** **Uvicorn** para servir la API y el frontend compilado como una Single Page Application (SPA).
*   **Base de Datos Vectorial (RAG):** **ChromaDB** para almacenar e indexar las fichas de los casos clínicos.
*   **Embeddings:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (modelo multilingüe local optimizado para español).
*   **Orquestación de IA:** **LangChain** para estructurar prompts, encadenar llamadas de LLM y gestionar el flujo RAG.
*   **Modelo de Lenguaje:** **Google Gemini Flash** (`gemini-flash-latest` o superior), ideal por su ventana de contexto gigante (1M+ tokens), bajo coste, alta velocidad y excelente rendimiento en español.
*   **Extracción de Documentos:** **PyMuPDF** (`fitz`) para el parseo avanzado de fichas de casos clínicos y rúbricas en PDF.
*   **Base de Datos y Autenticación:** **Supabase** (PostgreSQL) para gestionar el acceso de los alumnos (Auth JWT local sin latencia), guardar logs de conversaciones completas (auditoría docente) y notas de evaluaciones.
*   **Frontend:** **React** + **TypeScript** + **Vite** (construcción SPA limpia, rápida y tipada).
*   **Estilos y Diseño:** **CSS Vanilla** con tokens de diseño semánticos (colores en HSL, tipografía moderna como Inter/Outfit, layouts con Flexbox/Grid y micro-animaciones para el "vibe" premium).

---

## 3. Estructura de Directorios del Proyecto

Se replica la separación estricta de responsabilidades (SoC):

```
proyecto-paciente-virtual/
│
├── data/                       # Casos clínicos y rúbricas de evaluación
│   └── casos_clinicos/         # PDFs estructurados por patología (ej. preeclampsia, metrorragia)
│
├── chroma_db/                  # Base de datos vectorial persistida tras la ingesta
│
├── backend/
│   ├── main.py                 # Punto de entrada de FastAPI y serving de la SPA
│   ├── brain.py                # Motor LLM de Simulación de Paciente y Evaluador
│   ├── ingestion.py            # Pipeline de ingesta estructurado de PDFs de casos clínicos
│   ├── auth.py                 # Autenticación JWT local contra Supabase
│   ├── database.py             # Consultas y logs en Supabase (historiales y rúbricas)
│   └── requirements.txt        # Dependencias de Python
│
├── frontend/                   # Proyecto Vite + React + TS
│   ├── src/
│   │   ├── components/         # Componentes UI reutilizables (Chat, Ficha, Pruebas)
│   │   ├── pages/              # Dashboard del Alumno, Panel del Profesor, Login
│   │   ├── services/           # Clientes de API (fetch al backend)
│   │   ├── context/            # Estado global (Auth, simulación activa)
│   │   ├── index.css           # Tokens de diseño y estilos globales
│   │   └── main.tsx            # Inicialización de React
│   ├── package.json
│   └── vite.config.ts
│
└── Dockerfile                  # Empaquetamiento listo para producción/Dokploy
```

---

## 4. Lógica de Programación Clave

### A. Ingesta Estructurada de Casos Clínicos (`ingestion.py`)
Utiliza **PyMuPDF** para convertir el caso clínico a Markdown y dividirlo conservando la sección en la metadata para el retrieval:

```python
# ingestion.py (Esquema simplificado)
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

HEADERS_TO_SPLIT_ON = [("##", "seccion")]

def procesar_caso_clinico(pdf_path: str):
    # 1. Extrae el texto usando PyMuPDF detectando encabezados grandes
    # 2. Divide usando estructura de Markdown
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on=HEADERS_TO_SPLIT_ON)
    chunks = splitter.split_text(markdown_text)
    
    # 3. Sub-divide chunks si exceden tamaño (ej. 1000 caracteres)
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    # 4. Guarda en ChromaDB inyectando metadatos del caso (caso_id, dificultad, especialidad)
```

### B. El Motor de Simulación del Paciente (`brain.py`)
Encapsula al LLM en dos roles distintos: la **Paciente** (interactiva) y el **Evaluador** (post-consulta).

#### 1. Clase de la Paciente Virtual (Conversacional)
Utiliza un prompt de sistema rígido para asegurar que el modelo actúe de forma coloquial, no revele diagnósticos médicos técnicos a menos que se hagan las preguntas o pruebas correctas, y simule síntomas realistas.

```python
class PacienteVirtualEngine:
    def __init__(self, caso_clinico_context: str):
        self.contexto_caso = caso_clinico_context
        self.llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)

    def responder_a_alumno(self, historial_chat: list, nueva_pregunta: str) -> str:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Actúa como la paciente obstétrica descrita en el caso clínico.
REGLAS DE COMPORTAMIENTO:
1. Habla con lenguaje COLOQUIAL y común. No uses terminología médica (ej. di "tengo dolor de cabeza fuerte" en vez de "cefalea grave").
2. No te adelantes ni le des facilidades al médico. Responde solo a lo que te pregunte estrictamente.
3. Si te preguntan antecedentes, revela solo los descritos en tu ficha.
4. Muestra preocupación o dolor de forma realista acorde a tus síntomas, sin ser exagerada.
5. NO reveles tu diagnóstico bajo ningún concepto. Tu papel es ser la paciente, no el médico.

Ficha del Caso Clínico:
{contexto}"""),
            # Inyección del historial para mantener coherencia en la consulta
            *historial_chat,
            ("human", "{pregunta}")
        ])
        
        chain = prompt | self.llm
        response = chain.invoke({"contexto": self.contexto_caso, "pregunta": nueva_pregunta})
        return response.content
```

#### 2. Clase del Evaluador (Docente)
Una vez el alumno hace clic en **"Finalizar Diagnóstico"** y escribe su juicio clínico (diagnóstico, pruebas pedidas, tratamiento), el backend invoca al Evaluador que contrasta el historial de la conversación contra la rúbrica oficial.

```python
class EvaluadorDocenteEngine:
    def __init__(self, caso_clinico_completo: str, rubrica_evaluacion: str):
        self.caso = caso_clinico_completo
        self.rubrica = rubrica_evaluacion
        self.llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.1)

    def evaluar_consulta(self, historial_conversacion: str, juicio_alumno: str) -> dict:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Actúa como un Profesor Senior de Obstetricia y Ginecología de la UCA.
Tu tarea es evaluar la consulta realizada por el alumno basándote en la Rúbrica de Evaluación y el Caso Clínico original.

Analiza objetivamente:
1. Anamnesis: ¿Preguntó por los antecedentes clave, alergias, síntomas actuales?
2. Empatía y Comunicación: ¿Trató a la paciente con respeto, usó términos comprensibles?
3. Diagnóstico y Tratamiento: ¿El diagnóstico es correcto? ¿Las pautas son las indicadas en el caso?

Genera un JSON estructurado con:
- "nota_final": (Número de 0 a 10)
- "puntos_fuertes": [Lista de aciertos]
- "puntos_debiles": [Lista de fallos o lagunas]
- "feedback_pedagogico": "Comentario explicativo para el alumno"
- "desglose_rubrica": {Detalle por competencias}

Caso Clínico:
{caso}

Rúbrica:
{rubrica}
"""),
            ("human", "Conversación:\n{conversacion}\n\nJuicio Clínico del Alumno:\n{juicio}")
        ])
        
        # Se puede forzar salida JSON estructurada con Pydantic en Gemini/LangChain
        chain = prompt | self.llm
        res = chain.invoke({
            "caso": self.caso,
            "rubrica": self.rubrica,
            "conversacion": historial_conversacion,
            "juicio": juicio_alumno
        })
        return parsear_json_respuesta(res.content)
```

---

## 5. Panel de Gestión e Innovación Docente (Gobernanza)

Inspirado en el panel de **Actividad** de ObstetrIA, el proyecto de la UCA contará con una pestaña de administración para los profesores:

1.  **Dashboard de Progreso:**
    *   Número de simulaciones completadas.
    *   Distribución de notas medias por caso clínico (identificar qué patología les cuesta más a los alumnos).
    *   Tiempos de consulta promedio.
2.  **Historial de Auditoría de Casos:**
    *   Acceso a las transcripciones completas alumno-paciente para tutorías personalizadas.
    *   Revisión del feedback del alumno sobre la naturalidad de la IA (para refinar prompts).
3.  **Editor de Casos:**
    *   Subida directa de PDFs para generar nuevos casos clínicos de simulación de forma instantánea.

---

## 6. Prompt Corto de Copia para Gemini Flash

*Copia y pega el siguiente texto en Gemini Flash para inicializar el proyecto:*

```text
Por favor, genera la estructura inicial de un proyecto de simulación médica llamado "VirtualPatientUCA". 
El backend debe estar en FastAPI (Python) y el frontend en React + Vite + TypeScript con estilos CSS puros (sin Tailwind).

Arquitectura básica a replicar:
1. Backend (FastAPI):
   - Ingesta de PDFs de casos clínicos con PyMuPDF (fitz).
   - Generación de embeddings usando sentence-transformers en un ChromaDB local.
   - Motor del Paciente Virtual usando LangChain + Google Gemini Flash. Debe haber dos roles de LLM:
     a) Un rol conversacional 'Paciente' que responda coloquialmente según la ficha del caso.
     b) Un rol 'Evaluador' que analice el historial de chat y el juicio del alumno contra una rúbrica de evaluación y retorne un JSON con nota (0-10), fallos, aciertos y consejo pedagógico.
   - Rutas API: `/login`, `/casos` (listar), `/simular/{caso_id}` (chat interactivo), `/evaluar/{session_id}` (enviar diagnóstico y cerrar).
   - Conexión básica a Supabase para registrar logs de sesión y notas finales.

2. Frontend (React/TS/Vite):
   - Layout premium con un sidebar intuitivo (Simulación, Historial de Notas, Configuración).
   - Pantalla de Chat para hablar con la paciente (diseño tipo mensajería, burbujas de texto, estados cargando, control de estado para cuando la simulación está activa o cerrada).
   - Modal para "Enviar Juicio Clínico y Finalizar" que solicite Diagnóstico Diferencial, Pruebas Pedidas y Tratamiento.
   - Pantalla de resultados que muestre la evaluación del docente de forma muy visual (gráfico circular con nota, acordeones para puntos fuertes/débiles y feedback redactado).

Proporciona la estructura del directorio, el requirements.txt, la implementación de brain.py (con el wrapper de LangChain y prompts definidos en español) y main.py del backend.
```
