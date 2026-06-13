# 🛺 RideFare India

> Side-by-side fare estimates for Uber, Ola, Rapido, Namma Yatri, and inDrive across 6 Indian cities.

**Live demo:** `[add your Vercel URL here]`

---

## What it does

Enter an origin and destination in any of 6 Indian cities (Bangalore, Delhi, Mumbai, Hyderabad, Chennai, Pune) and get estimated fares for all major ride platforms side-by-side — with surge ranges, category comparisons, and a "Best Value" highlight.

**Honest disclaimer:** These are estimates based on published fare structures, not live API data. Official ride-hailing APIs are not publicly accessible. Actual fares depend on real-time surge, route differences, and promotions.

---

## Tech Stack (100% free)

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python + FastAPI |
| Geocoding | OpenStreetMap / Nominatim (free, no API key) |
| Routing | OSRM public API (free, no API key) |
| Frontend hosting | Vercel (free tier) |
| Backend hosting | Render.com (free tier) |
| Database | None — fare configs in a JSON file |

---

## Local Development

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # Edit VITE_API_URL if needed
npm run dev
# App running at http://localhost:5173
```

---

## Deployment

### Backend → Render.com

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect your repo
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy the deployed URL (e.g. `https://ride-fare-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Add environment variable: `VITE_API_URL = https://ride-fare-api.onrender.com`
3. Deploy — that's it.

> **Note:** Render free tier spins down after 15 minutes of inactivity. First request may take ~30s. This is fine for demos.

---

## Adding a New City

Edit `backend/fare_config.json` and add a new top-level key following the same structure as existing cities. The frontend city selector is in `frontend/src/components/CitySelector.jsx`.

## Updating Fare Structures

All fare data is in `backend/fare_config.json`. Each category has:
- `base_fare` — minimum fare charged at trip start
- `per_km` — rate charged per kilometer
- `per_min` — rate charged per minute
- `booking_fee` — platform service fee (if any)
- `minimum_fare` — floor fare regardless of distance
- `surge_range` — `[min_multiplier, max_multiplier]` applied to the subtotal

---

## Project Structure

```
ride-fare-compare/
├── backend/
│   ├── main.py              # FastAPI app + endpoints
│   ├── fare_engine.py       # Fare calculation logic
│   ├── fare_config.json     # All fare data (edit this to update)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/      # UI components
│   │   └── utils/           # Geocoding, routing, API calls
│   ├── package.json
│   └── vite.config.js
├── vercel.json              # Vercel deployment config
├── render.yaml              # Render deployment config
└── .gitignore
```

---

## Limitations (be honest when sharing)

- **Not live data.** No official fare APIs are publicly accessible.
- **Surge shown as a range** (e.g. 1.0x–2.0x) — actual surge at any moment is unknown.
- **Fare configs need manual updates** when platforms change pricing (~every few months).
- **inDrive uses bidding** — shown range is an educated estimate, not a fixed price.
- **OSRM routing** may differ slightly from in-app routing (traffic, real-time conditions).
- **Platform availability** varies by city — some options shown may not be active in all zones.

---

## License

MIT — use it, fork it, build on it.

---

*Built as a portfolio project. Not affiliated with Uber, Ola, Rapido, Namma Yatri, or inDrive.*
