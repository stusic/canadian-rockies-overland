// Side panel that shows full details for a clicked map feature.
(function (App) {

  function fieldRow(label, value) {
    if (value === undefined || value === null || value === "") return "";
    return "<dt>" + App.escapeHtml(label) + "</dt><dd>" + value + "</dd>";
  }

  function render(props) {
    var panel = document.getElementById("feature-panel");
    var content = document.getElementById("feature-panel-content");

    var status = props.status || "unresearched";
    var sourceHtml = props.sourceUrl
      ? '<a href="' + App.escapeHtml(props.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + App.escapeHtml(props.sourceUrl) + "</a>"
      : "<em>No source recorded</em>";

    var siteStatusBadge = props.siteStatus
      ? ' <span class="status-badge ' + props.siteStatus + '">' + App.escapeHtml(props.siteStatus) + "</span>"
      : "";

    content.innerHTML =
      "<h3>" + App.escapeHtml(props.name || "Untitled feature") + "</h3>" +
      '<span class="status-badge ' + status + '">' + App.escapeHtml(status) + "</span>" + siteStatusBadge +
      "<dl>" +
      fieldRow("Day", props.day != null ? "Day " + props.day : "Not day-specific") +
      fieldRow("Category", props.category) +
      fieldRow("Difficulty", props.difficulty) +
      fieldRow("Seasonal restrictions", props.seasonalRestrictions ? App.escapeHtml(props.seasonalRestrictions) : "") +
      fieldRow("Fallback for", props.fallbackForDay != null ? "Day " + props.fallbackForDay + "'s camping area" : "") +
      fieldRow("Description", props.description ? App.escapeHtml(props.description) : "") +
      fieldRow("Source", sourceHtml) +
      "</dl>";

    panel.classList.remove("hidden");
  }

  App.initFeaturePanel = function () {
    App.bus.on("feature:selected", render);
    document.getElementById("feature-panel-close").addEventListener("click", function () {
      document.getElementById("feature-panel").classList.add("hidden");
    });
  };

})(window.App);
