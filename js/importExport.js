// GPX / KML / KMZ / GeoJSON import, and export of the currently visible
// features to GeoJSON, GPX, or KML. Imported features are added to a
// temporary in-browser layer only -- there is no backend, so persisting
// them into the trip data means exporting and committing the file (see
// README.md).
(function (App) {

  function downloadBlob(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function parseKmlOrGpxText(text, kind) {
    var xml = new DOMParser().parseFromString(text, "text/xml");
    return kind === "gpx" ? toGeoJSON.gpx(xml) : toGeoJSON.kml(xml);
  }

  function addImportedFeatureCollection(fc, sourceName) {
    var layer = L.geoJSON(fc, {
      style: { color: "#ffd166", weight: 3, dashArray: "4 3" },
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, { radius: 6, color: "#ffd166", weight: 2, fillOpacity: 0.6 });
      },
      onEachFeature: function (feature, layer) {
        var name = (feature.properties && (feature.properties.name || feature.properties.Name)) || "Imported feature";
        layer.bindPopup(
          '<div class="popup-title">' + App.escapeHtml(name) + "</div>" +
          '<span class="status-badge unresearched">imported</span>'
        );
      }
    });
    layer.addTo(App.state.importedLayer);
    if (layer.getBounds && layer.getBounds().isValid()) {
      App.state.map.fitBounds(layer.getBounds(), { maxZoom: 13, padding: [40, 40] });
    }
    App.showToast("Imported " + fc.features.length + " feature(s) from " + sourceName);
  }

  function handleFile(file) {
    var ext = file.name.split(".").pop().toLowerCase();

    if (ext === "geojson" || ext === "json") {
      file.text().then(function (text) {
        addImportedFeatureCollection(JSON.parse(text), file.name);
      }).catch(function (err) { App.showToast("Could not read " + file.name); console.error(err); });
      return;
    }

    if (ext === "gpx" || ext === "kml") {
      file.text().then(function (text) {
        addImportedFeatureCollection(parseKmlOrGpxText(text, ext), file.name);
      }).catch(function (err) { App.showToast("Could not parse " + file.name); console.error(err); });
      return;
    }

    if (ext === "kmz") {
      file.arrayBuffer().then(function (buf) { return JSZip.loadAsync(buf); }).then(function (zip) {
        var kmlEntryName = Object.keys(zip.files).filter(function (n) { return n.toLowerCase().endsWith(".kml"); })[0];
        if (!kmlEntryName) throw new Error("No .kml file found inside " + file.name);
        return zip.files[kmlEntryName].async("text");
      }).then(function (text) {
        addImportedFeatureCollection(parseKmlOrGpxText(text, "kml"), file.name);
      }).catch(function (err) { App.showToast("Could not read " + file.name); console.error(err); });
      return;
    }

    App.showToast("Unsupported file type: " + file.name);
  }

  function collectVisibleFeatureCollection() {
    var map = App.state.map;
    var features = [];

    Object.keys(App.state.dayLayers).forEach(function (dayId) {
      var categories = App.state.dayLayers[dayId];
      Object.keys(categories).forEach(function (categoryId) {
        var layer = categories[categoryId];
        if (map.hasLayer(layer)) {
          features = features.concat(layer.toGeoJSON().features);
        }
      });
    });

    if (map.hasLayer(App.state.importedLayer)) {
      features = features.concat(App.state.importedLayer.toGeoJSON().features);
    }

    return { type: "FeatureCollection", features: features };
  }

  function exportAs(format) {
    var fc = collectVisibleFeatureCollection();
    if (fc.features.length === 0) {
      App.showToast("No visible features to export");
      return;
    }

    if (format === "geojson") {
      downloadBlob("rockies-overland-export.geojson", JSON.stringify(fc, null, 2), "application/geo+json");
    } else if (format === "gpx") {
      downloadBlob("rockies-overland-export.gpx", togpx(fc), "application/gpx+xml");
    } else if (format === "kml") {
      downloadBlob("rockies-overland-export.kml", tokml(fc), "application/vnd.google-earth.kml+xml");
    }
  }

  App.initImportExport = function () {
    var fileInput = document.getElementById("import-file-input");
    document.getElementById("import-btn").addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      Array.prototype.forEach.call(fileInput.files, handleFile);
      fileInput.value = "";
    });

    var exportMenu = document.getElementById("export-menu");
    document.getElementById("export-btn").addEventListener("click", function (e) {
      exportMenu.classList.toggle("hidden");
    });
    exportMenu.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        exportAs(btn.getAttribute("data-format"));
        exportMenu.classList.add("hidden");
      });
    });
    document.addEventListener("click", function (e) {
      if (!exportMenu.contains(e.target) && e.target.id !== "export-btn") {
        exportMenu.classList.add("hidden");
      }
    });
  };

})(window.App);
