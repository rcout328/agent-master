import requests
import json

AUTH_TOKEN = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"  # Replace with your actual token
snapshot_id = "s_m49740lz2ff8i26hx0" # Replace with your actual snapshot ID

url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json"
headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    # Assuming the data is a list of dictionaries
    if isinstance(data, list):
        for item in data:
            if "cb_rank" in item and "region" in item:
                extracted_data = {"cb_rank": item["cb_rank"], "region": item["region"]}
                print(json.dumps(extracted_data, indent=2))
    else:
        print("Unexpected data format.  The response is not a list of dictionaries.")
else:
    print(f"Error: {response.status_code} - {response.text}")
