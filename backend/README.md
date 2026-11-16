# Finn's World — Python backend

This project is a JSON REST API only. Flask does not render or design the frontend.
A separately hosted HTML/CSS/JavaScript frontend can call these endpoints with Axios.

## 1. Setup (Windows PowerShell)

```powershell
cd finns_world_backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set a strong `SECRET_KEY` and `ADMIN_PASSWORD`, then run:

```powershell
python run.py
```

API base URL: `http://127.0.0.1:5000/api`

On first startup, an admin account is created only if `users.csv` is empty and both
`ADMIN_USERNAME` and `ADMIN_PASSWORD` are configured. The password is stored as a
Werkzeug password hash, not plaintext.

## 2. Architecture

- `app/views`: Blueprint routes, request parsing and HTTP responses.
- `app/controllers`: application/business orchestration.
- `app/models`: CSV-backed persistence.
- `app/services`: crawler, PDF storage and analysis helpers.
- `app/utils`: authentication decorators and response helpers.

## 3. Axios integration contract

Use cookie-based session authentication. Configure Axios with:
`withCredentials: true` and the API base URL. The backend enables credentialed CORS
only for origins listed in `FRONTEND_ORIGINS`.

For production, serve the frontend and API over HTTPS, set
`SESSION_COOKIE_SECURE=true`, and configure exact trusted frontend origins.

## 4. Important safety and implementation notes

- `webProcessMethod.py` is a saved crawler extension file. The API stores code in it
  for an administrator, but **does not execute arbitrary submitted Python code**.
  Executing code submitted through an HTTP request would create a remote-code-execution
  vulnerability. Implement and review a fixed parser function before enabling it.
- The NZ Lotto crawler is deliberately conservative and uses a generic HTML parser.
  The actual NZ Lotto page structure may change; verify selectors and parsing against
  the chosen source before relying on the collected data.
- SEEK/LinkedIn/Indeed/Trade Me adapters are placeholders. Respect each site's terms,
  robots rules, authentication requirements and rate limits; do not bypass access
  controls. The initial API returns stored jobs and supports adding test records.
- AI job analysis is a provider-neutral placeholder. Connect an AI API later using
  environment variables and server-side credentials.
- CSV is suitable for a small single-user prototype, not concurrent/high-volume use.
  Back up the `data` folder. Move to SQLite/PostgreSQL before multi-user production.
- Calendar remote sync is represented by a flag only; no external push provider is
  configured in this version.
