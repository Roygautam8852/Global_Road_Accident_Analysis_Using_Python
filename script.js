let accidentData = [];
let filteredData = [];

const charts = {
  yearLine: null,
  monthColumn: null,
  roadTypeBar: null,
  weatherBar: null,
  ageBar: null,
  severityPie: null,
  timeArea: null,
  scatter: null,
  boxplot: null,
  heatmap: null,
};

let mapInstance = null;
let mapLayerGroup = null;

const BAR_COLORS = [
  "#2563EB",
  "#F97316",
  "#10B981",
  "#EC4899",
  "#8B5CF6",
  "#FACC15",
  "#22C55E",
  "#14B8A6",
  "#F43F5E",
  "#3B82F6",
];

// Utility: group counts by key
function groupCount(data, key) {
  const map = {};
  data.forEach((row) => {
    const value = row[key];
    if (value === undefined || value === null || value === "") return;
    map[value] = (map[value] || 0) + 1;
  });
  const result = Object.entries(map).map(([name, count]) => ({
    name,
    count,
  }));
  return result;
}

// Populate filter dropdowns
function populateFilters(data) {
  const yearSet = new Set();
  const regionSet = new Set();
  const severitySet = new Set();

  data.forEach((row) => {
    if (row["Year"]) yearSet.add(row["Year"]);
    if (row["Region"]) regionSet.add(row["Region"]);
    if (row["Accident Severity"]) severitySet.add(row["Accident Severity"]);
  });

  const yearFilter = document.getElementById("yearFilter");
  const regionFilter = document.getElementById("regionFilter");
  const severityFilter = document.getElementById("severityFilter");

  function fillSelect(selectElem, values) {
    selectElem.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "All";
    allOption.textContent = "All";
    selectElem.appendChild(allOption);

    values.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      selectElem.appendChild(opt);
    });
  }

  const years = Array.from(yearSet).sort((a, b) => a - b);
  const regions = Array.from(regionSet).sort();
  const severities = Array.from(severitySet).sort();

  fillSelect(yearFilter, years);
  fillSelect(regionFilter, regions);
  fillSelect(severityFilter, severities);
}

// Apply filters
function applyFilters() {
  const yearVal = document.getElementById("yearFilter").value;
  const regionVal = document.getElementById("regionFilter").value;
  const severityVal = document.getElementById("severityFilter").value;

  filteredData = accidentData.filter((row) => {
    const yearMatch =
      yearVal === "All" || String(row["Year"]) === String(yearVal);
    const regionMatch =
      regionVal === "All" || String(row["Region"]) === String(regionVal);
    const severityMatch =
      severityVal === "All" ||
      String(row["Accident Severity"]) === String(severityVal);

    return yearMatch && regionMatch && severityMatch;
  });

  updateSummaryCards();
  updateCharts();
  updateMap();
}

// Summary cards
function updateSummaryCards() {
  let totalAccidents = filteredData.length;
  let totalFatalities = 0;
  let totalInjuries = 0;
  let totalLoss = 0;
  let totalResponseTime = 0;
  let responseCount = 0;

  filteredData.forEach((row) => {
    totalFatalities += Number(row["Number of Fatalities"] || 0);
    totalInjuries += Number(row["Number of Injuries"] || 0);
    totalLoss += Number(row["Economic Loss"] || 0);

    if (row["Emergency Response Time"] !== undefined) {
      const val = Number(row["Emergency Response Time"]);
      if (!isNaN(val)) {
        totalResponseTime += val;
        responseCount += 1;
      }
    }
  });

  const avgResponse =
    responseCount > 0 ? totalResponseTime / responseCount : 0;

  document.getElementById("totalAccidents").textContent =
    totalAccidents.toLocaleString();
  document.getElementById("totalFatalities").textContent =
    totalFatalities.toLocaleString();
  document.getElementById("totalInjuries").textContent =
    totalInjuries.toLocaleString();
  document.getElementById("totalLoss").textContent =
    "₹ " + totalLoss.toLocaleString();
  document.getElementById("avgResponseTime").textContent =
    avgResponse.toFixed(1) + " min";
}

// Create or update chart
function ensureChart(ctxId, type, dataConfig, optionsConfig, chartKey) {
  const ctx = document.getElementById(ctxId).getContext("2d");
  if (charts[chartKey]) {
    charts[chartKey].data = dataConfig;
    charts[chartKey].options = optionsConfig;
    charts[chartKey].update();
  } else {
    charts[chartKey] = new Chart(ctx, {
      type,
      data: dataConfig,
      options: optionsConfig,
    });
  }
}

