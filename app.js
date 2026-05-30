const SCENARIOS = ["ssp126", "ssp245", "ssp585"];
const PERCENTILES = ["p05", "p50", "p95"];
const DECADES = [2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];

const SCENARIO_LABELS = {
  ssp126: "SSP1-2.6",
  ssp245: "SSP2-4.5",
  ssp585: "SSP5-8.5",
};

const PERCENTILE_LABELS = {
  p05: "5th percentile (lower pathway)",
  p50: "50th percentile (median pathway)",
  p95: "95th percentile (upper pathway)",
};

const PROJECTION_M = {
  ssp126: {
    p05: [0.0, 0.03, 0.06, 0.1, 0.14, 0.18, 0.22, 0.26, 0.29],
    p50: [0.0, 0.06, 0.11, 0.17, 0.23, 0.29, 0.34, 0.4, 0.45],
    p95: [0.0, 0.1, 0.18, 0.27, 0.37, 0.47, 0.57, 0.66, 0.74],
  },
  ssp245: {
    p05: [0.0, 0.04, 0.08, 0.13, 0.19, 0.24, 0.29, 0.33, 0.37],
    p50: [0.0, 0.07, 0.13, 0.2, 0.27, 0.34, 0.42, 0.53, 0.63],
    p95: [0.0, 0.11, 0.2, 0.3, 0.41, 0.53, 0.65, 0.76, 0.87],
  },
  ssp585: {
    p05: [0.0, 0.05, 0.1, 0.16, 0.24, 0.32, 0.4, 0.47, 0.54],
    p50: [0.0, 0.08, 0.16, 0.25, 0.35, 0.47, 0.6, 0.79, 1.0],
    p95: [0.0, 0.13, 0.25, 0.39, 0.56, 0.74, 0.95, 1.17, 1.39],
  },
};

const THAMES_CENTERLINE = [
  [51.4825, -0.3012],
  [51.4808, -0.2844],
  [51.4782, -0.2567],
  [51.4778, -0.2242],
  [51.4783, -0.1966],
  [51.4828, -0.1686],
  [51.4868, -0.1367],
  [51.4888, -0.1071],
  [51.5011, -0.089],
  [51.505, -0.0745],
  [51.5077, -0.0562],
  [51.5068, -0.034],
  [51.5036, -0.0135],
  [51.5018, 0.0089],
  [51.5028, 0.0341],
  [51.5032, 0.062],
  [51.5014, 0.0842],
  [51.4972, 0.1088],
  [51.4951, 0.1273],
  [51.4948, 0.1456],
];

const scenarioSlider = document.getElementById("scenarioSlider");
const percentileSlider = document.getElementById("percentileSlider");
const scaleSlider = document.getElementById("scaleSlider");
const scenarioValue = document.getElementById("scenarioValue");
const percentileValue = document.getElementById("percentileValue");
const scaleValue = document.getElementById("scaleValue");
const parameterSummary = document.getElementById("parameterSummary");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const mapSvg = document.getElementById("mapSvg");

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 650;
const PAD = 50;

let latestRows = [];

function metersToLat(meters) {
  return meters / 111320;
}

function metersToLon(meters, latitudeDeg) {
  const cosLat = Math.cos((latitudeDeg * Math.PI) / 180);
  return meters / (111320 * Math.max(0.1, cosLat));
}

