from typing import Dict, Any, List
import json
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from domain.interfaces.llm_provider import LLMProvider

class OpenAIProvider(LLMProvider):
    """
    Concrete implementation of LLMProvider using OpenAI.
    """
    def __init__(self, model_name: str = "gpt-4o-mini", temperature: float = 0.7):
        if not os.getenv("OPENAI_API_KEY"):
            print("WARNING: OPENAI_API_KEY environment variable not found.")
            
        self.patient_llm = ChatOpenAI(model=model_name, temperature=temperature)
        self.evaluator_llm = ChatOpenAI(model=model_name, temperature=0.1)

    def generate_patient_response(self, context: str, history: List[Dict[str, str]], query: str, tratamiento: str = "Doctor") -> str:
        messages = [
            ("system", "Eres un SIMULADOR CLÍNICO DUAL. Asumes dos roles simultáneos basados en la ficha clínica proporcionada:\n"
                       "ROL 1 (Principal): La paciente. Cuando el médico te entreviste, responde con lenguaje COLOQUIAL, sin jerga médica. No te adelantes, revela antecedentes solo si pregunta.\n"
                       "REGLA DE SÍNTOMAS: NUNCA niegues ni mientas sobre tus síntomas actuales (motivo de consulta). Si te preguntan por un síntoma que figura en tu Ficha (ej. dolor, sangrado), debes confirmar que lo tienes y describirlo. Sin embargo, NUNCA reveles el nombre médico de tu enfermedad o diagnóstico final.\n"
                       "El médico tratante (usuario) tiene el título de '{tratamiento}'. Dirígete a él/ella usando este tratamiento (ej: 'Hola {tratamiento}').\n"
                       "ROL 2 (Sistema Clínico): REGLA CRÍTICA: Cuando el médico indique que va a realizar una prueba o exploración (ej: 'voy a hacerte una ecografía', 'te tomo la tensión', 'pido analítica'), DEBES ABANDONAR INMEDIATAMENTE EL ROL DE PACIENTE. NO respondas como la paciente diciendo 'de acuerdo doctor' o 'me parece bien'. En su lugar, responde EXCLUSIVAMENTE como el SISTEMA MÉDICO entregando los resultados técnicos y objetivos de esa prueba según tu Ficha Clínica. Empieza tu respuesta con '[SISTEMA CLÍNICO]: ' seguido de los hallazgos. Si la prueba solicitada NO aparece en tu ficha, indícale un resultado normal/anodino estándar.\n\n"
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
                       "A continuación se muestra el documento completo del caso clínico oficial:\n"
                       "--- INICIO DEL DOCUMENTO ---\n"
                       "{context}\n"
                       "--- FIN DEL DOCUMENTO ---\n\n"
                       "Este documento suele contener una 'Rúbrica de evaluación' con criterios específicos y puntos (que suelen sumar 100). Si el documento incluye esta rúbrica, OBLIGATORIAMENTE debes usarla paso a paso para puntuar al alumno. Si NO hay rúbrica en el documento, usa esta por defecto:\n"
                       "{rubric}\n\n"
                       "HISTORIAL DE CONVERSACIÓN (Lo que realmente hizo y preguntó el alumno):\n"
                       "{history}\n\n"
                       "JUICIO DIAGNÓSTICO FINAL DEL ALUMNO: '{diagnosis}'.\n\n"
                       "REGLAS CRÍTICAS DE EVALUACIÓN (CUMPLIR OBLIGATORIAMENTE):\n"
                       "1. Eres un evaluador literal. El alumno SOLO ha realizado lo que está estrictamente escrito en el HISTORIAL DE CONVERSACIÓN.\n"
                       "2. ESCALA DE NOTAS: Basándote estricta y únicamente en los criterios de la rúbrica (la del documento si existe, o la genérica), suma los puntos logrados. Luego, divide el total obtenido entre 10 para dar la 'nota_final' (de 0 a 10).\n"
                       "3. En los 'puntos_fuertes' y 'puntos_debiles', haz referencia directa a los ítems de la rúbrica que el alumno ha cumplido o fallado.\n\n"
                       "Responde ÚNICAMENTE con un JSON válido con estas claves EXACTAS:\n"
                       "- 'nota_final': (Número de 0 a 10, permite un decimal)\n"
                       "- 'es_correcto': (Booleano. DEBE SER true si el texto en 'diagnosis' coincide o acierta la enfermedad real del paciente, independientemente de la nota).\n"
                       "- 'puntos_fuertes': (Lista de strings con aciertos en la anamnesis o diagnóstico)\n"
                       "- 'puntos_debiles': (Lista de strings con fallos o lagunas en la consulta)\n"
                       "- 'feedback': (String con comentario pedagógico explicativo para el alumno)\n"
                       "- 'diagnostico_real': (String con el diagnóstico oficial del caso)\n"),
            ("human", "Evalúa ahora y retorna solo el JSON.")
        ])
        
        chain = prompt | self.evaluator_llm
        res = chain.invoke({"context": case_context, "rubric": rubric, "history": history, "diagnosis": student_judgment})
        
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
