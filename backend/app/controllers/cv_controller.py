from app.models import cv_model

def get_cv(userId):
    return cv_model.get_all(userId)

def update_cv_section(section_key, content):
    return cv_model.update_section(section_key, content)
