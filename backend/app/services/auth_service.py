from werkzeug.security import check_password_hash
from app.models import user_model

def authenticate(username, password):
    user = user_model.find_by_username(username)
    if not user or not check_password_hash(user["password_hash"], password):
        return None
    return {"id": user["id"], "username": user["username"], "role": user["role"]}
