// Shared application state and a minimal pub/sub bus.
// Kept framework-free so the app has no build step.
var App = window.App || {};

App.CATEGORIES = [
  { id: "driving-route", label: "Driving routes", color: "#4da3ff" },
  { id: "trail-4x4", label: "4x4 trails", color: "#e8792c" },
  { id: "activity", label: "Activities", color: "#2dd4bf" },
  { id: "camping-search-area", label: "Dispersed camping search areas", color: "#3fb950" },
  { id: "land-use-boundary", label: "Legal land-use boundaries", color: "#e24a4a" },
  { id: "campsite-candidate", label: "Campsite candidates", color: "#ffd166" },
  { id: "fallback-campground", label: "Overnight fallback campgrounds", color: "#8b5cf6" },
  { id: "fuel-diesel", label: "Diesel fuel stops", color: "#78350f" },
  { id: "restaurant", label: "Restaurants", color: "#ec4899" },
  { id: "reference-point", label: "Reference points", color: "#9aa2ab" }
];

App.STATUS_STYLE = {
  verified: { dashArray: null, opacity: 1, fillOpacity: 0.25 },
  approximate: { dashArray: "6 4", opacity: 0.9, fillOpacity: 0.15 },
  unresearched: { dashArray: "1 5", opacity: 0.6, fillOpacity: 0.08 },
  reference: { dashArray: null, opacity: 1, fillOpacity: 0.25 }
};

// Distinguishes a candidate campsite idea from one that's been confirmed
// usable, independently of the verified/approximate/unresearched info-status.
App.SITE_STATUS_STYLE = {
  proposed: { dashArray: "4 3", fillOpacity: 0.2, weight: 2 },
  confirmed: { dashArray: null, fillOpacity: 0.75, weight: 2 }
};

App.state = {
  map: null,
  dayVisible: {},       // { [dayId]: boolean }
  categoryVisible: {},  // { [categoryId]: boolean }
  dayLayers: {},        // { [dayId]: { [categoryId]: L.GeoJSON } }
  dayMeta: {},           // { [dayId]: metadata entry }
  importedLayer: null,  // L.FeatureGroup for imported files
  focusDay: 1,           // day currently targeted by the Prev/Next/Zoom-to-Day controls
  innNight: null         // data/inn-night.json contents, once loaded
};

App.bus = (function () {
  var listeners = {};
  return {
    on: function (evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
    },
    emit: function (evt, payload) {
      (listeners[evt] || []).forEach(function (fn) { fn(payload); });
    }
  };
})();

App.escapeHtml = function (str) {
  var div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
};

App.showToast = function (message, duration) {
  var el = document.getElementById("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(App._toastTimer);
  App._toastTimer = setTimeout(function () {
    el.classList.add("hidden");
  }, duration || 3000);
};

window.App = App;
