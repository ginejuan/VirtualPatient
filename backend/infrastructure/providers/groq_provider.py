from typing import Dict, Any, List
import json
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from domain.interfaces.llm_provider import LLMProvider

class GroqProvider(LLMProvider):
    """
    Concrete implementation of LLMProvider using Groq (Llama 3).
    """
    def __init__(self, model_name: str = "llama-3.1-8b-instant", temperature: float = 0.7):
        self.patient_llm = ChatGroq(model=model_name, temperature=temperature)
        self.evaluator_llm = ChatGroq(model=model_name, temperature=0.1)

    def generate_patient_response(self, context: str, history: List[Dict[str, str]], query: str) -> str:
        messages = [
            ("system", "Eres un SIMULADOR CLÍNICO DUAL. Asumes dos roles simultáneos basados en la ficha clínica proporcionada:\n"
                       "ROL 1 (Principal): La paciente. Cuando el médico te entreviste, responde con lenguaje COLOQUIAL, sin jerga médica. No te adelantes, revela antecedentes solo si pregunta. NO reveles tu diagnóstico.\n"
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
        res = chain.invoke({"context": context, "query": query})
        return res.content

    def evaluate_consultation(self, case_context: str, rubric: str, history: str, student_judgment: str) -> Dict[str, Any]:
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Actúa como un Profesor Senior de Obstetricia y Ginecología.\n"
                       "Basado en la ficha clínica oficial del paciente:\n"
                       "{context}\n\n"
                       "Rúbrica de evaluación general:\n{rubric}\n\n"
                       "HISTORIAL DE CONVERSACIÓN (Lo que realmente hizo y preguntó el alumno):\n"
                       "{history}\n\n"
                       "JUICIO DIAGNÓSTICO FINAL DEL ALUMNO: '{diagnosis}'.\n\n"
                       "REGLAS CRÍTICAS DE EVALUACIÓN:\n"
                       "1. El alumno SOLO ha realizado lo que está estrictamente escrito en el HISTORIAL DE CONVERSACIÓN.\n"
                       "2. Si el alumno NO preguntó sobre antecedentes sexuales, NO los ha explorado.\n"
                       "3. Si el alumno NO pidió ecografía o pruebas explícitamente en el chat, NO las ha solicitado.\n"
                       "4. Si el historial está vacío o solo contiene el saludo inicial de la paciente, el alumno NO ha hecho anamnesis ni exploración, y su nota debe ser SUSPENSO (muy baja) por adivinar el diagnóstico sin base clínica, aunque el diagnóstico final sea correcto.\n\n"
                       "Responde ÚNICAMENTE con un JSON válido con estas claves EXACTAS:\n"
                       "- 'nota_final': (Número de 0 a 10)\n"
                       "- 'es_correcto': (Booleano, si el diagnóstico base es correcto)\n"
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
