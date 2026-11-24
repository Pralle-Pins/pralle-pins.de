"""Holt die öffentlichen Baserow-Ansichten und schreibt data/kader.json + data/termine.json.

Es werden nur öffentlich freigegebene Ansichten gelesen (kein Token nötig).
Diese Ansichten enthalten nur die Felder, die auf der Website erscheinen dürfen.
"""
import json
import os
import sys
import urllib.request

BASE = os.environ.get("BASEROW_URL", "https://db.rhenania-hinsbeck.de")
VIEW_KADER = os.environ["BASEROW_VIEW_KADER"]
VIEW_TERMINE = os.environ["BASEROW_VIEW_TERMINE"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "_site"


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def public_rows(slug):
    info = get(f"{BASE}/api/database/views/{slug}/public/info/")
    names = {f"field_{f['id']}": f["name"] for f in info["fields"]}
    rows, page = [], 1
    while True:
        data = get(f"{BASE}/api/database/views/grid/{slug}/public/rows/?size=200&page={page}")
        for r in data["results"]:
            rows.append({names[k]: v for k, v in r.items() if k in names})
        if not data.get("next"):
            return rows
        page += 1


def val(v):
    if isinstance(v, dict):
        return v.get("value")
    return v


kader = []
for r in public_rows(VIEW_KADER):
    name = (r.get("Trikotname") or "").strip()
    if not name:
        continue
    nr = r.get("Nummer")
    kader.append({"name": name, "nummer": int(float(nr)) if nr not in (None, "") else None})
kader.sort(key=lambda p: (p["nummer"] is None, p["nummer"] or 0, p["name"]))

termine = []
for r in public_rows(VIEW_TERMINE):
    if r.get("Öffentlich") is False:
        continue
    termine.append({
        "titel": (r.get("Titel") or "").strip(),
        "von": r.get("Von"),
        "bis": r.get("Bis"),
        "ort": (r.get("Ort") or "").strip(),
        "art": val(r.get("Art")),
        "beschreibung": (r.get("Beschreibung") or "").strip(),
    })
termine.sort(key=lambda t: (t["von"] is None, t["von"] or ""))

os.makedirs(f"{OUT}/data", exist_ok=True)
with open(f"{OUT}/data/kader.json", "w", encoding="utf-8") as f:
    json.dump(kader, f, ensure_ascii=False, indent=1)
with open(f"{OUT}/data/termine.json", "w", encoding="utf-8") as f:
    json.dump(termine, f, ensure_ascii=False, indent=1)
print(f"Kader: {len(kader)}  Termine: {len(termine)}")
