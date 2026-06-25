from typing import Dict, Any, List
import json
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from domain.interfaces.llm_provider import LLMProvider

class GoogleProvider(LLMProvider):
    """
    Concrete implementation of LLMProvider using Google Gemini.
    """
    def __init__(self, model_name: str = "gemini-1.5-flash", temperature: float = 0.7):
        # We use Gemini 1.5 Flash for the patient chat (fast and capable)
        # And Gemini 1.5 Pro (or Flash with 0 temperature) for evaluation
        
        # Make sure GOOGLE_API_KEY is available in the environment
        if not os.getenv("GOOGLE_API_KEY"):
            print("WARNING: GOOGLE_API_KEY environment variable not found.")
            
        self.patient_llm = ChatGoogleGenerativeAI(model=model_name, temperature=temperature)
        self.evaluator_llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.1)

    def generate_patient_response(self, context: str, history: List[Dict[str, str]], query: str, tratamiento: str = "Doctor") -> str:
        messages = [
            ("system", "Eres un SIMULADOR CLÍNICO DUAL. Asumes dos roles simultáneos basados en la ficha clínica proporcionada:\n"
                       "ROL 1 (Principal): La paciente. Cuando el médico te entreviste, responde con lenguaje COLOQUIAL, sin jerga médica. No te adelantes, revela antecedentes solo si pregunta. NO reveles tu diagnóstico.\n"
                       "El médico tratante (usuario) tiene el título de '{tratamiento}'. Dirígete a él/ella usando este tratamiento (ej: 'Hola {tratamiento}').\n"
                       "ROL 2 (Sistema Clínico): Cuando el médico indique explícitamente que va a realizar una exploración física (ej: 'Te voy a tomar la tensión', 'Te exploro el abdomen') o solicite pruebas complementarias (ej: 'Pido analítica', 'Solicito ecografía', 'Pido cultivos'), debes salir de tu rol de paciente y comportarte como el entorno clínico. Dale los resultados objetivos, médicos y técnicos que aparezcan en tu ficha clínica. Si la prueba solicitada NO aparece en tu ficha, indícale un resultado normal/anodino estándar.\n\n"
                       "Ficha Clínica:\n{context}")
        ]
        
        # Add history
        for msg in history:
            role = "human" if msg["role"] == "user" else "ai"
            messages.append((role, msg["content"]))
            
        messages.append(("human", "{query}"))
        
        prompt = ChatPromptTemplate.from_messages(messages)
        
        chain = prompt | self.patient_llm
        res = chain.invoke({"context": context, "query": query, "tratamiento": tratamiento.lower()})
        return res.content

    def evaluate_consultation(self, case_context: str, rubric: str, history: str, student_judgment: str) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Actúa como un Profesor Senior de Obstetricia y Ginecología muy estricto.\n"
                       "Basado en la ficha clínica oficial del paciente:\n"
                       "{context}\n\n"
                       "Rúbrica de evaluación general:\n{rubric}\n\n"
                       "HISTORIAL DE CONVERSACIÓN (Lo que realmente hizo y preguntó el alumno):\n"
                       "{history}\n\n"
                       "JUICIO DIAGNÓSTICO FINAL DEL ALUMNO: '{diagnosis}'.\n\n"
                       "REGLAS CRÍTICAS DE EVALUACIÓN (CUMPLIR OBLIGATORIAMENTE):\n"
                       "1. Eres un evaluador literal. El alumno SOLO ha realizado lo que está estrictamente escrito en el HISTORIAL DE CONVERSACIÓN.\n"
                       "2. Si el alumno NO escribió ninguna pregunta en el historial, ES IMPOSIBLE que haya preguntado por dolor, síntomas o antecedentes. NUNCA inventes que el alumno preguntó algo que no está en el texto.\n"
                       "3. Si el historial solo tiene el mensaje inicial del paciente (1 mensaje) y ninguna respuesta del alumno, la nota DEBE ser 0 o 1. El alumno adivinó sin explorar.\n"
                       "4. En ese caso, los 'puntos_fuertes' DEBEN estar vacíos o solo decir 'Acertó el diagnóstico por azar', y las 'areas_de_mejora' deben decir que no hizo anamnesis.\n\n"
                       "Responde ÚNICAMENTE con un JSON válido con estas claves EXACTAS:\n"
                       "- 'nota_final': (Número de 0 a 10)\n"
                       "- 'es_correcto': (Booleano. DEBE SER true si el texto en 'diagnosis' coincide o acierta la enfermedad real del paciente, SIN IMPORTAR si la nota es un 0 por no haber hecho preguntas).\n"
                       "- 'puntos_fuertes': (Lista de strings con aciertos en la anamnesis o diagnóstico)\n"
                       "- 'puntos_debiles': (Lista de strings con fallos o lagunas en la consulta)\n"
                       "- 'feedback': (String con comentario pedagógico explicativo para el alumno)\n"
                       "- 'diagnostico_real': (String con el diagnóstico oficial del caso)\n"),
            ("human", "Evalúa ahora y retorna solo el JSON.")
        ])
        
        chain = prompt | self.evaluator_llm
        res = chain.invoke({"context": case_context, "rubric": rubric, "history": history, "diagnosis": student_judgment})
        
        # Simple extraction of JSON from response
        text = res.content.replace('```json', '').replace('```', '').strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {
                "es_correcto": False,
                "feedback": "Error al evaluar el diagnóstico. Por favor, intenta de nuevo.",
                "diagnostico_real": "Desconocido",
                "raw_response": text
            }
