from flask import current_app
from .csv_repository import CsvRepository
from datetime import datetime, timezone

SECTIONS = ["basic_information", "summary", "skills",
            "project_experience", "work_experience", "education"]


USERIDNAME = {
    "1": "Finn",
    "2": "Janessa",
    "3": "Finn",
    "4": "Janessa"
}



def repo(userId):
    userName = USERIDNAME[userId]
    cvNameStr = f"cv_{userName}.csv"
    
    return CsvRepository(current_app.config["DATA_DIR"] / cvNameStr,
                         ["section_key", "content", "updated_at"])

def get_all(userId):
    rows = {r["section_key"]: r["content"] for r in repo(userId).all()}
    return {key: rows.get(key, "") for key in SECTIONS}

def update_section(key, content):
    if key not in SECTIONS:
        raise ValueError("Unknown CV section.")
    repo().upsert("section_key", key, {
        "section_key": key, "content": content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    return {"section_key": key, "content": content}
