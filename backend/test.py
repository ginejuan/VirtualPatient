import requests

res = requests.post("http://localhost:8000/simular", json={
    "query": "Hola",
    "history": [],
    "caso_id": "2041"
})
print(res.status_code)
print(res.text)
