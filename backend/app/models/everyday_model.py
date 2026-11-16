from flask import current_app
from .csv_repository import CsvRepository

FINANCE_FIELDS = ['id','user_id','entry_date','entry_type','name','amount','category','created_at']
SETTING_FIELDS = ['user_id','annual_hours','tax_rate_1','tax_rate_2','tax_rate_3','tax_rate_4','tax_rate_5','kiwisaver_rate','acc_rate','updated_at']

def finance_repo():
    return CsvRepository(current_app.config['DATA_DIR'] / 'finance_records.csv', FINANCE_FIELDS)

def settings_repo():
    return CsvRepository(current_app.config['DATA_DIR'] / 'everyday_settings.csv', SETTING_FIELDS)

def get_settings(user_id):
    return next((r for r in settings_repo().all() if r['user_id'] == str(user_id)), None)

def save_settings(row):
    repo = settings_repo()
    rows = repo.all()
    rows = [r for r in rows if r['user_id'] != str(row['user_id'])]
    rows.append(row)
    repo.replace_all(rows)
    return row

def get_finance(user_id, start_date, end_date):
    return [r for r in finance_repo().all() if r['user_id'] == str(user_id) and start_date <= r['entry_date'] <= end_date]

def save_finance(rows):
    repo = finance_repo()
    for row in rows:
        repo.insert(row)
    return rows

def delete_finance(user_id, record_id):
    repo = finance_repo()
    return repo.delete_where(lambda r: r['user_id'] == str(user_id) and r['id'] == str(record_id))
