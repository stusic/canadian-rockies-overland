# Trip data schema

This document describes the data files the map application reads. The app
(`js/`, `index.html`) never needs to change when this data changes — only
these files do.

## Directory layout

```
data/
  metadata.json              Trip-level info and the 12-day framework (titles,
                              descriptions, status — no map geometry).
  scouting-regions.json      Named candidate regions with no confirmed geometry
                              yet. Shown as a list, not plotted on the map.
  inn-night.json              The one flexible non-camping night: candidate
                              lodging/dinner/evening options. No map geometry.
  overview.geojson           Small set of non-day-specific reference points
                              (currently just the Denver start/end marker).
  days/day-01.geojson         One GeoJSON FeatureCollection per itinerary day.
  ... day-12.geojson          Holds that day's points/routes/polygons.
  local-overrides.example.json  Template for an optional, gitignored file
                              that attaches real dates/local events locally
                              without ever publishing them. See below.
```

## `metadata.json`

```json
{
  "trip": { "title": "...", "origin": "Denver, CO", "destination": "Canadian Rockies" },
  "days": [
    { "id": 1, "title": "...", "summary": "...", "status": "planning-framework" }
  ]
}
```

`days[].status` is one of:
- `planning-framework` — placeholder day, route/activities not yet chosen.
- `draft` — a plan exists but hasn't been field- or source-verified.
- `confirmed` — reviewed and considered reliable.

## `days/day-NN.geojson`

Standard GeoJSON `FeatureCollection`. Every `Feature.properties` object should
follow this shape:

```json
{
  "day": 1,
  "category": "driving-route",
  "name": "Short label shown in the UI",
  "description": "Plain-language detail for the feature panel.",
  "sourceUrl": "https://... or null",
  "difficulty": "easy | moderate | difficult | extreme | null",
  "status": "verified | approximate | unresearched",
  "verified": false
}
```

`category` must be one of the layer types the app understands:

| category               | Typical geometry      | Meaning                                              |
|------------------------|------------------------|-------------------------------------------------------|
| `driving-route`        | LineString             | Paved/gravel road travel between stops                 |
| `trail-4x4`            | LineString             | High-clearance / 4x4 track                             |
| `activity`             | Point / Polygon        | Hike, viewpoint, town stop, attraction                 |
| `camping-search-area`  | Polygon                | Area researched as generally open to dispersed camping |
| `land-use-boundary`    | Polygon / LineString   | Crown land, park, WMU, closures, etc.                  |
| `campsite-candidate`   | Point                  | A specific candidate campsite inside a search area     |
| `fallback-campground`  | Point                  | Nearest established campground if dispersed camping falls through |
| `fuel-diesel`          | Point                  | Diesel-capable fuel stop (gasoline-only stations excluded) |
| `restaurant`           | Point                  | A recommended restaurant in a town along the route     |
| `reference-point`      | Point                  | Non-trip-specific landmark (e.g. Denver start/end)      |

`status` drives how the feature is drawn and labeled:
- `verified` — confirmed from an authoritative source (land-use regulation,
  official trail report, GPS track, confirmed diesel pump, etc.). Drawn
  solid, full opacity.
- `approximate` — plausible but not confirmed (e.g., read off a map, not
  field-checked). Drawn dashed.
- `unresearched` — placeholder only; location/extent is a guess or unknown.
  Drawn dotted, low opacity, and flagged in the feature panel. **A
  `camping-search-area` polygon with this status is not drawn on the map at
  all** — only a researched (`verified`/`approximate`) camping area is shown,
  so the map never implies a place is open to camping before that's checked.

`verified` is a convenience boolean for quick styling/filtering and should be
`true` only when `status` is `"verified"`.

Never invent precise coordinates, trail lines, campsite points, land-use
boundaries, fuel availability, or restaurant recommendations to fill a gap.
Leave the day file's `features` array without that feature, or add it with
`status: "unresearched"` and a `description` explaining what is still
unknown, until it can be sourced.

### `camping-search-area` — additional guidance

- Shape the polygon from an actual researched boundary (a land-use/zoning
  boundary, a Crown land parcel, a published OHV/recreation area outline) —
  never an arbitrary circle or buffer around a point.
- Keep these areas concentrated around that day's overnight destination; a
  search area that isn't near where the day actually stops isn't useful.
