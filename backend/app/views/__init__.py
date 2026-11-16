from .auth_view import bp as auth_bp
from .cv_view import bp as cv_bp
from .lotto_view import bp as lotto_bp
from .job_view import bp as job_bp
from .calendar_view import bp as calendar_bp
from .everyday_view import bp as everyday_bp

def register_blueprints(app):
    for blueprint in (auth_bp, cv_bp, lotto_bp, job_bp, calendar_bp, everyday_bp):
        app.register_blueprint(blueprint, url_prefix="/api")
