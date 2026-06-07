import requests

url = "https://api.render.com/v1/services/srv-d8ih666q1p3s73enko8g"

headers = {
    "Authorization": "Bearer rnd_4WLdYNpiP2sbRBiiPQI9QxJCogfE",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

payload = {
    "serviceDetails": {
        "envSpecificDetails": {
            "buildCommand": "bash build.sh",
            "startCommand": "cd backend && python manage.py migrate && python manage.py create_default_superuser && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2"
        }
    }
}

response = requests.patch(url, json=payload, headers=headers)
print("Status Code:", response.status_code)
print("Response:", response.text)
