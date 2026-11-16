from app.services import everyday_service as service
from app.models import everyday_model as model
from datetime import datetime
from decimal import Decimal
from collections import defaultdict

def finance(user_id, start_date, end_date):
    rows=model.get_finance(user_id,start_date,end_date)
    for row in rows: row['amount']=float(Decimal(row['amount']))
    return rows

def summary(user_id,start_date,end_date,group_by='day'):
    rows=finance(user_id,start_date,end_date)
    buckets=defaultdict(lambda:{'income':Decimal('0'),'expense':Decimal('0'),'income_categories':defaultdict(Decimal),'expense_categories':defaultdict(Decimal)})
    for row in rows:
        d=datetime.strptime(row['entry_date'],'%Y-%m-%d').date()
        if group_by=='week': key=f'{d.isocalendar().year}-W{d.isocalendar().week:02d}'
        elif group_by=='month': key=d.strftime('%Y-%m')
        elif group_by=='year': key=d.strftime('%Y')
        else: key=d.isoformat()
        b=buckets[key]; amount=Decimal(str(row['amount'])); kind=row['entry_type']
        b[kind]+=amount; b[f'{kind}_categories'][row['category']]+=amount
    labels=sorted(buckets)
    return {'labels':labels,'income':[float(buckets[k]['income']) for k in labels], 'expense':[float(buckets[k]['expense']) for k in labels],
            'net':[float(buckets[k]['income']-buckets[k]['expense']) for k in labels],
            'income_categories':{c:[float(buckets[k]['income_categories'].get(c,0)) for k in labels] for c in service.CATEGORIES['income']},
            'expense_categories':{c:[float(buckets[k]['expense_categories'].get(c,0)) for k in labels] for c in service.CATEGORIES['expense']},
            'records':rows}
