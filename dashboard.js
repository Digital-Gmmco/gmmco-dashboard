document.addEventListener("DOMContentLoaded", () => {
  formatBillingPeriod();
  loadDashboard();
  setInterval(loadDashboard, 10000);
});

const products = [
  { model: "424", group: "BCP" }, { model: "320", group: "GCI" },
  { model: "323", group: "GCI" }, { model: "656", group: "SEM" },
  { model: "2021", group: "BCP" }, { model: "313", group: "GCI" },
  { model: "316", group: "GCI" }, { model: "120", group: "GCI" },
  { model: "140", group: "GCI" }, { model: "216", group: "BCP" },
  { model: "330", group: "GCI" }, { model: "335", group: "GCI" },
  { model: "636", group: "SEM" }, { model: "816", group: "SEM" },
  { model: "822", group: "SEM" }, { model: "950", group: "GCI" },
  { model: "345", group: "GCI" }, { model: "349", group: "GCI" },
  { model: "336", group: "GCI" }, { model: "D8", group: "GCI" },
  { model: "D5", group: "GCI" }, { model: "988", group: "GCI" },
  { model: "919", group: "SEM" }, { model: "915", group: "SEM" },
  { model: "953", group: "GCI" }, { model: "6", group: "GCI" },
  { model: "350", group: "GCI" }
];

const sbuMapping = {
  AP: "East", CG: "East", TS: "East",
  DL: "North", MP: "North",
  KA: "South", KL: "South", TN: "South",
  GA: "West", GJ: "West", MH: "West"
};

let modelData = {};

function formatBillingPeriod() {
  const today = new Date();
  const month = today.toLocaleString("default", { month: "long" });
  const year = today.getFullYear();
  document.getElementById("billing-period").textContent = `Billing Period: ${month} ${year}`;
}

async function loadDashboard() {
  try {
    const response = await fetch("http://localhost:3000/get-asset-report");
    if (!response.ok) throw new Error("Failed to fetch data");
    const data = await response.json();
    processAndRenderData(data);
  } catch (error) {
    console.error("❌ Error loading dashboard:", error);
    document.getElementById("sales-body").innerHTML =
      `<tr><td colspan="7" style="color:red;">❌ Failed to load data.</td></tr>`;
  }
}

// Check that Date Purchased <= Date Installed (if both exist)
// Check that Date Purchased <= Date Installed (if both exist)
function isValidDateOrder(purchased, installed) {
  if (!purchased || !installed) return true;

  const purchasedParts = purchased.split("-");
  const installedParts = installed.split("-");

  if (purchasedParts.length !== 3 || installedParts.length !== 3) return true;

  const pd = parseInt(purchasedParts[0], 10);
  const pm = parseInt(purchasedParts[1], 10) - 1;
  const py = parseInt(purchasedParts[2], 10);

  const id = parseInt(installedParts[0], 10);
  const im = parseInt(installedParts[1], 10) - 1;
  const iy = parseInt(installedParts[2], 10);

  const purchaseDate = new Date(py, pm, pd);
  const installDate = new Date(iy, im, id);

  if (isNaN(purchaseDate.getTime()) || isNaN(installDate.getTime())) return true;

  if (iy < py) return false;
  if (iy === py && installDate < purchaseDate) return false;

  return true;
}

// New: Exclude if Date Installed is in 2023 or 2024 or is exactly 09-03-2024
function isInstalledYearValid(installed) {
  if (!installed) return true;

  // Remove if date is exactly 09-03-2024
  if (installed.trim() === "09-03-2024") {
    console.log("Excluded due to exact match Date Installed = 09-03-2024");
    return false;
  }

  const parts = installed.split("-");
  if (parts.length !== 3) return true;

  const year = parseInt(parts[2], 10);
  return year !== 2023 && year !== 2024;
}

