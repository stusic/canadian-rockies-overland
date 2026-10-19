# Canadian Rockies Overland Planner

A collaborative, map-based trip-planning site for a 12-day overland route
between Denver, CO and the Canadian Rockies. It runs entirely as static
files on GitHub Pages — no server, no build tooling, no database.

**Live goal:** a satellite-first map, organized by itinerary day, where
every point/route/area carries a description, source link, difficulty, and
a clear verified / approximate / unresearched status.

## How it's organized

```
index.html, css/, js/     The application. Should rarely need to change.
data/                      All trip content. Edit this to update the map.
  metadata.json            Trip title + the 12-day framework (titles only).
  scouting-regions.json    Named candidate regions, no coordinates yet.
  inn-night.json            The one flexible inn night: lodging/dinner/evening.
  overview.geojson         Non-day-specific reference points (Denver pin).
  days/day-01.geojson ...  One file per day holding that day's features.
  local-overrides.example.json  Template for local-only dates/events (gitignored copy).
  schema.md                Full description of every field above.
scripts/
  validate-data.mjs        Checks data/ is well-formed. Runs in CI and locally.
  dev-server.mjs           Tiny static file server for local preview.
.github/workflows/deploy.yml  Validates data, then deploys to GitHub Pages.
```

The app and the data are deliberately separate: **updating the map after
field research or new sources never requires touching `index.html`,
`css/`, or `js/`** — only files under `data/`.

## Updating the map

1. Open the relevant `data/days/day-NN.geojson` file. Each is a plain
   GeoJSON `FeatureCollection`.
2. Add a `Feature` with a geometry (`Point`, `LineString`, or `Polygon`) and
   a `properties` object following the shape in [`data/schema.md`](data/schema.md):
   `day`, `category`, `name`, `description`, `sourceUrl`, `difficulty`,
   `status`, `verified`. Some categories take a couple of extra fields
   (`campsite-candidate` needs `siteStatus`; `fallback-campground` can take
   `fallbackForDay`/`seasonalRestrictions`) — see schema.md for details.
3. Set `status` honestly:
   - `"verified"` — confirmed from an authoritative source.
   - `"approximate"` — plausible, not yet confirmed.
   - `"unresearched"` — placeholder; location/extent is a guess.
   The map draws these as solid, dashed, and dotted respectively, so this
   field is what keeps the map honest about what's actually known.
4. Run `npm test` (see below) before committing — it catches malformed
   JSON, bad categories/statuses, and structural mistakes.
5. Commit and open a pull request (or push to `main` if you have direct
   access). GitHub Actions validates the data and redeploys automatically.

To update day titles/summaries or the overall trip framework, edit
`data/metadata.json`. To add or resolve a named scouting region without
confirmed coordinates, edit `data/scouting-regions.json` — once a region
has a real, sourced location, move that into the appropriate day file
instead and remove or mark resolved the entry here.

### Recording real dates without publishing them

This repo is public, so actual travel dates (and any local-event research
tied to them) should never be committed to `metadata.json` or
`inn-night.json` — both are checked by `npm test` and CI will fail if a
real date sneaks in. Instead, copy `data/local-overrides.example.json` to
`data/local-overrides.json` (already gitignored) and put real dates there;
the app merges it in automatically if present, and ignores it if not. See
[`data/schema.md`](data/schema.md) for the exact shape.

### Importing GPS tracks

The **Import** button in the app accepts GPX, KML, KMZ, and GeoJSON files
and draws them on the map immediately. This is a local, in-browser preview
only — there is no backend, so nothing is saved automatically. To make an
imported track part of the permanent trip data:

1. Import the file in the app and confirm it looks right.
2. Use **Export → GeoJSON** to download the currently visible features.
3. Open the downloaded file, copy the relevant `Feature` object(s) into the
   correct `data/days/day-NN.geojson`, fill in `category`/`status`/etc.,
   and commit.

## Running locally

No dependencies are required to run the site; a dependency-free static
file server is included because browsers block `fetch()` of local JSON
files over `file://`.

