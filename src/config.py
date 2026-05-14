import os
import json

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "config.json")
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"version": "unknown"}

PORT = int(os.getenv("APP_PORT", 7531))
HOST = os.getenv("APP_HOST", "0.0.0.0")
