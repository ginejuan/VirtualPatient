from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

try:
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='Hola, ¿cómo estás?'
    )
    print("Success:", response.text)
except Exception as e:
    print("Error:", str(e))
