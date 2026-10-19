// Base map initialization: a satellite-with-labels hybrid (default),
// topographic, and street layers. Also builds the per-category,
// per-status GeoJSON layers used for every day of the trip.
(function (App) {

  // 1x1 transparent PNG, used so a failed tile request shows nothing
  // instead of a broken-image icon.
  var TRANSPARENT_TILE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  function tileLayer(url, options) {
    return L.tileLayer(url, Object.assign({ errorTileUrl: TRANSPARENT_TILE }, options));
  }

  function buildBaseLayers() {
    // Esri World Imagery is satellite-only; stacking the Esri "Reference"
    // overlays on top adds roads and place-name labels, giving the
    // satellite/topo/street switcher a true hybrid option as the default.
    var imagery = tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community" }
    );
    // No explicit pane: these stay in the default tilePane, stacking above
    // the imagery but below the day/feature layers (which use overlayPane).
    var roadsOverlay = tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    );
    var labelsOverlay = tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Labels &copy; Esri" }
    );
    var satelliteHybrid = L.layerGroup([imagery, roadsOverlay, labelsOverlay]);

    var topo = tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      subdomains: "abc",
      attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)"
    });

    var street = tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: "abc",
      attribution: "&copy; OpenStreetMap contributors"
    });

    return { satellite: satelliteHybrid, topo: topo, street: street };
  }

  App.initMap = function () {
    var map = L.map("map", {
      center: [45, -111],
      zoom: 5,
      zoomControl: true
    });

    var base = buildBaseLayers();
    base.satellite.addTo(map);

    var basemapButtons = document.querySelectorAll(".basemap-btn");
    basemapButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-basemap");
        Object.keys(base).forEach(function (k) {
          if (map.hasLayer(base[k])) map.removeLayer(base[k]);
        });
        base[key].addTo(map);
        basemapButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
      });
    });

    App.state.map = map;
    App.state.baseLayers = base;
    App.state.importedLayer = L.featureGroup().addTo(map);

    return map;
  };

  function popupHtml(props) {
    var status = props.status || "unresearched";
    var title = props.name || "Untitled feature";
    var siteStatusBadge = props.siteStatus
      ? ' <span class="status-badge ' + props.siteStatus + '">' + App.escapeHtml(props.siteStatus) + "</span>"
      : "";
    return (
      '<div class="popup-title">' + App.escapeHtml(title) + "</div>" +
      '<span class="status-badge ' + status + '">' + App.escapeHtml(status) + "</span>" + siteStatusBadge + " " +
      '<div class="popup-details-link" data-feature-details>View details</div>'
    );
  }

  // Returns an L.geoJSON layer styled by category + verification status.
  // Camping search areas are polygons representing where dispersed camping
  // is believed to be generally permitted; an unresearched one is excluded
  // entirely rather than drawn faintly, since there is nothing confirmed
  // yet to show.
  App.buildGeoJsonLayer = function (featureCollection, categoryId) {
    var categoryDef = App.CATEGORIES.filter(function (c) { return c.id === categoryId; })[0];
    var color = categoryDef ? categoryDef.color : "#4da3ff";

    return L.geoJSON(featureCollection, {
      filter: function (feature) {
        if (categoryId !== "camping-search-area") return true;
        var status = feature.properties && feature.properties.status;
        return status === "verified" || status === "approximate";
      },
      // NOTE: Leaflet's GeoJSON.addData always calls resetStyle() right
      // after pointToLayer creates a layer, which re-applies this `style`
      // function and overwrites whatever options pointToLayer set. So every
      // visual decision -- including the point-marker and siteStatus cases --
      // has to live here, not in pointToLayer, or it gets silently clobbered.
      style: function (feature) {
        var props = feature.properties || {};
        var status = props.status || "unresearched";
        var isPoint = feature.geometry && (feature.geometry.type === "Point" || feature.geometry.type === "MultiPoint");
        var s = App.STATUS_STYLE[status] || App.STATUS_STYLE.unresearched;

        var fillOpacity = s.fillOpacity;
        var dashArray = s.dashArray;
        var weight = isPoint ? 2 : 3;

        if (isPoint) {
          // Point markers need a visible minimum fill regardless of status.
          fillOpacity = Math.max(fillOpacity, 0.5);
        }
        if (categoryId === "land-use-boundary") {
          // Informational outlines, not a broad "this land is closed to
          // you" overlay -- keep their fill essentially off regardless of status.
          fillOpacity = Math.min(s.fillOpacity, 0.05);
        }
        // Campsite candidates carry a second, independent status -- proposed
        // vs. field-confirmed usable -- shown as a hollow/dashed marker vs.
        // a solid one, on top of whatever the info-verification status draws.
        if (categoryId === "campsite-candidate" && props.siteStatus) {
          var siteStyle = App.SITE_STATUS_STYLE[props.siteStatus];
          if (siteStyle) {
            dashArray = siteStyle.dashArray;
            fillOpacity = siteStyle.fillOpacity;
            weight = siteStyle.weight;
          }
        }

        return {
          radius: 7,
          color: color,
          weight: weight,
          opacity: s.opacity,
          fillColor: color,
          fillOpacity: fillOpacity,
          dashArray: dashArray
        };
      },
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, { radius: 7 });
      },
      onEachFeature: function (feature, layer) {
        var props = feature.properties || {};
        layer.bindPopup(popupHtml(props));
        layer.on("popupopen", function (e) {
          var el = e.popup.getElement();
          var link = el.querySelector("[data-feature-details]");
          if (link) {
            link.addEventListener("click", function () {
              App.bus.emit("feature:selected", props);
            });
          }
        });
      }
    });
  };

})(window.App);
