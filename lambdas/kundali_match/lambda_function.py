"""
Ashtakoota guna milan - the 36-point compatibility score.

Given each person's Moon nakshatra and rashi, scores the eight kootas that
north Indian families actually ask about, and returns the total out of 36 with
the per-koota breakdown.

Why this is a separate function from `kundali`
----------------------------------------------
It needs no ephemeris. Every koota below is a table lookup or a small piece of
arithmetic on two numbers - the Moon's nakshatra (0-26) and rashi (0-11) - both
of which the kundali function has already worked out and the backend has
stored. So this one has no dependencies at all, needs no layer, cold-starts in
milliseconds, and can be called for a whole list of candidates without the cost
of recomputing planetary positions.

What the score means, and what it does not
------------------------------------------
Ashtakoota is a convention, not a measurement. The weights below (1, 2, 3, 4,
5, 6, 7, 8) are the standard ones and the conventional reading is that 18+ is
acceptable, but families differ on every detail: some treat Nadi dosha as
absolute, some waive it when both are the same rashi, some only care about
Bhakoot. The response therefore returns each koota separately with its maximum,
so a caller can present the breakdown rather than a single number that implies
more precision than exists.

Deliberately not included: dasha analysis, navamsa, or any judgement about the
match. This computes the number families ask for. It does not advise.
"""

from __future__ import annotations

import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

RASHIS = [
    "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya",
    "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbh", "Meen",
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

# --- koota reference tables ------------------------------------------------
#
# All indexed by nakshatra 0-26 or rashi 0-11, in the standard order above.

# Varna, from rashi. Brahmin 3 > Kshatriya 2 > Vaishya 1 > Shudra 0.
VARNA = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]

# Vashya group, from rashi.
VASHYA = ["chatushpada", "chatushpada", "manav", "jalachar", "vanachar", "manav",
          "manav", "keet", "manav", "jalachar", "manav", "jalachar"]

# Yoni animal per nakshatra, and its sex. Same animal scores 4; the classic
# enemy pairs score 0.
YONI = [
    ("horse", "m"), ("elephant", "m"), ("sheep", "f"), ("serpent", "m"),
    ("serpent", "f"), ("dog", "f"), ("cat", "f"), ("sheep", "m"),
    ("cat", "m"), ("rat", "m"), ("rat", "f"), ("cow", "m"),
    ("buffalo", "f"), ("tiger", "f"), ("buffalo", "m"), ("tiger", "m"),
    ("deer", "f"), ("deer", "m"), ("dog", "m"), ("monkey", "m"),
    ("mongoose", "f"), ("monkey", "f"), ("lion", "f"), ("horse", "f"),
    ("lion", "m"), ("cow", "f"), ("elephant", "f"),
]

YONI_ENEMIES = {
    frozenset(("cow", "tiger")), frozenset(("elephant", "lion")),
    frozenset(("horse", "buffalo")), frozenset(("dog", "deer")),
    frozenset(("serpent", "mongoose")), frozenset(("cat", "rat")),
    frozenset(("monkey", "sheep")),
}

# Rashi lord per sign.
LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
         "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]

FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
}

ENEMIES = {
    "Sun": {"Venus", "Saturn"},
    "Moon": set(),
    "Mars": {"Mercury"},
    "Mercury": {"Moon"},
    "Jupiter": {"Mercury", "Venus"},
    "Venus": {"Sun", "Moon"},
    "Saturn": {"Sun", "Moon", "Mars"},
}

# Gana per nakshatra: deva, manushya, rakshasa.
GANA = ["deva", "manushya", "rakshasa", "manushya", "deva", "manushya",
        "deva", "deva", "rakshasa", "rakshasa", "manushya", "manushya",
        "deva", "rakshasa", "deva", "rakshasa", "deva", "rakshasa",
        "rakshasa", "manushya", "manushya", "deva", "rakshasa", "rakshasa",
        "manushya", "manushya", "deva"]

