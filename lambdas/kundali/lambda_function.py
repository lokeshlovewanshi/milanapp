"""
North Indian kundali (birth chart) generation.

Given a date, time and place of birth, returns the chart data plus a
ready-to-render SVG of the familiar diamond layout.

Conventions, and why these ones
-------------------------------
Astrology has several mutually incompatible systems, and picking the wrong one
produces a chart that is internally consistent but wrong for the user in front
of you. This follows the north Indian Vedic conventions:

  * **Sidereal zodiac with Lahiri ayanamsa.** Western astrology uses the
    tropical zodiac, which has drifted about 24 degrees from the constellations
    over two millennia. Using it here would put nearly every planet in the wrong
    sign by Vedic reckoning - a Mesh (Aries) person would be told they are Meen
    (Pisces). Lahiri is the ayanamsa the Indian government adopted and what
    almost every Indian almanac uses.

  * **Whole sign houses.** The north Indian chart is drawn as twelve fixed
    diamonds where house 1 always sits top-centre and *the rashi numbers move*.
    Each house is exactly one sign, starting from the sign the ascendant falls
    in. This is not the same as the Placidus/Koch house systems used in western
    charts, where houses have unequal sizes.

  * **Rahu and Ketu as the mean lunar nodes**, always exactly opposite each
    other. They are mathematical points, not bodies, which is why they get no
    "combust" or "retrograde" treatment here.

  * **Moshier ephemeris** (`FLG_MOSEPH`), because it is built into pyswisseph
    and needs no data files. The Swiss Ephemeris proper is more precise but
    ships as ~90 MB of files that would have to go in the layer. Moshier is
    accurate to well under an arcsecond for these dates - far past the precision
    any chart interpretation uses.

The chart is only as good as the birth time. An hour of error moves the
ascendant by roughly a whole sign, which changes every house placement, so the
response carries the inputs back for the caller to display.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

import swisseph as swe

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Sidereal, Lahiri - see the module docstring.
swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)

FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_MOSEPH

RASHIS = [
    "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya",
    "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen",
]

RASHIS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# (display name, short label for the chart, swisseph body id)
PLANETS = [
    ("Sun", "Su", swe.SUN),
    ("Moon", "Mo", swe.MOON),
    ("Mars", "Ma", swe.MARS),
    ("Mercury", "Me", swe.MERCURY),
    ("Jupiter", "Ju", swe.JUPITER),
    ("Venus", "Ve", swe.VENUS),
    ("Saturn", "Sa", swe.SATURN),
    ("Rahu", "Ra", swe.MEAN_NODE),
]

# Houses counted from the ascendant in which Mars makes a person manglik. This
# is the widely used rule; some traditions drop the 2nd, some add the 5th, and
# families differ on whether it matters at all - hence `manglik_rule` in the
# response rather than presenting a bare true/false as settled fact.
MANGLIK_HOUSES = {1, 2, 4, 7, 8, 12}

# Enough of India to cover where this community actually is, so a caller can
# pass a place name instead of coordinates. The Bundelkhand towns are here on
# purpose: they are the Gahoi heartland and are missing from most city lists.
# For anything else, pass latitude/longitude explicitly.
CITIES = {
    "jhansi": (25.4484, 78.5685), "gwalior": (26.2183, 78.1828),
    "chhatarpur": (24.9180, 79.5880), "tikamgarh": (24.7450, 78.8300),
    "sagar": (23.8388, 78.7378), "damoh": (23.8315, 79.4420),
    "panna": (24.7180, 80.1810), "satna": (24.5854, 80.8322),
    "orchha": (25.3518, 78.6403), "datia": (25.6660, 78.4600),
    "lalitpur": (24.6900, 78.4100), "banda": (25.4760, 80.3350),
    "mahoba": (25.2920, 79.8720), "hamirpur": (25.9570, 80.1490),
    "bhopal": (23.2599, 77.4126), "indore": (22.7196, 75.8577),
    "jabalpur": (23.1815, 79.9864), "ujjain": (23.1793, 75.7849),
    "delhi": (28.6139, 77.2090), "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777), "pune": (18.5204, 73.8567),
    "bengaluru": (12.9716, 77.5946), "bangalore": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867), "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639), "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873), "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319), "nagpur": (21.1458, 79.0882),
    "varanasi": (25.3176, 82.9739), "agra": (27.1767, 78.0081),
    "surat": (21.1702, 72.8311), "noida": (28.5355, 77.3910),
    "gurugram": (28.4595, 77.0266), "gurgaon": (28.4595, 77.0266),
}

# India has one timezone and this community is overwhelmingly in it. Callers
# abroad must pass tz_offset explicitly.
DEFAULT_TZ_OFFSET = 5.5


def lambda_handler(event, context):
    """
    Entry point.

    Accepts the payload either directly (backend invoking the function) or
    wrapped in an API Gateway proxy request.

    Expected fields:
        date        "1995-08-15"        required
        time        "09:30"             required, 24h local time
        place       "Jhansi"            optional if latitude/longitude given
        latitude    25.4484             optional if place is known
        longitude   78.5685
        tz_offset   5.5                 optional, hours east of UTC
    """
    body = event.get("body")
    if isinstance(body, str):
        body = json.loads(body)
    payload = body if isinstance(body, dict) else event

    try:
        chart = build_chart(payload)
    except ValueError as exc:
        return respond(400, {"error": str(exc)})
    except Exception as exc:  # noqa: BLE001
        logger.exception("kundali generation failed")
        return respond(500, {"error": "Could not generate the chart", "detail": str(exc)})

    return respond(200, chart)


def respond(status: int, payload: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def build_chart(payload: dict) -> dict:
    date_str = payload.get("date")
    time_str = payload.get("time")

    if not date_str:
        raise ValueError("date is required, as YYYY-MM-DD")
    if not time_str:
        # Deliberately fatal rather than defaulting to noon. A guessed time
        # produces a chart that looks authoritative and is wrong in every house
        # placement - worse than refusing.
        raise ValueError("time of birth is required, as HH:MM - the chart is meaningless without it")

    latitude, longitude = resolve_place(payload)
    tz_offset = float(payload.get("tz_offset", DEFAULT_TZ_OFFSET))

    try:
        local = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    except ValueError:
        try:
            local = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
        except ValueError as exc:
            raise ValueError("date must be YYYY-MM-DD and time HH:MM") from exc

    # Swiss Ephemeris works in Universal Time, so the local clock time has to
    # have its offset removed. Getting this wrong shifts the ascendant by a
    # sign or two, which is the most visible possible error.
    ut_hours = local.hour + local.minute / 60 + local.second / 3600 - tz_offset
    julian_day = swe.julday(local.year, local.month, local.day, ut_hours)

    ascendant_deg = compute_ascendant(julian_day, latitude, longitude)
    ascendant_sign = int(ascendant_deg // 30)

    planets = compute_planets(julian_day, ascendant_sign)

    moon = next(p for p in planets if p["name"] == "Moon")
    mars = next(p for p in planets if p["name"] == "Mars")

    return {
        "input": {
            "date": date_str,
            "time": time_str,
            "place": payload.get("place"),
            "latitude": latitude,
            "longitude": longitude,
            "tz_offset": tz_offset,
        },
        "ascendant": {
            "degree": round(ascendant_deg, 4),
            "sign_index": ascendant_sign,
            "rashi": RASHIS[ascendant_sign],
            "rashi_en": RASHIS_EN[ascendant_sign],
            "degree_in_sign": round(ascendant_deg % 30, 4),
        },
        "planets": planets,
        "houses": build_houses(ascendant_sign, planets),
        # These three map onto the zodiac, nakshatra and manglik columns already
        # on user_profile, so the backend can fill them in from one call.
        "moon_sign": moon["rashi"],
        "moon_sign_en": moon["rashi_en"],
        # Indices as well as names, because matching is arithmetic on these
        # two numbers and every consumer would otherwise have to map a name
        # back to a position - three places to get the ordering wrong.
        "moon_sign_index": moon["sign_index"],
        "nakshatra": moon["nakshatra"],
        "nakshatra_index": moon["nakshatra_index"],
        "nakshatra_pada": moon["pada"],
        "manglik": mars["house"] in MANGLIK_HOUSES,
        "manglik_rule": "Mars in house 1, 2, 4, 7, 8 or 12 from the ascendant",
        "ayanamsa": "Lahiri",
        "svg": render_svg(ascendant_sign, planets),
    }


def resolve_place(payload: dict) -> tuple[float, float]:
    """Coordinates win; a recognised place name is the fallback."""
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    if latitude is not None and longitude is not None:
        return float(latitude), float(longitude)

    place = (payload.get("place") or "").strip().lower()
    if place in CITIES:
        return CITIES[place]

    raise ValueError(
        f"Unknown place {payload.get('place')!r}. Pass latitude and longitude, "
        "or one of the known cities."
    )


def compute_ascendant(julian_day: float, latitude: float, longitude: float) -> float:
    """Sidereal longitude of the rising degree."""
    # b'W' is the whole-sign house system. The cusps it returns are unused - the
    # north Indian chart derives houses from the ascendant's sign - but the
    # ascendant itself comes from the same call.
    _cusps, ascmc = swe.houses_ex(julian_day, latitude, longitude, b"W", swe.FLG_SIDEREAL)
    return ascmc[0] % 360


def compute_planets(julian_day: float, ascendant_sign: int) -> list[dict]:
    planets = []

    for name, label, body in PLANETS:
        position, _flag = swe.calc_ut(julian_day, body, FLAGS)
        longitude = position[0] % 360
        speed = position[3]

        planets.append(describe(name, label, longitude, ascendant_sign, speed))

    # Ketu is always exactly opposite Rahu, by definition rather than by
    # calculation - there is no separate body to query.
    rahu = next(p for p in planets if p["name"] == "Rahu")
    ketu_longitude = (rahu["longitude"] + 180) % 360
    planets.append(describe("Ketu", "Ke", ketu_longitude, ascendant_sign, rahu["speed"]))

    return planets


def describe(name: str, label: str, longitude: float, ascendant_sign: int, speed: float) -> dict:
    sign = int(longitude // 30)

    # Whole sign houses: the ascendant's sign is house 1, and each following
    # sign is the next house.
    house = (sign - ascendant_sign) % 12 + 1

    # 27 nakshatras across 360 degrees, so 13 degrees 20 minutes each; each
    # splits into four padas.
    span = 360 / 27
    nakshatra_index = int(longitude // span)
    pada = int((longitude % span) // (span / 4)) + 1

    return {
        "name": name,
        "label": label,
        "longitude": round(longitude, 4),
        "sign_index": sign,
        "nakshatra_index": nakshatra_index,
        "rashi": RASHIS[sign],
        "rashi_en": RASHIS_EN[sign],
        "degree_in_sign": round(longitude % 30, 4),
        "house": house,
        "nakshatra": NAKSHATRAS[nakshatra_index],
        "pada": pada,
        # Nodes always move backwards, so flagging them retrograde is noise.
        "retrograde": bool(speed < 0) and name not in ("Rahu", "Ketu"),
        "speed": round(speed, 6),
    }


def build_houses(ascendant_sign: int, planets: list[dict]) -> list[dict]:
    houses = []
    for house_number in range(1, 13):
        sign = (ascendant_sign + house_number - 1) % 12
        houses.append({
            "house": house_number,
            "sign_index": sign,
            # What is written in the diamond on a north Indian chart is the
            # rashi number, 1-12, not the house number.
            "rashi_number": sign + 1,
            "rashi": RASHIS[sign],
            "rashi_en": RASHIS_EN[sign],
            "planets": [p["label"] for p in planets if p["house"] == house_number],
        })
    return houses


# --- chart drawing ---------------------------------------------------------
#
# The north Indian chart is a square with both diagonals drawn and a diamond
# joining the midpoints of the sides. That divides it into twelve regions in
# FIXED positions: house 1 is always the top-centre diamond, house 2 the
# top-left corner, and so on anticlockwise. Only the rashi numbers and the
# planets inside move between charts - which is exactly the opposite of a south
# Indian chart, where the signs are fixed and the houses move.

SIZE = 400

# Where the text for each house sits, as fractions of the square's side.
# Ordered house 1 to 12, anticlockwise from top centre.
HOUSE_ANCHORS = [
    (0.50, 0.25),  # 1  top centre
    (0.26, 0.11),  # 2  top left
    (0.11, 0.26),  # 3  left top
    (0.25, 0.50),  # 4  left centre
    (0.11, 0.74),  # 5  left bottom
    (0.26, 0.89),  # 6  bottom left
    (0.50, 0.75),  # 7  bottom centre
    (0.74, 0.89),  # 8  bottom right
    (0.89, 0.74),  # 9  right bottom
    (0.75, 0.50),  # 10 right centre
    (0.89, 0.26),  # 11 right top
    (0.74, 0.11),  # 12 top right
]


def render_svg(ascendant_sign: int, planets: list[dict]) -> str:
    """The chart as a standalone SVG string."""
    houses = build_houses(ascendant_sign, planets)
    s = SIZE
    half = s / 2

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}" '
        f'width="{s}" height="{s}" role="img" aria-label="North Indian kundali chart">',
        f'<rect x="0" y="0" width="{s}" height="{s}" fill="#FFFDF7"/>',
        f'<g stroke="#B4462F" stroke-width="1.5" fill="none">',
        f'<rect x="1" y="1" width="{s - 2}" height="{s - 2}"/>',
        # The two diagonals.
        f'<line x1="1" y1="1" x2="{s - 1}" y2="{s - 1}"/>',
        f'<line x1="{s - 1}" y1="1" x2="1" y2="{s - 1}"/>',
        # The diamond through the side midpoints.
        f'<polygon points="{half},1 {s - 1},{half} {half},{s - 1} 1,{half}"/>',
        '</g>',
    ]

    for house in houses:
        fx, fy = HOUSE_ANCHORS[house["house"] - 1]
        x, y = fx * s, fy * s

        # Rashi number, small and muted - it labels the box rather than being
        # the content.
        parts.append(
            f'<text x="{x:.1f}" y="{y - 10:.1f}" text-anchor="middle" '
            f'font-family="Helvetica,Arial,sans-serif" font-size="11" fill="#B4462F">'
            f'{house["rashi_number"]}</text>'
        )

        # Planets stack downwards so several in one house stay readable rather
        # than overrunning the diamond.
        for row, label in enumerate(house["planets"]):
            parts.append(
                f'<text x="{x:.1f}" y="{y + 6 + row * 13:.1f}" text-anchor="middle" '
                f'font-family="Helvetica,Arial,sans-serif" font-size="12" '
                f'font-weight="600" fill="#1F2937">{label}</text>'
            )

    parts.append('</svg>')
    return "".join(parts)
