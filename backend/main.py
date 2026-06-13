import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import Optional

from fare_engine import estimate_all_fares
from conditions import (
    compute_condition_multiplier,
    get_metadata,
    get_time_slot,
    WEATHER_MULTIPLIERS,
    TIME_MULTIPLIERS,
    SPECIAL_MULTIPLIERS,
)

app = FastAPI(
    title="RideFare India — Fare Estimator API",
    description="Estimates ride fares with surge adjustments for weather, time-of-day, and special events.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_config_path = os.path.join(os.path.dirname(__file__), "fare_config.json")
with open(_config_path) as f:
    FARE_CONFIG = json.load(f)

CITIES = {k: v for k, v in FARE_CONFIG.items() if not k.startswith("_")}

CITY_DISPLAY = {
    "bangalore": "Bangalore",
    "delhi": "Delhi",
    "mumbai": "Mumbai",
    "hyderabad": "Hyderabad",
    "chennai": "Chennai",
    "pune": "Pune",
}


class EstimateRequest(BaseModel):
    distance_km: float
    duration_min: float
    city: str
    # Condition fields (all optional — defaults to normal/midday/clear)
    weather: Optional[str] = "clear"
    time_slot: Optional[str] = "midday"
    special: Optional[str] = "none"

    @field_validator("distance_km")
    @classmethod
    def validate_distance(cls, v):
        if v <= 0 or v > 500:
            raise ValueError("distance_km must be between 0 and 500")
        return round(v, 2)

    @field_validator("duration_min")
    @classmethod
    def validate_duration(cls, v):
        if v <= 0 or v > 600:
            raise ValueError("duration_min must be between 0 and 600")
        return round(v, 1)

    @field_validator("weather")
    @classmethod
    def validate_weather(cls, v):
        if v not in WEATHER_MULTIPLIERS:
            raise ValueError(f"weather must be one of: {list(WEATHER_MULTIPLIERS.keys())}")
        return v

    @field_validator("time_slot")
    @classmethod
    def validate_time_slot(cls, v):
        if v not in TIME_MULTIPLIERS:
            raise ValueError(f"time_slot must be one of: {list(TIME_MULTIPLIERS.keys())}")
        return v

    @field_validator("special")
    @classmethod
    def validate_special(cls, v):
        if v not in SPECIAL_MULTIPLIERS:
            raise ValueError(f"special must be one of: {list(SPECIAL_MULTIPLIERS.keys())}")
        return v


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "RideFare India Estimator v2",
        "available_cities": list(CITIES.keys()),
    }


@app.get("/cities")
def get_cities():
    return {
        "cities": [
            {"key": k, "display_name": CITY_DISPLAY.get(k, k.title())}
            for k in CITIES.keys()
        ]
    }


@app.get("/conditions")
def get_conditions():
    """Returns all available condition options with labels and multipliers."""
    return get_metadata()


@app.post("/estimate")
def estimate(req: EstimateRequest):
    city_key = req.city.lower().strip().replace(" ", "_")

    if city_key not in CITIES:
        raise HTTPException(
            status_code=404,
            detail=f"City '{req.city}' not supported. Available: {list(CITIES.keys())}",
        )

    condition = compute_condition_multiplier(
        weather=req.weather,
        time_slot=req.time_slot,
        special=req.special,
    )

    results = estimate_all_fares(
        CITIES[city_key],
        req.distance_km,
        req.duration_min,
        condition_mult=condition["combined"],
    )

    # Mark best value across all categories
    all_fare_lows = [cat["fare_low"] for p in results for cat in p["categories"]]
    lowest = min(all_fare_lows) if all_fare_lows else 0
    for p in results:
        for cat in p["categories"]:
            cat["is_best_value"] = cat["fare_low"] == lowest

    return {
        "city": CITY_DISPLAY.get(city_key, city_key.title()),
        "distance_km": req.distance_km,
        "duration_min": req.duration_min,
        "condition": condition,
        "disclaimer": "Estimated fares based on published fare structures. Not live pricing. Verify in-app before booking.",
        "results": results,
    }