# Nadi per nakshatra: aadi, madhya, antya.
NADI = ["aadi", "madhya", "antya", "aadi", "madhya", "antya",
        "aadi", "madhya", "antya", "antya", "madhya", "aadi",
        "antya", "madhya", "aadi", "aadi", "madhya", "antya",
        "aadi", "madhya", "antya", "antya", "madhya", "aadi",
        "antya", "madhya", "aadi"]


def lambda_handler(event, context):
    body = event.get("body")
    if isinstance(body, str):
        body = json.loads(body)
    payload = body if isinstance(body, dict) else event

    try:
        result = match(payload)
    except ValueError as exc:
        return respond(400, {"error": str(exc)})
    except Exception as exc:  # noqa: BLE001
        logger.exception("matching failed")
        return respond(500, {"error": "Could not compute the match", "detail": str(exc)})

    return respond(200, result)


def respond(status, payload):
    return {"statusCode": status, "headers": {"Content-Type": "application/json"},
            "body": json.dumps(payload)}


def match(payload: dict) -> dict:
    """
    Expects, for each side, a nakshatra index 0-26 and a rashi index 0-11:

        {"boy": {"nakshatra": 4, "rashi": 1},
         "girl": {"nakshatra": 26, "rashi": 11}}

    Boy and girl are named rather than "a" and "b" because several kootas are
    NOT symmetric - Tara and Bhakoot are counted from one side to the other,
    so swapping them changes the score.
    """
    boy = side(payload, "boy")
    girl = side(payload, "girl")

    kootas = [
        varna(boy, girl),
        vashya(boy, girl),
        tara(boy, girl),
        yoni(boy, girl),
        graha_maitri(boy, girl),
        gana(boy, girl),
        bhakoot(boy, girl),
        nadi(boy, girl),
    ]

    total = sum(k["score"] for k in kootas)
    maximum = sum(k["max"] for k in kootas)

    return {
        "boy": describe(boy),
        "girl": describe(girl),
        "score": round(total, 1),
        "maximum": maximum,
        "percentage": round(100 * total / maximum, 1),
        "verdict": verdict(total),
        "kootas": kootas,
        # Stated rather than implied. A single number invites treating a
        # convention as a measurement.
        "note": ("Ashtakoota is a traditional convention, not a prediction. "
                 "Families differ on how much weight to give each koota."),
    }


def side(payload: dict, key: str) -> dict:
    raw = payload.get(key)
    if not isinstance(raw, dict):
        raise ValueError(f"'{key}' is required, with nakshatra and rashi indices")

    try:
        n = int(raw["nakshatra"])
        r = int(raw["rashi"])
    except (KeyError, TypeError, ValueError):
        raise ValueError(f"'{key}' needs integer 'nakshatra' (0-26) and 'rashi' (0-11)")

    if not 0 <= n <= 26:
        raise ValueError(f"'{key}.nakshatra' must be 0-26, got {n}")
    if not 0 <= r <= 11:
        raise ValueError(f"'{key}.rashi' must be 0-11, got {r}")

    return {"nakshatra": n, "rashi": r}


def describe(s: dict) -> dict:
    return {
        "nakshatra": NAKSHATRAS[s["nakshatra"]],
        "rashi": RASHIS[s["rashi"]],
        "gana": GANA[s["nakshatra"]],
        "nadi": NADI[s["nakshatra"]],
        "yoni": YONI[s["nakshatra"]][0],
    }


def koota(name, score, maximum, detail):
    return {"name": name, "score": score, "max": maximum, "detail": detail}


def varna(boy, girl):
    """The boy's varna should not be below the girl's."""
    b, g = VARNA[boy["rashi"]], VARNA[girl["rashi"]]
    score = 1 if b >= g else 0
    return koota("Varna", score, 1,
                 "Compatible" if score else "Boy's varna is below the girl's")


def vashya(boy, girl):
    b, g = VASHYA[boy["rashi"]], VASHYA[girl["rashi"]]
    if b == g:
        return koota("Vashya", 2, 2, "Same group")
    # Half credit for the common partial pairings; zero otherwise.
    partial = {frozenset(("manav", "chatushpada")), frozenset(("chatushpada", "jalachar"))}
    if frozenset((b, g)) in partial:
        return koota("Vashya", 1, 2, "Partially compatible")
    return koota("Vashya", 0, 2, "Different groups")


