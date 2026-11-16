from flask import Flask
from flask_cors import CORS
from .config import Config
from .models import init_storage
from .views import register_blueprints

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(
        app,
        origins=app.config["FRONTEND_ORIGINS"],
        supports_credentials=True,
        allow_headers=["Content-Type"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    init_storage(app.config["DATA_DIR"], app.config["UPLOAD_DIR"])
    register_blueprints(app)

    @app.get("/api/health")
    def health():
        return {"success": True, "data": {"status": "ok"}}, 200

    return app
