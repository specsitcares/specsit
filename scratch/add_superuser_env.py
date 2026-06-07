import requests

# 1. Fetch current environment variables
url_vars = "https://api.render.com/v1/services/srv-d8ih666q1p3s73enko8g/env-vars"
headers = {
    "Authorization": "Bearer rnd_4WLdYNpiP2sbRBiiPQI9QxJCogfE",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.get(url_vars, headers=headers)
if response.status_code != 200:
    print("Failed to fetch env variables:", response.text)
    exit(1)

current_vars = response.json()
# Format is [{"envVar": {"key": "...", "value": "..."}}]

# 2. Convert to list of dicts
updated_payload = []
for var in current_vars:
    # Exclude the keys we are updating if they already exist
    key = var["envVar"]["key"]
    if key not in ["SUPERUSER_USERNAME", "SUPERUSER_PASSWORD", "SUPERUSER_EMAIL"]:
        updated_payload.append({"key": key, "value": var["envVar"]["value"]})

# Add our new superuser variables
updated_payload.append({"key": "SUPERUSER_USERNAME", "value": "vamshi"})
updated_payload.append({"key": "SUPERUSER_PASSWORD", "value": "vamshi"})
updated_payload.append({"key": "SUPERUSER_EMAIL", "value": "vamshikrishna8330@gmail.com"})

# 3. Update the variables list
response_update = requests.put(url_vars, json=updated_payload, headers=headers)
print("PUT Status Code:", response_update.status_code)
print("PUT Response:", response_update.text)
