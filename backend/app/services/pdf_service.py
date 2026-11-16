from pathlib import Path
from werkzeug.utils import secure_filename
import uuid

def save_pdf(file_storage, upload_dir):
    original = secure_filename(file_storage.filename or "")
    if not original.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are accepted.")
    stored = f"{uuid.uuid4().hex}.pdf"
    path = Path(upload_dir) / stored
    file_storage.save(path)
    return {"filename": original, "stored_name": stored}
