# Finn's World Frontend

Separate HTML/CSS/JS frontend for the supplied Finn's World Flask JSON REST API.

## Structure

- `index.html` — fixed left menu + right-side SPA host; no full page refresh when switching modules.
- `css/index.css`, `js/index.js` — shell/navigation/API client.
- `pages/*.html` — separate right-side view fragments.
- `css/<page>.css`, `js/<page>.js` — page-specific styling and behaviour.
- `assets/` — reserved for your own images/icons/backgrounds.

## API connection

The frontend defaults to `http://127.0.0.1:5000/api`. Before deployment you can set:

```html
<script>window.FINNS_WORLD_API_BASE = 'https://your-pythonanywhere-domain/api';</script>
```

Place that before `js/index.js` in `index.html`, or change the default in `js/index.js`.

The backend uses cookie sessions, so all requests are sent with `credentials: include`.

## Backend data contracts used by this frontend

### Authentication
`POST /auth/login` body: `{username, password}`.
Successful user object: `{id, username, role}`.

### CV
`GET /cv` returns:
`{basic_information, summary, skills, project_experience, work_experience, education}`.

### Lotto
`GET /lotto/analysis` returns:
`{draw_count, draws[], analysis:{sum_by_draw[], weekday_distribution{}, monthday_distribution{}}}`.
`POST /lotto/check` body: `{numbers:[1,2,3,4,5,6]}` and returns `max_overlap`, `match_rate`, `matching_draws[]`.

### Jobs
`GET /jobs` returns job rows with `id, source, country, region, title, company, company_size, local_reputation, global_reputation, description, url, created_at`.
`POST /jobs/cv-files` accepts multipart PDF field `file`.
`POST /jobs/<job_id>/analyze` returns the provider-neutral AI analysis structure from the supplied backend.

### Calendar
Event row: `id, event_date, title, description, priority, event_type, remote_sync, completed, created_at, updated_at`.
The frontend sends booleans for `remote_sync` and `completed`; the supplied backend stores them as `true/false` strings.

## CSV formats expected by the supplied backend

- `users.csv`: `id,username,password_hash,role,created_at`
- `cv_sections.csv`: `section_key,content,updated_at`
- `lotto_draws.csv`: `draw_id,draw_date,numbers,bonus,powerball,source_url`
- `settings.csv`: `key,value,updated_at`
- `jobs.csv`: `id,source,country,region,title,company,company_size,local_reputation,global_reputation,description,url,created_at`
- `cv_files.csv`: `id,filename,stored_name,uploaded_at`
- `calendar_events.csv`: `id,event_date,title,description,priority,event_type,remote_sync,completed,created_at,updated_at`

## Image areas

The welcome page already has a dedicated image placeholder. Replace the placeholder with your own image in the same element; use `object-fit: cover` if you add an `<img>` so the image fills the region without distortion. The CV avatar area is likewise reserved for your own photo.

## Charts

No chart library is bundled intentionally. The chart areas are prepared placeholders. Later you can initialize ECharts using the backend data shown in the placeholder labels. This keeps the frontend dependency-free.

## PythonAnywhere deployment

Serve this folder as static files and point the frontend API base at the deployed Flask API. Configure the backend CORS allow-list to include the exact frontend origin, and enable secure session cookies when using HTTPS.
