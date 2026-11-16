from flask import current_app
from werkzeug.security import generate_password_hash
from .csv_repository import CsvRepository
from datetime import datetime, timezone
import uuid

def repo():
    return CsvRepository(current_app.config["DATA_DIR"] / "users.csv",
                         ["id", "username", "password_hash", "role", "created_at"])

def find_by_username(username):
    return next((u for u in repo().all() if u["username"].lower() == username.lower()), None)

def create_user(username, password, role="user"):
    row = {"id": str(uuid.uuid4()), "username": username,
           "password_hash": generate_password_hash(password), "role": role,
           "created_at": datetime.now(timezone.utc).isoformat()}
    return repo().insert(row)

def ensure_admin(username, password):
    if username and password and not repo().all():
        create_user(username, password, "admin")
