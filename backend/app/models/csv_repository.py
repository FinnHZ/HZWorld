import csv
from pathlib import Path
from threading import RLock

_LOCKS = {}

def _lock_for(path):
    key = str(path.resolve())
    if key not in _LOCKS:
        _LOCKS[key] = RLock()
    return _LOCKS[key]

class CsvRepository:
    """Small CSV repository. Writes atomically to avoid partially-written files."""
    def __init__(self, path, fields):
        self.path = Path(path)
        self.fields = list(fields)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = _lock_for(self.path)
        with self.lock:
            if not self.path.exists() or self.path.stat().st_size == 0:
                self._write([])

    def _read(self):
        with self.path.open('r', newline='', encoding='utf-8-sig') as f:
            return list(csv.DictReader(f))

    def _write(self, rows):
        temp = self.path.with_suffix(self.path.suffix + '.tmp')
        with temp.open('w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=self.fields, extrasaction='ignore')
            writer.writeheader()
            for row in rows:
                writer.writerow({k: row.get(k, '') for k in self.fields})
        temp.replace(self.path)

    def all(self):
        with self.lock:
            return self._read()

    def insert(self, row):
        with self.lock:
            rows = self._read()
            rows.append({k: str(row.get(k, '')) for k in self.fields})
            self._write(rows)
        return row

    def replace_all(self, rows):
        with self.lock:
            self._write(rows)

    def delete_where(self, predicate):
        with self.lock:
            rows = self._read()
            kept = [r for r in rows if not predicate(r)]
            self._write(kept)
            return len(rows) - len(kept)

    def ensure(self):
        with self.lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            if not self.path.exists() or self.path.stat().st_size == 0:
                self._write([])

    def upsert(self, key, value, row):
        with self.lock:
            self.ensure()
            rows = self._read()
            for i, current in enumerate(rows):
                if current.get(key) == str(value):
                    rows[i] = {f: row.get(f, current.get(f, "")) for f in self.fields}
                    break
            else:
                rows.append({f: row.get(f, "") for f in self.fields})
            self._write(rows)
