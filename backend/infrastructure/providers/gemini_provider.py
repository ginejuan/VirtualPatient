from typing import Dict, Any, List
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from domain.interfaces.llm_provider import LLMProvider

class GeminiProvider(LLMProvider):
    """
    Concrete implementation of LLMProvider using Google Gemini via LangChain.
    """
    def __init__(self, model_name: str = "gemini-pro", temperature: float = 0.7):
        self.patient_llm = ChatGoogleGenerativeAI(model=model_name, temperature=temperature)
        self.evaluator_llm = ChatGoogleGenerativeAI(model=model_name, temperature=0.1)

    def generate_patient_response(self, context: str, history: List[Dict[str, str]], query: str) -> str:
        messages = [
            ("system", "Actúa como la paciente obstétrica descrita en el caso clínico. "
                       "REGLAS:\n"
                       "1. Lenguaje COLOQUIAL, sin terminología médica.\n"
                       "2. No te adelantes, responde solo a lo que te pregunten.\n"
                       "3. Revela antecedentes solo si te preguntan.\n"
                       "4. NO reveles tu diagnóstico.\n\n"
                       "Ficha: {context}")
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
            ("system", "Actúa como Profesor de Obstetricia y Ginecología. "
                       "Evalúa la consulta basándote en la Rúbrica y el Caso Clínico.\n\n"
                       "Caso:\n{case_context}\n\n"
                       "Rúbrica:\n{rubric}\n\n"
                       "Devuelve SOLAMENTE un JSON con: nota_final, puntos_fuertes (list), puntos_debiles (list), feedback_pedagogico."),
            ("human", "Conversación:\n{history}\n\nJuicio:\n{student_judgment}")
        ])
        
        chain = prompt | self.evaluator_llm
        res = chain.invoke({
            "case_context": case_context,
            "rubric": rubric,
            "history": history,
            "student_judgment": student_judgment
        })
        
        # Simple cleanup to ensure it parses
        content = res.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
