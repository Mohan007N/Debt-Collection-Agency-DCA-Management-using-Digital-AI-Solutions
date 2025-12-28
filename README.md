DCA Management — Local Setup

Overview
- Simple Flask app for DCA (debt collection agency) management.

Prerequisites
- Python 3.11
- A virtual environment (recommended)

Setup
1. Create a virtual environment (if you haven't):

```bash
python -m venv .venv
```

2. Activate the venv (PowerShell):

```powershell
& .venv\Scripts\Activate.ps1
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

Run the app

```bash
# from repository root
python app.py
```

Access
- Open http://127.0.0.1:5000 (also available on local LAN host printed in logs)

Notes
- The app runs in Flask debug/dev server. For production, use a WSGI server.
- You may see a SQLAlchemy LegacyAPIWarning (Query.get is legacy). To remove the warning, update usages like:

```python
# replace
User.query.get(int(user_id))
# with
db.session.get(User, int(user_id))
```

- Some static images referenced in templates may be missing (404s for paths under `static/assets/images/`). To fix:
  - Add placeholder images at `static/assets/images/network-bg.jpg` and `static/assets/images/auth-bg-pattern.png`
  - Or update templates to point to existing images.

Troubleshooting
- If the app fails to start, ensure the venv is activated and dependencies are installed.
- If you get database errors, the app creates a local SQLite file `dca_management.db` by default.

Next steps
- Open the app in a browser, or I can: fix the SQLAlchemy warning, add placeholder images, or update other endpoints. Tell me which you'd like.
