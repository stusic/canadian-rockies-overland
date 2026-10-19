// Prev/Next/Zoom-to-Day/Zoom-to-entire-trip controls, floating over the map.
// "Day" here always means the itinerary day number (1-12) -- never a
// calendar date.
(function (App) {

  function clampDay(id) {
    return Math.max(1, Math.min(12, id));
  }

  function updateLabel() {
    var meta = App.state.dayMeta[App.state.focusDay];
    document.getElementById("daynav-label").textContent = meta ? meta.title.replace(/^Day \d+\s*—\s*/, "Day " + App.state.focusDay + " — ") : "Day " + App.state.focusDay;
  }

  function setFocusDay(id) {
    App.state.focusDay = clampDay(id);
    updateLabel();
  }

  // Shows that day's checkbox as on (so what's zoomed to is actually
  // visible), fits the map to its features, and says plainly when there's
  // nothing to show yet instead of zooming somewhere misleading.
  function zoomToDay(dayId) {
    var count = App.dayFeatureCount(dayId);
    if (count === 0) {
      App.showToast("Day " + dayId + " has no geographic data yet");
      return;
    }

    if (!App.state.dayVisible[dayId]) {
      App.state.dayVisible[dayId] = true;
      var checkbox = document.querySelector('#day-list li:nth-child(' + dayId + ') input[type=checkbox]');
      if (checkbox) checkbox.checked = true;
      App.refreshVisibility();
    }

    var bounds = App.combinedBounds(App.dayLayerList(dayId));
    if (bounds) {
      App.state.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }

  function zoomToEntireTrip() {
    var allLayers = Object.keys(App.state.dayLayers).reduce(function (acc, dayId) {
      return acc.concat(App.dayLayerList(dayId));
    }, []);
    var bounds = App.combinedBounds(allLayers);
    if (!bounds) {
      App.showToast("No geographic data yet to zoom to");
      return;
    }
    App.state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }

  App.initDayNav = function () {
    updateLabel();

    document.getElementById("daynav-prev").addEventListener("click", function () {
      setFocusDay(App.state.focusDay - 1);
      zoomToDay(App.state.focusDay);
    });
    document.getElementById("daynav-next").addEventListener("click", function () {
      setFocusDay(App.state.focusDay + 1);
      zoomToDay(App.state.focusDay);
    });
    document.getElementById("daynav-zoom-day").addEventListener("click", function () {
      zoomToDay(App.state.focusDay);
    });
    document.getElementById("daynav-zoom-trip").addEventListener("click", zoomToEntireTrip);
  };

})(window.App);
