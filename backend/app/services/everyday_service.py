from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4
import requests
from bs4 import BeautifulSoup
from flask import current_app
from app.models import everyday_model as model

CATEGORIES = {'income': ['工资','私活','运气','支援','投资收入','其他收入'], 'expense': ['生活','教育','节日','育儿','娱乐','投资支出','其他收入支出']}
DEFAULT_SETTINGS = {'annual_hours':'2080','tax_rate_1':'10.5','tax_rate_2':'17.5','tax_rate_3':'30','tax_rate_4':'33','tax_rate_5':'39','kiwisaver_rate':'3.5','acc_rate':'1.75'}

# Current NZ individual income tax thresholds. Review these when the tax year changes.
TAX_THRESHOLDS = [15600, 53500, 78100, 180000]

def _d(value):
    try:
        result = Decimal(str(value))
        if not result.is_finite(): raise InvalidOperation()
        return result
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError('All numeric values must be valid numbers.')

def calculator(payload):
    annual = _d(payload.get('annual_income', 0))
    hours = _d(payload.get('annual_hours', 0))
    if annual < 0 or hours <= 0: raise ValueError('Annual income must be >= 0 and annual hours must be > 0.')
    rates = [_d(payload.get(f'tax_rate_{i}', DEFAULT_SETTINGS[f'tax_rate_{i}'])) / 100 for i in range(1,6)]
    kiwi = _d(payload.get('kiwisaver_rate', 0)) / 100
    acc = _d(payload.get('acc_rate', 0)) / 100
    if any(x < 0 or x > 1 for x in rates + [kiwi, acc]): raise ValueError('Rates must be between 0 and 100%.')
    tax = Decimal('0'); lower = Decimal('0')
    for i, upper in enumerate(TAX_THRESHOLDS + [None]):
        taxable = max(Decimal('0'), annual - lower)
        band = taxable if upper is None else min(taxable, Decimal(upper) - lower)
        tax += band * rates[i]
        if upper is None or annual <= upper: break
        lower = Decimal(upper)
    kiwi_amount = annual * kiwi
    acc_amount = annual * acc
    net = annual - tax - kiwi_amount - acc_amount
    def money(v): return float(v.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    return {'gross_annual':money(annual),'gross_hourly':money(annual/hours),'gross_weekly':money(annual/Decimal(52)),
            'income_tax_annual':money(tax),'kiwisaver_annual':money(kiwi_amount),'acc_annual':money(acc_amount),
            'net_annual':money(net),'net_hourly':money(net/hours),'net_weekly':money(net/Decimal(52)),
            'net_weekly_take_home':money(net/Decimal(52))}

def settings_for(user_id):
    return model.get_settings(user_id) or {'user_id':str(user_id), **DEFAULT_SETTINGS}

def save_settings(user_id, data):
    row = {'user_id':str(user_id), 'updated_at':datetime.now(timezone.utc).isoformat()}
    for key, default in DEFAULT_SETTINGS.items():
        value = _d(data.get(key, default))
        if value < 0 or value > 1000000: raise ValueError(f'Invalid {key}.')
        row[key] = str(value)
    return model.save_settings(row)

def save_entries(user_id, data):
    entries = data.get('entries') or []
    if not entries or len(entries) > 100: raise ValueError('Provide between 1 and 100 entries.')
    saved = []
    for item in entries:
        kind = item.get('entry_type')
        category = item.get('category')
        name = str(item.get('name','')).strip()[:160]
        amount = _d(item.get('amount'))
        date = str(item.get('entry_date') or '')
        if kind not in CATEGORIES or category not in CATEGORIES[kind]: raise ValueError('Invalid entry type or category.')
        if not name or amount <= 0: raise ValueError('Each entry needs a name and an amount greater than zero.')
        datetime.strptime(date, '%Y-%m-%d')
        saved.append({'id':str(uuid4()),'user_id':str(user_id),'entry_date':date,'entry_type':kind,'name':name,'amount':str(amount.quantize(Decimal('0.01'))),'category':category,'created_at':datetime.now(timezone.utc).isoformat()})
    model.save_finance(saved)
    return saved

def weather():
    locations = {'Christchurch':(-43.5321,172.6362,'Pacific/Auckland'),'Chengdu':(30.5728,104.0668,'Asia/Shanghai')}
    result = {}
    for name,(lat,lon,tz) in locations.items():
        r = requests.get('https://api.open-meteo.com/v1/forecast', params={'latitude':lat,'longitude':lon,'current':'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code','timezone':tz}, timeout=8)
        r.raise_for_status(); data=r.json(); cur=data.get('current',{})
        result[name]={'temperature':cur.get('temperature_2m'),'feels_like':cur.get('apparent_temperature'),'humidity':cur.get('relative_humidity_2m'),'wind_speed':cur.get('wind_speed_10m'),'time':cur.get('time'),'timezone':tz,'unit':'°C'}
    return result

def exchange():
    r = requests.get('https://api.frankfurter.dev/v2/rate/NZD/CNY', timeout=8); r.raise_for_status(); forward=r.json()
    r = requests.get('https://api.frankfurter.dev/v2/rate/CNY/NZD', timeout=8); r.raise_for_status(); reverse=r.json()
    return {'NZD_CNY':forward.get('rate'),'CNY_NZD':reverse.get('rate'),'date':forward.get('date'),'source':'Frankfurter reference rates'}

def interest():
    url='https://nzmai.co.nz/interest-rates'
    r=requests.get(url,headers={'User-Agent':'Mozilla/5.0 FinnsWorld/1.0'},timeout=12); r.raise_for_status()
    soup=BeautifulSoup(r.text,'html.parser')
    tables=soup.find_all('table'); banks={}
    for table in tables:
        headers=[x.get_text(' ',strip=True).lower() for x in table.find_all('th')]
        if not headers: continue
        for tr in table.find_all('tr'):
            cells=[x.get_text(' ',strip=True) for x in tr.find_all(['td','th'])]
            if len(cells)<2: continue
            bank=cells[0].lower()
            if bank in ('anz','asb','bnz','westpac'):
                row={}
                for i,h in enumerate(headers[1:], start=1):
                    if i<len(cells): row[h]=cells[i]
                banks[bank.upper()]=row
    if len(banks)<4:
        raise RuntimeError('NZMAI rate table format could not be parsed; please check the source page.')
    return {'banks':banks,'source':url,'retrieved_at':datetime.now(timezone.utc).isoformat(),'source_update_note':'NZMAI says published bank rates are refreshed each morning.'}

def ocr_image(path):
    try:
        from PIL import Image
        import pytesseract
        return pytesseract.image_to_string(Image.open(path))
    except Exception as exc:
        raise RuntimeError('OCR is not configured. Install Pillow and pytesseract, and install the Tesseract OCR engine.') from exc