- `sourceUrl` should point at the regulation or reference that justifies
  "camping is generally permitted here" — keep it populated so the feature
  panel can show it.

### `land-use-boundary` — additional guidance

These are informational outlines (so a camper can check status before
relying on an area), not a layer meant to visually dominate the map with
"forbidden zone" coloring — the app renders them with minimal fill
regardless of status. Keep polygons precise and sourced; don't draw a broad
area as "restricted" on a guess.

### `campsite-candidate` — additional fields

```json
{ "category": "campsite-candidate", "siteStatus": "proposed | confirmed", "day": 6, "status": "approximate" }
```

`siteStatus` is independent of the usual `status` field:
- `status` says how confident we are in the *coordinate/description itself*.
- `siteStatus` says whether the *site* is just an idea (`proposed`, drawn
  hollow/dashed) or has actually been confirmed usable — legal, accessible,
  and suitable (`confirmed`, drawn solid). A site can be a confident
  (`status: verified`) coordinate for a spot that's still only `proposed`.

Multiple `campsite-candidate` points may share the same `day` to represent
several candidates inside one `camping-search-area`.

### `fallback-campground` — additional fields

```json
{ "category": "fallback-campground", "fallbackForDay": 6, "seasonalRestrictions": "e.g. closed mid-Oct–May", "day": 6 }
```

`fallbackForDay` links the established campground to the day (and its
dispersed-camping search area) it backs up. `seasonalRestrictions` is free
text shown in the feature panel; omit it (or use `null`) if unknown.

### `fuel-diesel` — additional guidance

Only add a station here if it's a diesel-capable stop — exclude gasoline
-only stations outright rather than adding them and marking them
unresearched. Use `status` to track whether diesel availability itself is
confirmed (`verified`) or just assumed/unconfirmed (`approximate` /
`unresearched`).

### `restaurant` — additional guidance

Two or three recommendations per relevant town is plenty — this layer is
meant to stay light. It only appears on the map when its category checkbox
is enabled.

## `scouting-regions.json`

Named regions identified as worth investigating, but without confirmed
coordinates yet. Each entry:

```json
{
  "id": "bull-river",
  "name": "Bull River",
  "generalArea": "East Kootenay region, British Columbia (Kootenay River drainage)",
  "notes": "Candidate dispersed-camping / 4x4 scouting region. Exact access points, trail conditions, and land-use status not yet researched.",
  "status": "unresearched",
  "sourceUrl": null
}
```

These are intentionally **not** GeoJSON — plotting them would require a
coordinate, and none has been verified. Once a region is researched, move
its confirmed features into the relevant `days/day-NN.geojson` file(s) and
either remove the entry here or mark it resolved.

## `overview.geojson`

Small FeatureCollection for landmarks that aren't tied to a single day, such
as the Denver, CO start/end point. Same `properties` shape as day files,
with `day: null`.

## `inn-night.json`

The trip reserves exactly one night in an inn instead of camping, on a
flexible day rather than a fixed one:

```json
{
  "candidateDays": [5, 6, 7],
  "preferredDay": 6,
  "date": null,
  "localEvents": [],
  "lodging": [
    { "id": "...", "name": "...", "generalArea": "...", "notes": "e.g. budget motel, roughly $/night", "status": "unresearched", "sourceUrl": null }
  ],
  "dinner": [ "...same shape as lodging..." ],
  "eveningActivities": [ "...same shape as lodging..." ]
}
```

`candidateDays` must only ever contain itinerary day numbers (1-12) —
never a calendar date. `date` and `localEvents` exist as placeholders for
later research and must stay `null` / `[]` in this committed file (CI
enforces this); see **local-overrides** below for where real values go
once they're known.

## `local-overrides.json` (gitignored, optional)

This repository is public, so actual travel dates and any local-event
research tied to them should never be committed to it. `data/local-overrides.json`
is listed in `.gitignore` and, if present, is merged into `metadata.json`'s
day entries and into `inn-night.json` at load time — then silently ignored
if the file doesn't exist. Copy `data/local-overrides.example.json` to
`data/local-overrides.json` locally to use it:

```json
{
  "days": { "6": { "date": "2027-07-10" } },
  "innNight": { "date": "2027-07-10", "localEvents": [ { "name": "...", "sourceUrl": null } ] }
}
```

`scripts/validate-data.mjs` fails the build if a `date` or non-empty
`localEvents` ever ends up in a committed file instead.
