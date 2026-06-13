# 🛺 RideFare India

**Compare Uber, Ola, Rapido, Namma Yatri & inDrive — side-by-side, in seconds.**

Live at → **[adikarthikeya2003.github.io/ride-fare-india](https://adikarthikeya2003.github.io/ride-fare-india/)**

---

## What It Does

Enter a pickup and drop-off in any of 6 Indian cities and instantly see fare estimates across all major ride apps — adjusted for live weather, time of day, and special events like festivals or cricket matches.

| Platform | Categories |
|---|---|
| ⚫ Uber | UberGo · UberAuto · UberPremier |
| 🟢 Ola | Mini · Sedan · Auto |
| 🟠 Rapido | Bike · Auto · Cab |
| 🔵 Namma Yatri | ONDC Auto (zero surge) |
| 🟩 inDrive | Bid-based Cab |

**Cities supported:** Bangalore · Delhi · Mumbai · Hyderabad · Chennai · Pune

---

## Features

- **Live IST clock** — auto-detects time of day and selects the right surge slot
- **Live weather** — fetches real weather at your pickup location via Open-Meteo (no API key needed)
- **Surge breakdown** — shows exactly why fares are higher (weather × time × event)
- **Map pinpointing** — click anywhere on the map to set pickup or drop-off; auto-reverse-geocodes the address
- **Smart search** — dual geocoding (Photon + Nominatim) for accurate Indian locality search
- **PWA** — installable on iPhone and Android, works offline

---

## Install as an App (Free — No App Store)

### iPhone / iOS

1. Open **[adikarthikeya2003.github.io/ride-fare-india](https://adikarthikeya2003.github.io/ride-fare-india/)** in **Safari**
2. Tap the **Share** button (box with arrow at the bottom of the screen)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add** in the top right

The app now lives on your home screen with its own icon. It opens full-screen with no browser bar — exactly like a native app. Works on iOS 16.4+.

### Android / Chrome

1. Open the site in **Chrome**
2. A banner appears at the bottom: **"Add RideFare to Home Screen"** — tap **Install**
3. Or: tap the **3-dot menu → Add to Home Screen**

The app installs with an adaptive icon and launches standalone — no Play Store needed.

---

## How to Use

### 1. Select your city
Tap the city bar at the top and choose your city.

### 2. Enter pickup and drop-off
Type a location in the search boxes and pick from the dropdown to confirm coordinates.

**Or pin directly on the map:**
- Tap **"Pin Pickup (A)"** → tap anywhere on the map
- Tap **"Pin Drop-off (B)"** → tap anywhere on the map
- Address auto-fills from the map pin

### 3. Set conditions (optional — auto-filled)
The **Conditions** panel fills itself:
- **Weather** — fetched live at your pickup location
- **Time slot** — detected from current IST time

Override either manually. The **surge breakdown** box explains the combined multiplier in plain English.

### 4. Compare Fares
Tap **Compare Fares**. Results appear in ~2 seconds showing:
- Fare range (low–high estimate)
- Surge-immune options highlighted (Namma Yatri, UberAuto never surge)
- Best value badge
- Booking fees, if any

---

## Offline Mode

Once loaded, the app works without internet for:
- Map tiles (cached for 30 days after first view)
- Last weather result (served from cache)
- Instant app shell load

The fare comparison itself requires the backend — a clear error is shown if offline.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS |
| Map | Leaflet · OpenStreetMap |
| Geocoding | Photon (Komoot) + Nominatim |
| Weather | Open-Meteo API (free, no key) |
| Routing | OSRM public API |
| Backend | FastAPI · Python 3.12 |
| PWA | vite-plugin-pwa · Workbox |
| Hosting | GitHub Pages (frontend) · Render.com free tier (backend) |

---

## Run Locally

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API at http://localhost:8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

---

## Disclaimer

Fares are **estimates** based on published fare structures — not live pricing from the apps. Actual fares may differ due to real-time surge, driver availability, tolls, and route. Always verify in-app before booking.

---

*Built by [adikarthikeya2003](https://github.com/adikarthikeya2003)*
