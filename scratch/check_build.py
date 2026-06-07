import requests
import time

url = "https://api.render.com/v1/services/srv-d8ih666q1p3s73enko8g/deploys/dep-d8ih7mernols73bnomj0"

headers = {
    "Authorization": "Bearer rnd_4WLdYNpiP2sbRBiiPQI9QxJCogfE",
    "Accept": "application/json"
}

for i in range(10):
    response = requests.get(url, headers=headers)
    data = response.json()
    status = data.get("deploy", {}).get("status", "unknown")
    print(f"Check {i+1}: Deploy status is '{status}'")
    if status in ["live", "build_failed", "update_failed", "canceled"]:
        break
    time.sleep(15)
