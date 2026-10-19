// Fetches trip data and builds per-day, per-category map layers.
(function (App) {

  function dayFileName(id) {
    return "data/days/day-" + String(id).padStart(2, "0") + ".geojson";
  }

  function splitByCategory(featureCollection) {
    var byCategory = {};
    (featureCollection.features || []).forEach(function (f) {
      var cat = (f.properties && f.properties.category) || "activity";
      (byCategory[cat] = byCategory[cat] || []).push(f);
    });
    return byCategory;
  }

  function addDayLayers(dayId, featureCollection) {
    var byCategory = splitByCategory(featureCollection);
    App.state.dayLayers[dayId] = {};
    Object.keys(byCategory).forEach(function (categoryId) {
      var fc = { type: "FeatureCollection", features: byCategory[categoryId] };
      App.state.dayLayers[dayId][categoryId] = App.buildGeoJsonLayer(fc, categoryId);
    });
  }

  // Optional and may not exist (data/local-overrides.json is gitignored --
  // see schema.md). A missing file is normal, not an error.
  function fetchOptionalJson(path) {
    return fetch(path)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function applyLocalOverrides(metadata, innNight, overrides) {
    if (!overrides) return;
    if (overrides.days) {
      Object.keys(overrides.days).forEach(function (dayId) {
        var meta = App.state.dayMeta[dayId];
        if (meta) Object.assign(meta, overrides.days[dayId]);
      });
    }
    if (overrides.innNight && innNight) {
      Object.assign(innNight, overrides.innNight);
    }
  }

  App.loadTripData = function () {
    var metadataPromise = fetch("data/metadata.json").then(function (r) { return r.json(); });
    var regionsPromise = fetch("data/scouting-regions.json").then(function (r) { return r.json(); });
    var overviewPromise = fetch("data/overview.geojson").then(function (r) { return r.json(); });
    var innNightPromise = fetch("data/inn-night.json").then(function (r) { return r.json(); });
    var overridesPromise = fetchOptionalJson("data/local-overrides.json");

    return Promise.all([metadataPromise, regionsPromise, overviewPromise, innNightPromise, overridesPromise]).then(function (results) {
      var metadata = results[0];
      var regions = results[1];
      var overview = results[2];
      var innNight = results[3];
      var overrides = results[4];

      metadata.days.forEach(function (d) { App.state.dayMeta[d.id] = d; });
      applyLocalOverrides(metadata, innNight, overrides);
      App.state.innNight = innNight;

      var dayFetches = metadata.days.map(function (d) {
        return fetch(dayFileName(d.id))
          .then(function (r) {
            if (!r.ok) throw new Error("Failed to load " + dayFileName(d.id));
            return r.json();
          })
          .then(function (fc) { addDayLayers(d.id, fc); })
          .catch(function (err) {
            console.error(err);
            addDayLayers(d.id, { type: "FeatureCollection", features: [] });
          });
      });

      addDayLayers("overview", overview);

      return Promise.all(dayFetches).then(function () {
        return { metadata: metadata, regions: regions, innNight: innNight };
      });
    });
  };

  // Shows/hides every loaded layer based on current day + category visibility state.
  App.refreshVisibility = function () {
    var map = App.state.map;
    Object.keys(App.state.dayLayers).forEach(function (dayId) {
      var dayOn = dayId === "overview" ? true : !!App.state.dayVisible[dayId];
      var categories = App.state.dayLayers[dayId];
      Object.keys(categories).forEach(function (categoryId) {
        var layer = categories[categoryId];
        var catOn = !!App.state.categoryVisible[categoryId];
        var shouldShow = dayOn && catOn;
        var isShown = map.hasLayer(layer);
        if (shouldShow && !isShown) layer.addTo(map);
        if (!shouldShow && isShown) map.removeLayer(layer);
      });
    });
  };

  // Every rendered layer for a day, regardless of the current category
  // checkboxes -- used by "Zoom to Day" so it reflects the day's full plan.
  App.dayLayerList = function (dayId) {
    var categories = App.state.dayLayers[dayId];
    if (!categories) return [];
    return Object.keys(categories).map(function (c) { return categories[c]; });
  };

  App.dayFeatureCount = function (dayId) {
    return App.dayLayerList(dayId).reduce(function (sum, layer) {
      return sum + layer.getLayers().length;
    }, 0);
  };

  // Combined bounds for a set of L.GeoJSON layers, or null if none of them
  // contain any features (an empty FeatureCollection has no valid bounds).
  App.combinedBounds = function (layers) {
    var group = L.featureGroup(layers.filter(function (l) { return l.getLayers().length > 0; }));
    var bounds = group.getBounds();
    return bounds.isValid() ? bounds : null;
  };

})(window.App);