// Update all charts
function updateCharts() {
  // 1. Line - accidents by Year
  let yearly = groupCount(filteredData, "Year");
  yearly.sort((a, b) => Number(a.name) - Number(b.name));
  const yearLabels = yearly.map((d) => d.name);
  const yearCounts = yearly.map((d) => d.count);

  ensureChart(
    "chartYearLine",
    "line",
    {
      labels: yearLabels,
      datasets: [
        {
          label: "Accidents",
          data: yearCounts,
          borderWidth: 2,
          borderColor: "#2563EB",
          backgroundColor: "rgba(37, 99, 235, 0.3)",
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "yearLine"
  );

  // 2. Column chart – accidents by Month (vertical)
  const monthly = groupCount(filteredData, "Month");
  const monthLabels = monthly.map((d) => d.name);
  const monthCounts = monthly.map((d) => d.count);

  ensureChart(
    "chartMonthColumn",
    "bar",
    {
      labels: monthLabels,
      datasets: [
        {
          label: "Accidents",
          data: monthCounts,
          backgroundColor: monthCounts.map(
            (_, i) => BAR_COLORS[i % BAR_COLORS.length]
          ),
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "x", // vertical (column)
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "monthColumn"
  );

  // 3. Bar chart – Road Type (horizontal)
  const roadType = groupCount(filteredData, "Road Type");
  const roadLabels = roadType.map((d) => d.name);
  const roadCounts = roadType.map((d) => d.count);

  ensureChart(
    "chartRoadTypeBar",
    "bar",
    {
      labels: roadLabels,
      datasets: [
        {
          label: "Accidents",
          data: roadCounts,
          backgroundColor: roadCounts.map(
            (_, i) => BAR_COLORS[i % BAR_COLORS.length]
          ),
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // horizontal bar
      scales: { x: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "roadTypeBar"
  );

  // 4. Bar chart – Weather Conditions
  const weather = groupCount(filteredData, "Weather Conditions");
  const weatherLabels = weather.map((d) => d.name);
  const weatherCounts = weather.map((d) => d.count);

  ensureChart(
    "chartWeatherBar",
    "bar",
    {
      labels: weatherLabels,
      datasets: [
        {
          label: "Accidents",
          data: weatherCounts,
          backgroundColor: weatherCounts.map(
            (_, i) => BAR_COLORS[i % BAR_COLORS.length]
          ),
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: { x: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "weatherBar"
  );

  // 5. Bar chart – Driver Age Group
  const ageGroup = groupCount(filteredData, "Driver Age Group");
  const ageLabels = ageGroup.map((d) => d.name);
  const ageCounts = ageGroup.map((d) => d.count);

  ensureChart(
    "chartAgeBar",
    "bar",
    {
      labels: ageLabels,
      datasets: [
        {
          label: "Accidents",
          data: ageCounts,
          backgroundColor: ageCounts.map(
            (_, i) => BAR_COLORS[i % BAR_COLORS.length]
          ),
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: { x: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "ageBar"
  );

  // 6. Pie chart – severity distribution
  const severity = groupCount(filteredData, "Accident Severity");
  const severityLabels = severity.map((d) => d.name);
  const severityCounts = severity.map((d) => d.count);

  ensureChart(
    "chartSeverityPie",
    "pie",
    {
      labels: severityLabels,
      datasets: [
        {
          data: severityCounts,
          backgroundColor: severityCounts.map(
            (_, i) => BAR_COLORS[i % BAR_COLORS.length]
          ),
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
    },
    "severityPie"
  );

  // 7. Area chart – accidents by Time of Day
  const timeOfDay = groupCount(filteredData, "Time of Day");
  const timeLabels = timeOfDay.map((d) => d.name);
  const timeCounts = timeOfDay.map((d) => d.count);

  ensureChart(
    "chartTimeArea",
    "line",
    {
      labels: timeLabels,
      datasets: [
        {
          label: "Accidents",
          data: timeCounts,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.3)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
    "timeArea"
  );

  // 8. Scatterplot – Injuries vs Fatalities
  const scatterPoints = filteredData
    .map((row) => {
      const x = Number(row["Number of Injuries"]);
      const y = Number(row["Number of Fatalities"]);
      const sev = String(row["Accident Severity"] || "");
      if (isNaN(x) || isNaN(y)) return null;
      return { x, y, severity: sev };
    })
    .filter(Boolean);

  const scatterData = scatterPoints.map((p) => ({
    x: p.x,
    y: p.y,
  }));

  ensureChart(
    "chartScatter",
    "scatter",
    {
      datasets: [
        {
          label: "Injuries vs Fatalities",
          data: scatterData,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Number of Injuries" } },
        y: { title: { display: true, text: "Number of Fatalities" } },
      },
      plugins: { legend: { display: false } },
    },
    "scatter"
  );

  // 9. Boxplot – Economic Loss by Severity (using plugin)
  const severityGroups = {};
  filteredData.forEach((row) => {
    const sev = row["Accident Severity"];
    const loss = Number(row["Economic Loss"]);
    if (!sev || isNaN(loss)) return;
    if (!severityGroups[sev]) severityGroups[sev] = [];
    severityGroups[sev].push(loss);
  });

  const boxLabels = Object.keys(severityGroups);
  const boxDataArrays = boxLabels.map((label) => severityGroups[label]);

  ensureChart(
    "chartBoxplot",
    "boxplot",
    {
      labels: boxLabels,
      datasets: [
        {
          label: "Economic Loss",
          data: boxDataArrays,
          backgroundColor: "rgba(244, 63, 94, 0.4)",
          borderColor: "#F43F5E",
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          title: { display: true, text: "Economic Loss" },
        },
      },
    },
    "boxplot"
  );

  // 10. Heatmap – Severity vs Weather (matrix)
  const severityIndex = {};
  const weatherIndex = {};
  const sevList = [];
  const weatherList = [];

  severity.forEach((d, i) => {
    severityIndex[d.name] = i;
    sevList.push(d.name);
  });
  weather.forEach((d, i) => {
    weatherIndex[d.name] = i;
    weatherList.push(d.name);
  });

  const matrixCounts = {};
  filteredData.forEach((row) => {
    const sev = row["Accident Severity"];
    const w = row["Weather Conditions"];
    if (!sev || !w) return;
    const key = `${sev}||${w}`;
    matrixCounts[key] = (matrixCounts[key] || 0) + 1;
  });

  const matrixData = Object.entries(matrixCounts).map(([key, value]) => {
    const [sev, w] = key.split("||");
    return {
      x: weatherIndex[w],
      y: severityIndex[sev],
      v: value,
    };
  });

  ensureChart(
    "chartHeatmap",
    "matrix",
    {
      datasets: [
        {
          label: "Count",
          data: matrixData,
          backgroundColor(ctx) {
            const v = ctx.raw.v;
            // simple mapping to alpha
            const alpha = Math.min(0.2 + v / 50, 1);
            return `rgba(37, 99, 235, ${alpha})`;
          },
          width: () => 20,
          height: () => 20,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          ticks: {
            callback(value) {
              return weatherList[value] || "";
            },
          },
          offset: true,
        },
        y: {
          type: "linear",
          ticks: {
            callback(value) {
              return sevList[value] || "";
            },
          },
          offset: true,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title() {
              return "";
            },
            label(ctx) {
              const raw = ctx.raw;
              const sev = sevList[raw.y];
              const w = weatherList[raw.x];
              return `${sev} × ${w}: ${raw.v}`;
            },
          },
        },
      },
    },
    "heatmap"
  );
}

// Map chart with Leaflet
function updateMap() {
  const byCountry = groupCount(filteredData, "Country");

  if (!mapInstance) {
    mapInstance = L.map("mapChart").setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 6,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance);
    mapLayerGroup = L.layerGroup().addTo(mapInstance);
  }

  mapLayerGroup.clearLayers();

  // Basic example coords – extend this mapping for your countries
  const countryCoords = {
    India: { lat: 22.9734, lng: 78.6569 },
    "United States": { lat: 39.8283, lng: -98.5795 },
    "United Kingdom": { lat: 55.3781, lng: -3.436 },
    Canada: { lat: 56.1304, lng: -106.3468 },
    Australia: { lat: -25.2744, lng: 133.7751 },
  };

  byCountry.forEach((entry) => {
    const country = entry.name;
    const count = entry.count;
    const coord = countryCoords[country];
    if (!coord) return; // skip if no coordinates defined

    const radius = 50000 + count * 500; // simple scaling

    L.circle([coord.lat, coord.lng], {
      radius,
      color: "#EF4444",
      fillColor: "#F97316",
      fillOpacity: 0.4,
    })
      .bindPopup(`${country}<br>Accidents: ${count}`)
      .addTo(mapLayerGroup);
  });
}

// Load CSV using PapaParse
function loadData() {
  Papa.parse("road_accident_dataset.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      accidentData = results.data || [];
      populateFilters(accidentData);

      document.getElementById("yearFilter").value = "All";
      document.getElementById("regionFilter").value = "All";
      document.getElementById("severityFilter").value = "All";

      applyFilters();
    },
    error: function (err) {
      console.error("Error parsing CSV:", err);
      alert("Failed to load CSV. Check console for details.");
    },
  });
}

// Attach filter listeners
function attachFilterListeners() {
  document
    .getElementById("yearFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("regionFilter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("severityFilter")
    .addEventListener("change", applyFilters);
}

// Init
document.addEventListener("DOMContentLoaded", function () {
  attachFilterListeners();
  loadData();
});
