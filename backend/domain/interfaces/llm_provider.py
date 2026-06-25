from abc import ABC, abstractmethod
from typing import Dict, Any, List

class LLMProvider(ABC):
    """
    Abstract Base Class for LLM Providers.
    This ensures our application business logic is decoupled from
    specific implementations like LangChain or Gemini.
    """
    
    @abstractmethod
    def generate_patient_response(self, context: str, history: List[Dict[str, str]], query: str) -> str:
        """
        Generates a colloquial response acting as the patient.
        """
        pass

    @abstractmethod
    def evaluate_consultation(self, case_context: str, rubric: str, history: str, student_judgment: str) -> Dict[str, Any]:
        """
        Evaluates the student's consultation and returns a structured JSON response.
        """
        pass
