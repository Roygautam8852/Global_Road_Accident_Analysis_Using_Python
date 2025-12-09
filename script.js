let accidentData = [];
let filteredData = [];

const charts = {
  year: null,
  month: null,
  roadType: null,
  weather: null,
  severity: null,
  timeOfDay: null,
  speedLimit: null,
  ageGroup: null,
  cause: null,
};

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

// Apply filters based on dropdowns
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
}

// Update summary metrics
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

// Create or update a Chart.js chart
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

// Update all charts from filteredData
function updateCharts() {
  // 1. Yearly
  let yearly = groupCount(filteredData, "Year");
  yearly.sort((a, b) => Number(a.name) - Number(b.name));
  const yearLabels = yearly.map((d) => d.name);
  const yearCounts = yearly.map((d) => d.count);

  ensureChart(
    "chartYear",
    "line",
    {
      labels: yearLabels,
      datasets: [
        {
          label: "Accidents",
          data: yearCounts,
          tension: 0.3,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "year"
  );

  // 2. Monthly
  const monthly = groupCount(filteredData, "Month");
  const monthLabels = monthly.map((d) => d.name);
  const monthCounts = monthly.map((d) => d.count);

  ensureChart(
    "chartMonth",
    "bar",
    {
      labels: monthLabels,
      datasets: [
        {
          label: "Accidents",
          data: monthCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "month"
  );

  // 3. Road Type
  const roadType = groupCount(filteredData, "Road Type");
  const roadLabels = roadType.map((d) => d.name);
  const roadCounts = roadType.map((d) => d.count);

  ensureChart(
    "chartRoadType",
    "bar",
    {
      labels: roadLabels,
      datasets: [
        {
          label: "Accidents",
          data: roadCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "roadType"
  );

  // 4. Weather Conditions
  const weather = groupCount(filteredData, "Weather Conditions");
  const weatherLabels = weather.map((d) => d.name);
  const weatherCounts = weather.map((d) => d.count);

  ensureChart(
    "chartWeather",
    "bar",
    {
      labels: weatherLabels,
      datasets: [
        {
          label: "Accidents",
          data: weatherCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "weather"
  );

  // 5. Severity (Pie)
  const severity = groupCount(filteredData, "Accident Severity");
  const severityLabels = severity.map((d) => d.name);
  const severityCounts = severity.map((d) => d.count);

  ensureChart(
    "chartSeverity",
    "pie",
    {
      labels: severityLabels,
      datasets: [
        {
          data: severityCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
    },
    "severity"
  );

  // 6. Time of Day
  const timeOfDay = groupCount(filteredData, "Time of Day");
  const timeLabels = timeOfDay.map((d) => d.name);
  const timeCounts = timeOfDay.map((d) => d.count);

  ensureChart(
    "chartTimeOfDay",
    "bar",
    {
      labels: timeLabels,
      datasets: [
        {
          label: "Accidents",
          data: timeCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "timeOfDay"
  );

  // 7. Speed Limit
  const speedLimit = groupCount(filteredData, "Speed Limit");
  speedLimit.sort((a, b) => Number(a.name) - Number(b.name));
  const speedLabels = speedLimit.map((d) => d.name);
  const speedCounts = speedLimit.map((d) => d.count);

  ensureChart(
    "chartSpeedLimit",
    "bar",
    {
      labels: speedLabels,
      datasets: [
        {
          label: "Accidents",
          data: speedCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "speedLimit"
  );

  // 8. Driver Age Group
  const ageGroup = groupCount(filteredData, "Driver Age Group");
  const ageLabels = ageGroup.map((d) => d.name);
  const ageCounts = ageGroup.map((d) => d.count);

  ensureChart(
    "chartAgeGroup",
    "bar",
    {
      labels: ageLabels,
      datasets: [
        {
          label: "Accidents",
          data: ageCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
    "ageGroup"
  );

  // 9. Top 10 Accident Causes
  let cause = groupCount(filteredData, "Accident Cause");
  cause.sort((a, b) => b.count - a.count);
  const top10 = cause.slice(0, 10);
  const causeLabels = top10.map((d) => d.name);
  const causeCounts = top10.map((d) => d.count);

  ensureChart(
    "chartCause",
    "bar",
    {
      labels: causeLabels,
      datasets: [
        {
          label: "Accidents",
          data: causeCounts,
        },
      ],
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30,
          },
        },
        y: { beginAtZero: true },
      },
    },
    "cause"
  );
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

      // Default: no filters (All)
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

// Add event listeners for filters
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
