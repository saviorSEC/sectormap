# Church of Malware Presents: SectorMap — Flock Network Archive

Static, backend-free build of [GainSec/SectorMap](https://github.com/GainSec/SectorMap) — the local-first archive browser — loaded with the public Flock Safety network dataset and served entirely client-side on GitHub Pages.

## What's inside

- **130 archive records**, two datasets:
  - **46 camera-network records** — public Flock Safety camera locations aggregated by state (106,308 points total), sourced from DeFlock (deflock.org / dontgetflocked.com) crowdsourced ALPR map, © OpenStreetMap contributors & DeFlock, ODbL
  - **84 subdomain records** — the Flock Safety subdomain attack surface, from public OSINT and subdomain enumeration
- **Galaxy View** — the cinematic relationship graph (mode by type / tags / source / domain / text similarity)
- **Main Operations** landing screen
- **Client-side search** — full-text across title, description, tags, type, source, url

## How it works

The original app is FastAPI + SQLite, which cannot run on GitHub Pages. This build replaces the backend with two scripts:

- `sectormap-data.js` — the full archive embedded as JSON
- `sectormap-shim.js` — a fetch interceptor that reproduces the API client-side: `/api/graph`, `/api/graph/focus`, `/api/search`, `/api/records`, `/api/stats`, `/api/types`

No server, no build step, no dependencies. Open `index.html` and it runs.

## Local use

```bash
python3 -m http.server 8198
# open http://localhost:8198
```

## Data notes

- Camera data is public, crowdsourced, and not affiliated with or endorsed by Flock Safety
- Subdomain inventory is derived from passive OSINT only
- No sensitive or local-only datasets are included in this build

## License

Visualization code: MIT (per upstream SectorMap). Camera data: ODbL (attribution above).
