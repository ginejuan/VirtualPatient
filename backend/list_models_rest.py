import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
res = requests.get(url)
print("Status:", res.status_code)

if res.status_code == 200:
    models = res.json().get("models", [])
    print("Available models:")
    for m in models:
        print(f"- {m['name']} (Methods: {m.get('supportedGenerationMethods', [])})")
else:
    print("Error:", res.text)
