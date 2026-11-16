from pathlib import Path
from .csv_repository import CsvRepository

def init_storage(data_dir, upload_dir):
    Path(data_dir).mkdir(parents=True, exist_ok=True)
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
    schemas = {
        "users.csv": ["id", "username", "password_hash", "role", "created_at"],
        "cv_sections.csv": ["section_key", "content", "updated_at"],
        "lotto_draws.csv": ["draw_id", "draw_date", "numbers", "bonus", "powerball", "source_url"],
        "settings.csv": ["key", "value", "updated_at"],
        "jobs.csv": ["id", "source", "country", "region", "title", "company", "company_size",
                     "local_reputation", "global_reputation", "description", "url", "created_at"],
        "cv_files.csv": ["id", "filename", "stored_name", "uploaded_at"],
        "calendar_events.csv": ["id", "event_date", "title", "description", "priority",
                                "event_type", "remote_sync", "completed", "created_at", "updated_at"],
        "everyday_settings.csv":["id","user_id","entry_date","entry_type","name","amount","category","created_at"],
        "finance_records.csv":["user_id","annual_hours","tax_rate_1","tax_rate_2","tax_rate_3","tax_rate_4","tax_rate_5","kiwisaver_rate","acc_rate","updated_at"],
    }
    for filename, columns in schemas.items():
        CsvRepository(Path(data_dir) / filename, columns).ensure()
