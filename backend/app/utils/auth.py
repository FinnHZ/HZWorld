from functools import wraps
from flask import session
from .responses import error

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return error("Authentication required.", 401)
        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return error("Authentication required.", 401)
        if session.get("role") != "admin":
            return error("Administrator permission required.", 403)
        return fn(*args, **kwargs)
    return wrapper
