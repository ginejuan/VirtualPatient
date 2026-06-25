import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
headers = {
    "x-goog-api-key": api_key,
    "Content-Type": "application/json"
}
payload = {
    "contents": [{"parts": [{"text": "Hola"}]}]
}
res = requests.post(url, headers=headers, json=payload)
print("Status x-goog-api-key:", res.status_code)
print("Response:", res.text)

url2 = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
headers2 = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
res2 = requests.post(url2, headers=headers2, json=payload)
print("\nStatus Bearer:", res2.status_code)
print("Response Bearer:", res2.text)