```bash
npm run serve        # serves the site at http://localhost:8080
npm test              # validates everything under data/
```

Then open `http://localhost:8080` in a browser.

## Publishing (GitHub Pages)

1. Push this repository to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
   `.github/workflows/deploy.yml` validates `data/` with
   `scripts/validate-data.mjs` and, if it passes, deploys `index.html`,
   `css/`, `js/`, and `data/` to Pages. A failing validation blocks the
   deploy, so a malformed data edit can't take the live map down.

## Map layers

| Layer (category)        | Geometry used          | Meaning                                   |
|--------------------------|------------------------|--------------------------------------------|
| Driving routes           | LineString             | Paved/gravel road travel between stops     |
| 4x4 trails                | LineString             | High-clearance / 4x4 track                 |
| Activities                | Point / Polygon        | Hike, viewpoint, town stop, attraction      |
| Dispersed camping search areas | Polygon           | Researched area generally open to dispersed camping — **only shown once `status` is `verified` or `approximate`**, never for an unresearched one |
| Legal land-use boundaries | Polygon / LineString   | Crown land, park, WMU, closures, etc. (drawn as thin outlines, not a solid overlay) |
| Campsite candidates       | Point                  | Specific candidate site; `siteStatus` distinguishes proposed (hollow) from field-confirmed (solid) |
| Overnight fallback campgrounds | Point             | Nearest established campground if dispersed camping falls through |
| Diesel fuel stops          | Point                  | Diesel-capable stops only — no gasoline-only stations |
| Restaurants                | Point                  | A couple of recommendations per relevant town |
| Reference points           | Point                  | Non-trip-specific landmarks (e.g. the Denver start/end pin) |

Each layer can be toggled independently, and crossed with per-day
visibility, so you can see e.g. "just the 4x4 trails for Day 7" or "every
confirmed driving route across the whole trip."

## Day navigation

A small control floats over the map with **Prev / Next** arrows, the
current day label, a **Zoom to Day** button, and **Zoom to entire trip**.
Zooming to a day fits the map to that day's routes, camping areas, and
other features with padding, and automatically turns that day's visibility
on so what you zoomed to is actually visible. If a day has no geographic
data yet, it says so in a toast instead of zooming somewhere misleading.
Day numbers (1-12) are the only schedule reference anywhere in the app —
there are no calendar dates.

## The flexible inn night

The trip reserves one night in an inn instead of camping. It isn't pinned
to a single day — `data/inn-night.json` lists Day 6 as preferred with Days
5 and 7 as acceptable alternates, shown in the sidebar along with any
researched lodging, dinner, and evening-activity candidates. See
`data/schema.md` for the file shape.

## Current data state

The 12-day itinerary in `data/metadata.json` is an **editable planning
framework** — placeholder titles and day ordering only. The four scouting
regions identified so far (Bull River, White River, Kootenay–Palliser,
Ghost–Waiparous) are listed in `data/scouting-regions.json` by general area
only; **no coordinates, trail routes, campsites, legal boundaries, fuel
stops, restaurants, or lodging have been invented for them.** All 12
`days/day-NN.geojson` files, and `data/inn-night.json`'s lodging/dinner
/evening-activity lists, are currently empty for the same reason — the
categories and schema exist and are ready, but nothing has been added
until it's actually sourced. Until then, treat anything shown as
`unresearched` or `approximate` as not reliable for field use.

## Browser support / tile usage note

The default basemap is a satellite **hybrid**: Esri World Imagery with the
Esri Reference road and place-name overlays stacked on top, so satellite
stays the primary view without losing roads/labels. Topographic
(OpenTopoMap) and standard street (OpenStreetMap) remain as alternatives.
All of these are public tile servers with no API key, which is fine for
personal/low-traffic use under each provider's usage policy; failed tile
requests render as transparent instead of a broken-image icon. If this
site gets heavy traffic, switch to a key-based provider (e.g. MapTiler or
Thunderforest) in `js/mapSetup.js` to avoid being rate-limited.
