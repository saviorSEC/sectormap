# Church of Malware Presents: SectorMap — Flock Network Archive

Static, backend-free build of [GainSec/SectorMap](https://github.com/GainSec/SectorMap) — the local-first archive browser — loaded with the full public Flock Safety network dataset, live endpoint verification, and a rebuilt Galaxy View with actionable drill-downs.

## What's inside — 570 archive records

- **94 subdomain records** — the Flock Safety subdomain attack surface from passive OSINT (crt.sh, DNS, JS bundles), each carrying live-verified intel: resolved IP, HTTP status, server header, zone, role, known endpoints
- **14 infrastructure records** — EKS, S3, RDS, ElastiCache, SQS, GovCloud, monitoring, internal IP pools
- **11 zone records** — the full internal network zoning: Cloudflare front, AWS ELB direct, GovCloud, ops, SaaS, data stores, monitoring
- **51 camera-network records** — public Flock camera locations by state (106,308 points, DeFlock/OSM, ODbL)
- **400 camera-city records** — camera clusters matched to real city names with counts and centroids

## Galaxy View

Rebuilt visualizer with:

- **Animated starfield galaxy** — clusters render as glowing bodies, records orbit their body
- **Mode switching** — cluster by TYPE, ZONE (full internal network map), SOURCE, or TAG
- **Click a star** — detail drawer with full endpoint intel: zone, role, resolved IP, DNS records, live HTTP status badge, server header, known endpoints
- **Actionable** — OPEN ENDPOINT launches the live host, COPY HOST copies the hostname, camera records link to the flock-globe map
- **Search** — full-text across titles, roles, zones, tags, descriptions; results fly you to the record
- **Sector records list** — all records in the focused cluster, clickable
- Dark ops-dashboard aesthetic, mobile responsive, keyboard ESC to dismiss

## How it works

The original app is FastAPI + SQLite, which cannot run on GitHub Pages. This build is fully client-side:

- `sectormap-data.js` — the complete archive embedded as JSON
- `sectormap-shim.js` — fetch interceptor reproducing the API (`/api/graph`, `/api/search`, `/api/records`, `/api/stats`) for any page that still calls the backend
- `GalaxyViewMain.html` — the rebuilt visualizer, reads the archive directly

No server, no build step, no dependencies.

## Local use

```bash
python3 -m http.server 8198
# open http://localhost:8198
```

## Data notes

- Camera data is public, crowdsourced, not affiliated with or endorsed by Flock Safety (© OpenStreetMap contributors & DeFlock, ODbL)
- Subdomain intel is passive OSINT + live public endpoint checks (DNS/HTTP) — no exploitation, no credentials
- No sensitive or local-only datasets are included in this build

## License

Visualization code: MIT (upstream SectorMap). Camera data: ODbL (attribution above).
