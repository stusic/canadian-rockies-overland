// Renders the day list, category filters, and scouting-region list, and
// wires their checkboxes to the shared visibility state.
(function (App) {

  function renderCategoryList() {
    var list = document.getElementById("category-list");
    list.innerHTML = "";
    App.CATEGORIES.forEach(function (cat) {
      App.state.categoryVisible[cat.id] = true;

      var li = document.createElement("li");
      var label = document.createElement("label");

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.addEventListener("change", function () {
        App.state.categoryVisible[cat.id] = checkbox.checked;
        App.refreshVisibility();
      });

      var swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = cat.color;

      var text = document.createElement("span");
      text.textContent = cat.label;

      label.appendChild(checkbox);
      label.appendChild(swatch);
      label.appendChild(text);
      li.appendChild(label);
      list.appendChild(li);
    });
  }

  function renderDayList(days) {
    var list = document.getElementById("day-list");
    list.innerHTML = "";
    days.forEach(function (day) {
      App.state.dayVisible[day.id] = true;

      var li = document.createElement("li");
      li.className = "day-item status-" + day.status;
      var label = document.createElement("label");

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.addEventListener("change", function () {
        App.state.dayVisible[day.id] = checkbox.checked;
        App.refreshVisibility();
      });

      var text = document.createElement("span");
      text.className = "day-title";
      text.textContent = day.title;
      text.title = day.summary || "";

      label.appendChild(checkbox);
      label.appendChild(text);
      li.appendChild(label);
      list.appendChild(li);
    });

    document.getElementById("days-all-on").addEventListener("click", function () {
      days.forEach(function (d) { App.state.dayVisible[d.id] = true; });
      list.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = true; });
      App.refreshVisibility();
    });
    document.getElementById("days-all-off").addEventListener("click", function () {
      days.forEach(function (d) { App.state.dayVisible[d.id] = false; });
      list.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = false; });
      App.refreshVisibility();
    });
  }

  function renderScoutingRegions(regions) {
    var list = document.getElementById("scouting-region-list");
    list.innerHTML = "";
    regions.forEach(function (region) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="region-name">' + App.escapeHtml(region.name) +
        ' <span class="status-badge ' + region.status + '">' + App.escapeHtml(region.status) + "</span></div>" +
        '<div class="region-area">' + App.escapeHtml(region.generalArea) + "</div>" +
        '<div class="region-notes">' + App.escapeHtml(region.notes) + "</div>";
      list.appendChild(li);
    });
  }

  function renderCandidateList(listEl, items) {
    listEl.innerHTML = "";
    if (!items || items.length === 0) {
      listEl.innerHTML = '<li class="panel-note">None researched yet.</li>';
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="region-name">' + App.escapeHtml(item.name) +
        ' <span class="status-badge ' + item.status + '">' + App.escapeHtml(item.status) + "</span></div>" +
        (item.generalArea ? '<div class="region-area">' + App.escapeHtml(item.generalArea) + "</div>" : "") +
        (item.notes ? '<div class="region-notes">' + App.escapeHtml(item.notes) + "</div>" : "");
      listEl.appendChild(li);
    });
  }

  function renderInnNight(innNight) {
    var section = document.getElementById("inn-night-section");
    if (!innNight) {
      section.classList.add("hidden");
      return;
    }
    section.classList.remove("hidden");

    var days = innNight.candidateDays || [];
    var preferred = innNight.preferredDay;
    document.getElementById("inn-night-range").textContent =
      "Preferred: Day " + preferred + " (acceptable: Day " + days[0] + "–" + days[days.length - 1] + ")";

    renderCandidateList(document.getElementById("inn-night-lodging"), innNight.lodging);
    renderCandidateList(document.getElementById("inn-night-dinner"), innNight.dinner);
    renderCandidateList(document.getElementById("inn-night-evening"), innNight.eveningActivities);
  }

  function wireSidebarToggle() {
    var sidebar = document.getElementById("sidebar");
    var toggle = document.getElementById("sidebar-toggle");
    toggle.addEventListener("click", function () {
      var collapsed = sidebar.classList.toggle("collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
    });
    if (window.innerWidth <= 768) {
      sidebar.classList.add("collapsed");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  App.renderSidebar = function (metadata, regions, innNight) {
    renderCategoryList();
    renderDayList(metadata.days);
    renderScoutingRegions(regions);
    renderInnNight(innNight);
    wireSidebarToggle();
  };

})(window.App);
