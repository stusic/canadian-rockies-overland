(function (App) {
  document.addEventListener("DOMContentLoaded", function () {
    App.initMap();
    App.initFeaturePanel();
    App.initImportExport();
    App.initDayNav();

    App.loadTripData().then(function (result) {
      App.renderSidebar(result.metadata, result.regions, result.innNight);
      App.refreshVisibility();
    }).catch(function (err) {
      console.error(err);
      App.showToast("Failed to load trip data — see console for details");
    });
  });
})(window.App);