function processAndRenderData(data) {
  modelData = {};
  data.forEach(item => {
    const hasError = Object.values(item).some(val =>
      typeof val === 'string' && val.includes('_ERROR')
    );
    if (hasError) return;

    if (
      !isValidDateOrder(item["Date Purchased"]?.trim(), item["Date Installed"]?.trim()) ||
      !isInstalledYearValid(item["Date Installed"]?.trim())
    ) {
      console.log("Excluded invalid or unwanted install year entry:", item["Organisation Name"], item["Date Purchased"], item["Date Installed"]);
      return;
    }
// Exclude specific unwanted record
if (item["Asset ID"]?.toString().trim() === "57318") {
  console.log("✅ Excluded Asset ID: 57318");
  return;
}
    const model = item.Name?.trim() || "";
    let sbu = item.SBU?.trim();
    if (!sbu || sbu === "") {
      const prefix = item.Plant_Code?.substring(0, 2).toUpperCase();
      sbu = sbuMapping[prefix] || "Unknown";
    }

    const modelNumber = model.match(/\d+/)?.[0] || "Unknown";
    const product = products.find(p => p.model === modelNumber);
    const group = product ? product.group : "Unknown";

    if (!modelData[modelNumber]) {
      modelData[modelNumber] = {
        modelNumber,
        fullModel: model,
        group,
        North: 0, South: 0, East: 0, West: 0,
        records: []
      };
    }

    if (sbu === "North") modelData[modelNumber].North++;
    else if (sbu === "South") modelData[modelNumber].South++;
    else if (sbu === "East") modelData[modelNumber].East++;
    else if (sbu === "West") modelData[modelNumber].West++;
    modelData[modelNumber].records.push({ ...item, sbu });
  });

  renderTable(modelData);
}

function renderTable(dataMap) {
  const tbody = document.getElementById("sales-body");
  tbody.innerHTML = "";

  let totalNorth = 0, totalSouth = 0, totalWest = 0, totalEast = 0;

  Object.values(dataMap).forEach(data => {
    const total = data.North + data.South + data.West + data.East;
    totalNorth += data.North;
    totalSouth += data.South;
    totalWest += data.West;
    totalEast += data.East;

    const rowId = data.modelNumber.replace(/\W+/g, "");
    const imgSrc = `images/${data.modelNumber}.png`;

    const row = `
      <tr>
        <td>${data.group}</td>
        <td>
          <img src="${imgSrc}" alt="${data.fullModel}" onerror="this.src='images/placeholder.png'" style="width:40px; vertical-align:middle; margin-right:10px;" />
          ${data.fullModel}
        </td>
        ${["North", "South", "West", "East"].map(region => {
          const count = data[region];
          return `<td>
            ${count}
            ${count > 0 ? `<button class="expand-btn" onclick="toggleDetails('${rowId}', '${region}')">+</button>` : ""}
          </td>`;
        }).join("")}
        <td>${total}</td>
      </tr>
      <tr id="details-${rowId}-${data.fullModel}" class="details-row" style="display:none;">
        <td colspan="7" id="details-content-${rowId}-${data.fullModel}"></td>
      </tr>
    `;

    tbody.insertAdjacentHTML("beforeend", row);
  });

  document.getElementById("total-north").textContent = totalNorth;
  document.getElementById("total-south").textContent = totalSouth;
  document.getElementById("total-west").textContent = totalWest;
  document.getElementById("total-east").textContent = totalEast;
  document.getElementById("grand-total").textContent = totalNorth + totalSouth + totalWest + totalEast;
}

function toggleDetails(modelNumber, region) {
  const modelEntry = Object.values(modelData).find(d => d.modelNumber === modelNumber);
  if (!modelEntry) return;

  const fullModel = modelEntry.fullModel;
  const rowId = `details-${modelNumber}-${fullModel}`;
  const containerId = `details-content-${modelNumber}-${fullModel}`;
  const row = document.getElementById(rowId);
  const container = document.getElementById(containerId);

  if (row.style.display === "table-row") {
    row.style.display = "none";
    container.innerHTML = "";
    return;
  }

  const entries = modelEntry.records.filter(r =>
    r.sbu === region &&
    isValidDateOrder((r["Date Purchased"] || "").trim(), (r["Date Installed"] || "").trim()) &&
    isInstalledYearValid((r["Date Installed"] || "").trim())
  );

  container.innerHTML = entries.length === 0
    ? "<em>No data found.</em>"
    : entries.map(entry => {
      const cleanSerial = (entry["Serial Number"] || "").replace("_ERROR", "");
      return `🔸 ${entry["Organisation Name"]} | Serial: ${cleanSerial} | Plant: ${entry["Plant_Code"]}`;
    }).join("<br>");

  row.style.display = "table-row";
}
