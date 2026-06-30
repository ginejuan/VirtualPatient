import chromadb
from chromadb.config import Settings
import uuid

import os

os.makedirs("data", exist_ok=True)

# Initialize ChromaDB in a local directory (inside data/ for persistence)
chroma_client = chromadb.PersistentClient(path="./data/chroma_db")
collection = chroma_client.get_or_create_collection(name="clinical_cases")

class ChromaProvider:
    @staticmethod
    def store_case(text_content: str, metadata: dict) -> str:
        """
        Almacena un nuevo caso clínico en ChromaDB.
        Genera un ID único y lo devuelve.
        """
        case_id = str(uuid.uuid4())
        
        # En una versión más avanzada de RAG dividiríamos el texto en chunks (chunking)
        # Para este MVP, guardaremos el caso entero en un solo documento vectorial.
        # ChromaDB usará su modelo de embedding por defecto (all-MiniLM-L6-v2) para indexarlo.
        collection.add(
            documents=[text_content],
            metadatas=[metadata],
            ids=[case_id]
        )
        
        return case_id

    @staticmethod
    def get_case(case_id: str) -> str:
        """
        Recupera el texto completo de un caso clínico por su ID.
        """
        result = collection.get(
            ids=[case_id]
        )
        if result and result['documents'] and len(result['documents']) > 0:
            return result['documents'][0]
        return None

    @staticmethod
    def delete_case(case_id: str):
        """
        Elimina un caso clínico de ChromaDB.
        """
        collection.delete(ids=[case_id])

