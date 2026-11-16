from flask import session
from app.services.auth_service import authenticate

def login(username, password):
    user = authenticate(username, password)
    if not user:
        return None
    session.clear()
    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    return user

def logout():
    session.clear()

def current_user():
    if not session.get("user_id"):
        return None
    return {"id": session["user_id"], "username": session["username"],
            "role": session["role"]}
