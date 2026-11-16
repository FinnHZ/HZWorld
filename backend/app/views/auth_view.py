from flask import Blueprint, request
from app.controllers import auth_controller
from app.models.user_model import ensure_admin
from app.utils.responses import ok, error
from app.utils.auth import login_required
from flask import current_app

bp = Blueprint("auth", __name__)

@bp.record_once
def create_first_admin(state):
    cfg = state.app.config
    ensure_admin(cfg.get("ADMIN_USERNAME"), cfg.get("ADMIN_PASSWORD"))

@bp.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    username, password = body.get("username", ""), body.get("password", "")
    
    print("usernameusernameusernameusernameusername")
    print(username)
    print(password)

    if not username or not password:
        return error("Username and password are required.")
    user = auth_controller.login(username, password)
    return ok(user, "Login successful.") if user else error("Invalid username or password.", 401)

@bp.post("/auth/logout")
def logout():
    auth_controller.logout()
    return ok(message="Logged out.")

@bp.get("/auth/me")
def me():
    user = auth_controller.current_user()
    return ok(user) if user else error("Not logged in.", 401)