function offsetPolyline(latLngs, offsetMeters) {
  const output = [];
  for (let i = 0; i < latLngs.length; i += 1) {
    const prev = latLngs[Math.max(0, i - 1)];
    const next = latLngs[Math.min(latLngs.length - 1, i + 1)];

    const latMid = (prev[0] + next[0]) / 2;
    const dx = (next[1] - prev[1]) * 111320 * Math.cos((latMid * Math.PI) / 180);
    const dy = (next[0] - prev[0]) * 111320;
    const len = Math.hypot(dx, dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const offsetX = nx * offsetMeters;
    const offsetY = ny * offsetMeters;

    output.push([
      latLngs[i][0] + metersToLat(offsetY),
      latLngs[i][1] + metersToLon(offsetX, latLngs[i][0]),
    ]);
  }
  return output;
}

function colorByDecade(year) {
  const t = (year - 2020) / 80;
  const r = Math.round(16 + t * 180);
  const g = Math.round(85 + t * 50);
  const b = Math.round(140 - t * 70);
  return `rgb(${r},${g},${b})`;
}

function bounds(lines) {
  const pts = lines.flat();
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

function projectPoint(lat, lon, b) {
  const lonRange = b.maxLon - b.minLon || 1;
  const latRange = b.maxLat - b.minLat || 1;
  const x = PAD + ((lon - b.minLon) / lonRange) * (SVG_WIDTH - 2 * PAD);
  const y = SVG_HEIGHT - PAD - ((lat - b.minLat) / latRange) * (SVG_HEIGHT - 2 * PAD);
  return [x, y];
}

function polylineToPath(latLngs, b) {
  return latLngs
    .map(([lat, lon], i) => {
      const [x, y] = projectPoint(lat, lon, b);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function addPath(pathData, color, width, dash, title) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", String(width));
  if (dash) path.setAttribute("stroke-dasharray", dash);
  path.setAttribute("stroke-linecap", "round");
  const titleNode = document.createElementNS("http://www.w3.org/2000/svg", "title");
  titleNode.textContent = title;
  path.appendChild(titleNode);
  mapSvg.appendChild(path);
}

function updateMap() {
  const scenario = SCENARIOS[Number(scenarioSlider.value)];
  const percentile = PERCENTILES[Number(percentileSlider.value)];
  const scale = Number(scaleSlider.value);

  scenarioValue.textContent = SCENARIO_LABELS[scenario];
  percentileValue.textContent = PERCENTILE_LABELS[percentile];
  scaleValue.textContent = `${scale} m offset per 1 m sea-level rise`;

  parameterSummary.innerHTML = `
    <strong>Parameters in use</strong>: Station TOWER_PIER (PSMSL 336, 51.50N, 0.08E),
    scenarios ${Object.values(SCENARIO_LABELS).join(", ")}, decades ${DECADES.join(", ")}.
    Current view uses ${SCENARIO_LABELS[scenario]} at ${PERCENTILE_LABELS[percentile]}.
  `;

  mapSvg.replaceChildren();
  latestRows = [];

  const rises = PROJECTION_M[scenario][percentile];
  const renderedLines = [THAMES_CENTERLINE];

  const layerData = DECADES.map((year, idx) => {
    const riseM = rises[idx];
    const offsetM = riseM * scale;
    const left = offsetPolyline(THAMES_CENTERLINE, offsetM);
    const right = offsetPolyline(THAMES_CENTERLINE, -offsetM);
    renderedLines.push(left, right);
    return { year, riseM, offsetM, left, right };
  });

  const b = bounds(renderedLines);

  addPath(polylineToPath(THAMES_CENTERLINE, b), "#0077b6", 4, null, "Thames centerline");

  layerData.forEach(({ year, riseM, offsetM, left, right }) => {
    const color = colorByDecade(year);
    addPath(
      polylineToPath(left, b),
      color,
      2,
      "4 4",
      `${year}: +${riseM.toFixed(2)} m (left bank)`
    );
    addPath(
      polylineToPath(right, b),
      color,
      2,
      "4 4",
      `${year}: +${riseM.toFixed(2)} m (right bank)`
    );

    [
      { bank: "left", coords: left },
      { bank: "right", coords: right },
    ].forEach(({ bank, coords }) => {
      coords.forEach((c, pointIndex) => {
        latestRows.push({
          scenario,
          percentile,
          decade: year,
          bank,
          point_index: pointIndex,
          lat: c[0],
          lon: c[1],
          projection_m: riseM,
          line_offset_m: bank === "left" ? offsetM : -offsetM,
        });
      });
    });
  });
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const body = rows
    .map((row) =>
      headers
        .map((h) => {
          const value = row[h];
          if (typeof value === "number") return value.toFixed(8);
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  return `${headers.join(",")}\n${body}`;
}

downloadCsvBtn.addEventListener("click", () => {
  const csv = toCsv(latestRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thames_pathway_lines_${SCENARIOS[Number(scenarioSlider.value)]}_${PERCENTILES[Number(percentileSlider.value)]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

[scenarioSlider, percentileSlider, scaleSlider].forEach((el) => {
  el.addEventListener("input", updateMap);
});

updateMap();
