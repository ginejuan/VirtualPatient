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
                       "ROL 1 (Principal): La paciente. Cuando el médico te entreviste, responde con lenguaje COLOQUIAL, sin jerga médica. No te adelantes, revela antecedentes solo si pregunta. NO reveles tu diagnóstico.\n"
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
                       "Basado en la ficha clínica oficial del paciente:\n"
                       "{context}\n\n"
                       "Rúbrica de evaluación general:\n{rubric}\n\n"
                       "HISTORIAL DE CONVERSACIÓN (Lo que realmente hizo y preguntó el alumno):\n"
                       "{history}\n\n"
                       "JUICIO DIAGNÓSTICO FINAL DEL ALUMNO: '{diagnosis}'.\n\n"
                       "REGLAS CRÍTICAS DE EVALUACIÓN (CUMPLIR OBLIGATORIAMENTE):\n"
                       "1. Eres un evaluador literal. El alumno SOLO ha realizado lo que está estrictamente escrito en el HISTORIAL DE CONVERSACIÓN.\n"
                       "2. ESCALA DE NOTAS: La rúbrica adjunta evalúa sobre 100 puntos. Asigna puntos proporcionales a la cantidad y calidad de las preguntas realizadas (anamnesis) y pruebas solicitadas. Luego, OBLIGATORIAMENTE divide el total entre 10 para obtener la 'nota_final' en una escala de 0 a 10.\n"
                       "3. Si el alumno adivinó el diagnóstico con muy pocas preguntas o pruebas, su nota final debe ser baja (ej. 2 o 3 sobre 10) porque la anamnesis y la exploración tienen mucho peso.\n\n"
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
