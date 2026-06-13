from typing import Dict, Any, List, Tuple

# Uncertainty band around the condition estimate (±18%)
# Reflects that we know approximate surge level but not exact driver availability
_CONDITION_VARIANCE = 0.18


def _distance_cost(config: Dict[str, Any], distance_km: float) -> float:
    """Supports both linear and slab-based distance pricing."""
    if config.get("fare_model") == "slab":
        slab_km = config.get("first_km_included", 0)
        per_km_after = config.get("per_km_after", config.get("per_km", 0))
        if distance_km <= slab_km:
            return 0.0
        return per_km_after * (distance_km - slab_km)
    return config.get("per_km", 0) * distance_km


def _apply_surge(
    surge_range: List[float],
    condition_mult: float,
    subtotal: float,
    minimum_fare: float,
) -> Tuple[int, int, int]:
    """
    Compute fare_low, fare_high, fare_estimate given a condition multiplier.

    For no-surge platforms (surge_range = [1.0, 1.0]): conditions don't add surge.
    For all others: conditions shift the expected operating point within/beyond the range.
    """
    s_min, s_max = surge_range

    # No dynamic pricing (Namma Yatri, UberAuto marked as [1.0, 1.0])
    if s_min == s_max:
        fare = max(round(subtotal * s_min), minimum_fare)
        return fare, fare, fare

    # Effective surge bounds anchored around condition_mult ± variance
    eff_low = max(s_min, condition_mult * (1.0 - _CONDITION_VARIANCE))
    eff_high = max(s_max, condition_mult * (1.0 + _CONDITION_VARIANCE))

    fare_low = max(round(subtotal * eff_low), minimum_fare)
    fare_high = max(round(subtotal * eff_high), minimum_fare)
    fare_est = round((fare_low + fare_high) / 2)

    return fare_low, fare_high, fare_est


def estimate_fare(
    config: Dict[str, Any],
    distance_km: float,
    duration_min: float,
    condition_mult: float = 1.0,
) -> Dict:
    base = config.get("base_fare", 0)
    distance_cost = _distance_cost(config, distance_km)
    time_cost = config.get("per_min", 0) * duration_min
    booking_fee = config.get("booking_fee", 0)
    minimum = config.get("minimum_fare", 0)

    subtotal = base + distance_cost + time_cost + booking_fee

    surge_range = config.get("surge_range", [1.0, 1.0])
    fare_low, fare_high, fare_estimate = _apply_surge(
        surge_range, condition_mult, subtotal, minimum
    )

    return {
        "name": config["name"],
        "type": config.get("type", "cab"),
        "description": config.get("description", ""),
        "fare_low": fare_low,
        "fare_high": fare_high,
        "fare_estimate": fare_estimate,
        "icon": config.get("icon", "🚗"),
        "color": config.get("color", "#6B7280"),
        "booking_fee": booking_fee,
        "surge_range": surge_range,
        "surge_immune": surge_range[0] == surge_range[1],
        "note": config.get("note", None),
    }


def estimate_all_fares(
    city_config: Dict,
    distance_km: float,
    duration_min: float,
    condition_mult: float = 1.0,
) -> List[Dict]:
    results = []

    for platform_key, platform_data in city_config.items():
        categories = platform_data.get("categories", [])
        platform_result = {
            "platform": platform_key,
            "display_name": platform_data.get("display_name", platform_key),
            "brand_color": platform_data.get("brand_color", "#000000"),
            "text_color": platform_data.get("text_color", "#FFFFFF"),
            "logo_emoji": platform_data.get("logo_emoji", "🚗"),
            "categories": [
                estimate_fare(cat, distance_km, duration_min, condition_mult)
                for cat in categories
            ],
        }
        results.append(platform_result)

    # Sort platforms by cheapest category low fare
    results.sort(key=lambda p: min(c["fare_low"] for c in p["categories"]))

    return results
