"""
Condition multipliers for surge estimation.

These represent how demand/supply shifts under different real-world conditions.
Sources: platform surge pattern reports (Economic Times, Reddit r/bangalore),
         driver-side community discussions, and observable patterns.
"""

WEATHER_MULTIPLIERS = {
    "clear":       1.00,
    "light_rain":  1.30,  # Slight demand uptick, most drivers still active
    "medium_rain": 1.65,  # Noticeable surge, some drivers pull off road
    "heavy_rain":  2.10,  # High surge, ~30-40% driver reduction common in Indian cities
    "storm":       2.70,  # Severe: most drivers stop, demand spikes for those who stay
    "disaster":    3.50,  # Flooding/cyclone: app prices may hit platform cap or go unavailable
}

WEATHER_LABELS = {
    "clear":       "☀️ Clear",
    "light_rain":  "🌦 Light Rain",
    "medium_rain": "🌧 Moderate Rain",
    "heavy_rain":  "⛈ Heavy Rain",
    "storm":       "🌩 Storm / Thunderstorm",
    "disaster":    "🌊 Flooding / Disaster",
}

WEATHER_DESCRIPTIONS = {
    "clear":       "Normal fares",
    "light_rain":  "Slight surge (+30%)",
    "medium_rain": "Moderate surge (+65%)",
    "heavy_rain":  "High surge (+110%)",
    "storm":       "Severe surge (+170%)",
    "disaster":    "Extreme surge — may be unavailable (+250%)",
}

TIME_MULTIPLIERS = {
    "early_morning": 0.85,   # 4–7 AM: low demand, many idle drivers
    "morning_peak":  1.35,   # 7–10 AM: office rush
    "midday":        1.00,   # 10 AM–4 PM: baseline
    "evening_peak":  1.30,   # 4–9 PM: evening commute
    "night":         1.50,   # 9 PM–12 AM: fewer drivers, night life demand
    "late_night":    1.75,   # 12–4 AM: very few drivers, bar/party crowd
}

TIME_LABELS = {
    "early_morning": "🌅 4–7 AM (Early)",
    "morning_peak":  "🚦 7–10 AM (Rush)",
    "midday":        "☀️ 10 AM–4 PM (Off-peak)",
    "evening_peak":  "🚗 4–9 PM (Rush)",
    "night":         "🌙 9 PM–12 AM (Night)",
    "late_night":    "🌃 12–4 AM (Late Night)",
}

TIME_DESCRIPTIONS = {
    "early_morning": "Low demand (-15%)",
    "morning_peak":  "Rush hour (+35%)",
    "midday":        "Normal fares",
    "evening_peak":  "Rush hour (+30%)",
    "night":         "Night surge (+50%)",
    "late_night":    "Late night surge (+75%)",
}

SPECIAL_MULTIPLIERS = {
    "none":         1.00,
    "festival":     1.40,   # Diwali, Holi, Eid, etc. — demand spikes, restricted supply
    "new_year":     2.20,   # New Year's Eve: highest annual surge event
    "airport_zone": 1.20,   # Airport pickup/drop: premium zone pricing common
    "cricket_match": 1.35,  # Post-IPL / big match: mass dispersal demand
}

SPECIAL_LABELS = {
    "none":          "✓ Normal",
    "festival":      "🎉 Festival / Holiday",
    "new_year":      "🎆 New Year's Eve",
    "airport_zone":  "✈️ Airport / Station",
    "cricket_match": "🏏 Cricket Match",
}

SPECIAL_DESCRIPTIONS = {
    "none":          "No special event",
    "festival":      "Diwali, Holi, Eid, etc. (+40%)",
    "new_year":      "Dec 31 surge (+120%)",
    "airport_zone":  "Airport zone pricing (+20%)",
    "cricket_match": "Post-match rush (+35%)",
}


def get_time_slot(hour: int) -> str:
    """Map a 0-23 hour to a time slot key."""
    if 4 <= hour < 7:
        return "early_morning"
    elif 7 <= hour < 10:
        return "morning_peak"
    elif 10 <= hour < 16:
        return "midday"
    elif 16 <= hour < 21:
        return "evening_peak"
    elif 21 <= hour <= 23:
        return "night"
    else:  # 0–3 AM
        return "late_night"


def compute_condition_multiplier(
    weather: str = "clear",
    time_slot: str = "midday",
    special: str = "none",
) -> dict:
    w = WEATHER_MULTIPLIERS.get(weather, 1.0)
    t = TIME_MULTIPLIERS.get(time_slot, 1.0)
    s = SPECIAL_MULTIPLIERS.get(special, 1.0)

    # Combine: weather × time × special. Cap at 5.0x (extreme disaster + event).
    combined = round(min(w * t * s, 5.0), 3)

    is_default = (weather == "clear" and time_slot == "midday" and special == "none")

    parts = []
    if weather != "clear":
        parts.append(WEATHER_LABELS.get(weather, weather))
    if time_slot not in ("midday",):
        parts.append(TIME_LABELS.get(time_slot, time_slot))
    if special != "none":
        parts.append(SPECIAL_LABELS.get(special, special))

    condition_summary = " + ".join(parts) if parts else "Normal conditions"

    return {
        "weather": weather,
        "time_slot": time_slot,
        "special": special,
        "weather_mult": w,
        "time_mult": t,
        "special_mult": s,
        "combined": combined,
        "condition_summary": condition_summary,
        "is_default": is_default,
    }


def get_metadata() -> dict:
    return {
        "weather_options": [
            {"key": k, "label": WEATHER_LABELS[k], "description": WEATHER_DESCRIPTIONS[k], "multiplier": WEATHER_MULTIPLIERS[k]}
            for k in WEATHER_MULTIPLIERS
        ],
        "time_options": [
            {"key": k, "label": TIME_LABELS[k], "description": TIME_DESCRIPTIONS[k], "multiplier": TIME_MULTIPLIERS[k]}
            for k in TIME_MULTIPLIERS
        ],
        "special_options": [
            {"key": k, "label": SPECIAL_LABELS[k], "description": SPECIAL_DESCRIPTIONS[k], "multiplier": SPECIAL_MULTIPLIERS[k]}
            for k in SPECIAL_MULTIPLIERS
        ],
    }
