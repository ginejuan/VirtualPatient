import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key={api_key}"
payload = {
    "contents": [{"parts": [{"text": "Hola"}]}]
}
res = requests.post(url, json=payload)
print("Status:", res.status_code)
print("Response:", res.text)
