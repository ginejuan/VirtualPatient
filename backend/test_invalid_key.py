import requests
url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSy_this_is_a_fake_key_123456789"
payload = {"contents": [{"parts": [{"text": "Hola"}]}]}
res = requests.post(url, json=payload)
print("Status:", res.status_code)
print("Response:", res.text)
