#!/usr/bin/env node
// Validates every file in data/ so a bad edit fails CI instead of silently
// breaking the map. No dependencies -- just Node's built-ins.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const CATEGORIES = [
  "driving-route",
  "trail-4x4",
  "activity",
  "camping-search-area",
  "land-use-boundary",
  "campsite-candidate",
  "fallback-campground",
  "fuel-diesel",
  "restaurant",
  "reference-point"
];
const STATUSES = ["verified", "approximate", "unresearched", "reference"];
const SITE_STATUSES = ["proposed", "confirmed"];
const GEOMETRY_TYPES = [
  "Point", "MultiPoint", "LineString", "MultiLineString",
  "Polygon", "MultiPolygon", "GeometryCollection"
];

let errors = [];

function fail(file, message) {
  errors.push(file + ": " + message);
}

function readJson(relativePath) {
  const full = path.join(dataDir, relativePath);
  if (!existsSync(full)) {
    fail(relativePath, "file does not exist");
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (err) {
    fail(relativePath, "invalid JSON -- " + err.message);
    return null;
  }
}

function validateFeature(file, feature, index) {
  const label = "feature[" + index + "]";
  if (!feature.type || feature.type !== "Feature") {
    fail(file, label + " missing type:Feature");
  }
  if (!feature.geometry || !GEOMETRY_TYPES.includes(feature.geometry.type)) {
    fail(file, label + " has an invalid or missing geometry type");
  }
  const props = feature.properties || {};
  if (!props.category || !CATEGORIES.includes(props.category)) {
    fail(file, label + ' has an invalid category: "' + props.category + '"');
  }
  if (!props.status || !STATUSES.includes(props.status)) {
    fail(file, label + ' has an invalid status: "' + props.status + '"');
  }
  if (!props.name) {
    fail(file, label + " is missing a name");
  }
  if (props.category === "camping-search-area" && feature.geometry && !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
    fail(file, label + " is a camping-search-area and should be a Polygon/MultiPolygon, not " + feature.geometry.type);
  }
  if (props.category === "campsite-candidate") {
    if (!props.siteStatus || !SITE_STATUSES.includes(props.siteStatus)) {
      fail(file, label + ' is a campsite-candidate with an invalid siteStatus: "' + props.siteStatus + '" (must be "proposed" or "confirmed")');
    }
    if (feature.geometry && feature.geometry.type !== "Point") {
      fail(file, label + " is a campsite-candidate and should be a Point, not " + feature.geometry.type);
    }
  }
}

// Fails if a value anywhere in obj is a non-null "date" field, or a
// non-empty "localEvents" array -- those belong only in the gitignored
// data/local-overrides.json, never in a file committed to this public repo.
function assertNoPublishedDates(file, obj) {
  if (!obj || typeof obj !== "object") return;
  if (Object.prototype.hasOwnProperty.call(obj, "date") && obj.date !== null) {
    fail(file, 'contains a non-null "date" value -- real travel dates must only live in the gitignored data/local-overrides.json');
  }
  if (Array.isArray(obj.localEvents) && obj.localEvents.length > 0) {
    fail(file, '"localEvents" is non-empty -- researched local events must only live in the gitignored data/local-overrides.json');
  }
  Object.values(obj).forEach((v) => {
    if (Array.isArray(v)) v.forEach((item) => assertNoPublishedDates(file, item));
    else if (v && typeof v === "object") assertNoPublishedDates(file, v);
  });
}

function validateFeatureCollection(file, fc) {
  if (!fc) return;
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    fail(file, "not a valid GeoJSON FeatureCollection");
    return;
  }
  fc.features.forEach((f, i) => validateFeature(file, f, i));
}

// metadata.json
const metadata = readJson("metadata.json");
let dayIds = [];
if (metadata) {
  if (!metadata.trip || !Array.isArray(metadata.days)) {
    fail("metadata.json", "missing trip object or days array");
  } else {
    dayIds = metadata.days.map((d) => d.id);
    if (dayIds.length !== 12) {
      fail("metadata.json", "expected 12 days, found " + dayIds.length);
    }
    metadata.days.forEach((d) => {
      if (!d.id || !d.title || !d.status) {
        fail("metadata.json", "day entry missing id/title/status: " + JSON.stringify(d));
      }
    });
  }
  assertNoPublishedDates("metadata.json", metadata);
}

// scouting-regions.json
const regions = readJson("scouting-regions.json");
if (regions) {
  if (!Array.isArray(regions)) {
    fail("scouting-regions.json", "expected a JSON array");
  } else {
    regions.forEach((r, i) => {
      if (!r.id || !r.name || !r.generalArea || !r.status) {
        fail("scouting-regions.json", "region[" + i + "] missing required fields");
      }
    });
  }
}

// inn-night.json
const innNight = readJson("inn-night.json");
if (innNight) {
  if (!Array.isArray(innNight.candidateDays) || innNight.candidateDays.length === 0) {
    fail("inn-night.json", "candidateDays must be a non-empty array of day numbers");
  } else if (!innNight.candidateDays.includes(innNight.preferredDay)) {
    fail("inn-night.json", "preferredDay must be one of candidateDays");
  }
  innNight.candidateDays.forEach((d) => {
    if (!Number.isInteger(d) || d < 1 || d > 12) {
      fail("inn-night.json", "candidateDays must only contain integers 1-12, found " + d);
    }
  });
  ["lodging", "dinner", "eveningActivities"].forEach((key) => {
    if (!Array.isArray(innNight[key])) {
      fail("inn-night.json", key + " must be an array");
    } else {
      innNight[key].forEach((item, i) => {
        if (!item.id || !item.name || !item.status) {
          fail("inn-night.json", key + "[" + i + "] missing id/name/status");
        }
      });
    }
  });
  assertNoPublishedDates("inn-night.json", innNight);
}

// overview.geojson
validateFeatureCollection("overview.geojson", readJson("overview.geojson"));

// day files
dayIds.forEach((id) => {
  const file = "days/day-" + String(id).padStart(2, "0") + ".geojson";
  validateFeatureCollection(file, readJson(file));
});

if (errors.length > 0) {
  console.error("Data validation failed:\n");
  errors.forEach((e) => console.error("  - " + e));
  console.error("\n" + errors.length + " error(s).");
  process.exit(1);
}

console.log("Data validation passed (" + dayIds.length + " day files, " + (regions ? regions.length : 0) + " scouting regions, inn-night.json ok).");