def tara(boy, girl):
    """
    Counted both ways and averaged, which is why it is not symmetric in the
    inputs. Remainders 3, 5 and 7 are the inauspicious ones.
    """
    def half(a, b):
        count = ((b - a) % 27) + 1
        return 0 if count % 9 in (3, 5, 7) else 1.5

    score = half(boy["nakshatra"], girl["nakshatra"]) + half(girl["nakshatra"], boy["nakshatra"])
    return koota("Tara", score, 3,
                 "Favourable" if score == 3 else "Partly favourable" if score else "Unfavourable")


def yoni(boy, girl):
    (ba, bs), (ga, gs) = YONI[boy["nakshatra"]], YONI[girl["nakshatra"]]
    if ba == ga:
        return koota("Yoni", 4, 4, f"Same yoni ({ba})")
    if frozenset((ba, ga)) in YONI_ENEMIES:
        return koota("Yoni", 0, 4, f"Enemy yonis ({ba} and {ga})")
    return koota("Yoni", 2, 4, f"{ba} and {ga}")


def graha_maitri(boy, girl):
    b, g = LORDS[boy["rashi"]], LORDS[girl["rashi"]]
    if b == g:
        return koota("Graha Maitri", 5, 5, f"Same lord ({b})")

    b_friendly = g in FRIENDS[b]
    g_friendly = b in FRIENDS[g]
    b_hostile = g in ENEMIES[b]
    g_hostile = b in ENEMIES[g]

    if b_friendly and g_friendly:
        return koota("Graha Maitri", 5, 5, f"{b} and {g} are friends")
    if b_hostile and g_hostile:
        return koota("Graha Maitri", 0, 5, f"{b} and {g} are enemies")
    if b_friendly or g_friendly:
        return koota("Graha Maitri", 3, 5, f"{b} and {g} are partly friendly")
    return koota("Graha Maitri", 1, 5, f"{b} and {g} are neutral")


def gana(boy, girl):
    b, g = GANA[boy["nakshatra"]], GANA[girl["nakshatra"]]
    if b == g:
        return koota("Gana", 6, 6, f"Both {b}")
    pair = frozenset((b, g))
    if pair == frozenset(("deva", "manushya")):
        return koota("Gana", 5, 6, "Deva and manushya")
    if pair == frozenset(("manushya", "rakshasa")):
        # Asymmetric: worse when the girl is rakshasa.
        return koota("Gana", 0 if GANA[girl["nakshatra"]] == "rakshasa" else 1, 6,
                     "Manushya and rakshasa")
    return koota("Gana", 0, 6, "Deva and rakshasa")


def bhakoot(boy, girl):
    """Zero for the 6/8, 5/9 and 2/12 rashi relationships."""
    diff = ((girl["rashi"] - boy["rashi"]) % 12) + 1
    other = ((boy["rashi"] - girl["rashi"]) % 12) + 1
    bad = {(6, 8), (8, 6), (5, 9), (9, 5), (2, 12), (12, 2)}
    if (diff, other) in bad:
        return koota("Bhakoot", 0, 7, f"{diff}/{other} - bhakoot dosha")
    return koota("Bhakoot", 7, 7, "No dosha")


def nadi(boy, girl):
    """
    The heaviest single koota, and the one most often treated as decisive.
    Same nadi scores zero.
    """
    b, g = NADI[boy["nakshatra"]], NADI[girl["nakshatra"]]
    if b == g:
        return koota("Nadi", 0, 8, f"Both {b} - nadi dosha")
    return koota("Nadi", 8, 8, f"{b} and {g}")


def verdict(total: float) -> str:
    # Wording kept plain. These are the conventional bands, not a judgement.
    if total >= 32:
        return "Excellent"
    if total >= 25:
        return "Very good"
    if total >= 18:
        return "Acceptable"
    return "Below the usual threshold"
