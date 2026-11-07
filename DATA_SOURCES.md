# BARA data sources

Verified: 7 November 2026. This file documents the implemented sources, not planned integrations.

## Weather: Open-Meteo

Weather is available in Pro only. Normal does not display environmental controls or request weather; switching back to Pro preserves the workspace's weather preferences.

- Provider: https://open-meteo.com/
- Historical documentation: https://open-meteo.com/en/docs/historical-weather-api
- Forecast documentation: https://open-meteo.com/en/docs
- Historical endpoint: https://archive-api.open-meteo.com/v1/archive (explicit model `era5`).
- Latest endpoint: https://api.open-meteo.com/v1/forecast (provider best-match model).
- Terms: https://open-meteo.com/en/terms
- Licence and attribution: CC BY 4.0; https://creativecommons.org/licenses/by/4.0/. The UI links “Weather data by Open-Meteo” and identifies transformations below. Free API is for this noncommercial demo; commercial deployment requires reviewing provider plans and keeping any paid key server-side.

Variables: temperature_2m (air temperature at 2 m, °C), relative_humidity_2m (%), wind_speed_10m (km/h), wind_direction_10m (degrees from true north), precipitation (mm accumulated in the preceding hour). Zero is a value; null is unavailable.

Historical ERA5 is global hourly reanalysis, approximately 0.25° (~25 km); it combines observations and modelling, not a sensor at the witness location. It has publication delay; recent unavailable dates are not substituted. Latest best-match estimates have location-dependent model/resolution; exact model run metadata is not supplied by this adapter. Values describe environment, not fire confirmation or fire temperature.

### Retrieval and transformations

Browser fetches public endpoints directly; no secret or witness identity is sent. Coordinates are permitted display positions or locations explicitly selected on the map. UTC UNIX timestamps are stored as milliseconds; event labels use WIB. Default is observation time, or explicitly the dataset reference when missing. Latest is a user choice; the actual time remains visible.

Area loading samples a globally aligned 0.25° grid, capped at 64 positions. At most eight positions per batch, sequential requests. Returned provider coordinates are retained; duplicate returned cells are combined. Colored display squares have 0.25° sides; they are not asserted to be native model-cell boundaries. No smoothing/interpolation is applied. Color ranges stay fixed: temperature -10 to 50°C, humidity 0–100%, precipitation 0–20 mm; endpoints saturate outside the range, exact values remain inspectable. Wind arrow direction is `(from + 180) modulo 360`; length is a display convention, not distance or a spread forecast. Calm/missing wind has no arrow.

Session cache keys include coordinates, date, variables (fixed), and model selection. TTL: historical 24h, latest 15min. No polling; obsolete requests are aborted/discarded. Failed requests never fall back to synthetic weather. Previous values remain marked stale and environmental layers hide after context changes. API free-tier limits documented by provider: fewer than 10,000 calls/day, 5,000/hour and 600/minute; multi-location requests can count as multiple calls. Session cache is not a deployment-wide quota guarantee.

Example (no key):
`https://archive-api.open-meteo.com/v1/archive?latitude=-2.16&longitude=113.87&start_date=2026-08-18&end_date=2026-08-18&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&models=era5&timezone=UTC&timeformat=unixtime`

Manual verification returned 24 hourly samples and source grid coordinates -2.25, 113.75. At 08:00 UTC: 36.5°C, 29% RH, 8.2 km/h wind from 139°, and 0 mm precipitation. Reanalysis may be revised by the provider.

## Basemap: OpenStreetMap

Tiles: https://tile.openstreetmap.org/{z}/{x}/{y}.png. Attribution: © OpenStreetMap contributors. Copyright: https://www.openstreetmap.org/copyright. Tile policy: https://operations.osmfoundation.org/policies/tiles/. Geographic reference only; not incident or weather evidence.

MapLibre GL JS is the renderer, not a data provider: https://maplibre.org/maplibre-gl-js/docs/.

## Report datasets

`public/data/intelligence-demo.json` and `public/data/intelligence-analysis.json` are authored synthetic examples, not real witness reports. Real weather loaded for their hypothetical positions/times does not authenticate them. Density represents submitted observation positions, not fire intensity. Known source independence is unavailable.

The UI now presents these records as a capture-session preview aligned with `public/UI-BACKEND-HANDOFF.md`. The eight-record source contains illustrative criterion results and checklists; no real images or AI calls produced them. The 72-position map scenario has no analysis results. Backend connection is intentionally deferred. See `docs/backend-ui-alignment.md` for field mappings and remaining dependencies.

## Not integrated

BMKG, satellite hotspots, terrain, live Witness submissions, automatic verification, spread prediction and danger scores are not part of this weather integration. No provider outages are silently replaced with another source.
