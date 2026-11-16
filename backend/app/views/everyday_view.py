from pathlib import Path
from uuid import uuid4
from flask import Blueprint, request, session, current_app
from app.controllers import everyday_controller as controller
from app.services import everyday_service as service
from app.utils.auth import admin_required
from app.utils.responses import ok, error

bp=Blueprint('everyday',__name__)


def uid(): return session.get('user_id')

def run(fn):
    try: return ok(fn())
    except ValueError as exc: return error(str(exc),400)
    except Exception as exc:
        current_app.logger.exception('Everyday request failed')
        return error(str(exc) if current_app.debug else 'Everyday service is temporarily unavailable.',502)

@bp.get('/everyday/weather')
@admin_required
def weather(): return run(service.weather)

@bp.get('/everyday/exchange')
@admin_required
def exchange(): return run(service.exchange)

@bp.get('/everyday/interest')
@admin_required
def interest(): return run(service.interest)

@bp.get('/everyday/settings')
@admin_required
def get_settings(): return ok(service.settings_for(uid()))

@bp.post('/everyday/settings')
@admin_required
def post_settings():
    body=request.get_json(silent=True) or {}
    return run(lambda:service.save_settings(uid(),body))

@bp.get('/everyday/finance')
@admin_required
def get_finance():
    start=request.args.get('from','2000-01-01'); end=request.args.get('to','2100-12-31')
    return run(lambda:controller.finance(uid(),start,end))

@bp.post('/everyday/finance')
@admin_required
def post_finance():
    body=request.get_json(silent=True) or {}
    return run(lambda:service.save_entries(uid(),body))

@bp.delete('/everyday/finance/<record_id>')
@admin_required
def delete_finance(record_id):
    from app.models import everyday_model
    return ok({'deleted':everyday_model.delete_finance(uid(),record_id)})

@bp.get('/everyday/finance/summary')
@admin_required
def finance_summary():
    start=request.args.get('from','2000-01-01'); end=request.args.get('to','2100-12-31'); group=request.args.get('group','day')
    if group not in ('day','week','month','year'): return error('Invalid group.',400)
    return run(lambda:controller.summary(uid(),start,end,group))

@bp.post('/everyday/finance/upload')
@admin_required
def upload_receipt():
    file=request.files.get('file')
    if not file: return error('Please select an image.',400)
    ext=Path(file.filename or '').suffix.lower()
    if ext not in ('.jpg','.jpeg','.png'): return error('Only JPG and PNG images are accepted.',400)
    folder=Path(current_app.config['UPLOAD_DIR'])/'everyday'
    folder.mkdir(parents=True,exist_ok=True)
    path=folder/f'{uuid4().hex}{ext}'
    file.save(path)
    try: text=service.ocr_image(path)
    except Exception as exc: return error(str(exc),501)
    finally:
        try: path.unlink(missing_ok=True)
        except Exception: pass
    return ok({'text':text,'message':'OCR completed. Review and correct the parsed details before submitting.'})
