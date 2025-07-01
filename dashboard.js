const products = [
  { model: "120", group: "GCI" }
];

const sbuMapping = {
  AP: "East", CG: "East", TS: "East",
  DL: "North", MP: "North",
  KA: "South", KL: "South", TN: "South",
  GA: "West", GJ: "West", MH: "West"
};

let modelData = {};

document.addEventListener("DOMContentLoaded", () => {
  const { month, year } = getDefaultMonthYear();
  document.getElementById("month-select").value = month;
  document.getElementById("year-select").value = year;
  document.getElementById("group-select").value = "";

  formatBillingPeriod();
  applyFilters();
  setInterval(applyFilters, 10000);

  ["month-select", "year-select", "group-select"].forEach(id => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
});

function getDefaultMonthYear() {
  const today = new Date();
  let month = today.getMonth();
  let year = today.getFullYear();
  if (today.getDate() === 1) {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
  }
  return {
    month: String(month + 1).padStart(2, '0'),
    year: String(year)
  };
}

function formatBillingPeriod() {
  const today = new Date();
  const billingMonth = today.toLocaleString("default", { month: "long" });
  const billingYear = today.getFullYear();
  document.getElementById("billing-period").textContent = `Live Billing Period: ${billingMonth} ${billingYear}`;
}

function extractISTDateParts(isoDate) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = dtf.formatToParts(new Date(isoDate));
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return { month, year };
}

function applyFilters() {
  const month = document.getElementById("month-select").value;
  const year = document.getElementById("year-select").value;
  const group = document.getElementById("group-select").value;

  let url = "https://uat.gmmco.in/gmmco-api/get-asset-report";

  const params = new URLSearchParams();
  if (month) params.append("month", month);
  if (year) params.append("year", year);
  if (group) params.append("group", group);
  if (params.toString()) url += `?${params.toString()}`;

  console.log("📤 Fetching API:", url);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("📥 Raw data received:", data.length);
      processAndRenderData(data);
    })
    .catch(err => {
      console.error("❌ Error fetching filtered data:", err);
      document.getElementById("sales-body").innerHTML = `<tr><td colspan='7' style='color:red;'>❌ Failed to load filtered data</td></tr>`;
    });
}

function processAndRenderData(data) {
  modelData = {};
  const month = document.getElementById("month-select").value;
  const year = document.getElementById("year-select").value;

  console.log("📆 Filtering for:", { month, year });

  const filteredData = data.filter(item => {
    const purchasedStr = item["Date Purchased"];
    if (!purchasedStr) return false;
    const { month: purchasedMonth, year: purchasedYear } = extractISTDateParts(purchasedStr);
    return purchasedMonth === month && purchasedYear === year;
  });

  console.log("🔍 IST Date Filtered:", filteredData.length);

  const allowedDivisions = ["02", "03", "04", "07"];
  const divisionFilteredData = filteredData.filter(item => {
    const division = item["Division code"]?.toString().trim();
    return allowedDivisions.includes(division);
  });

  console.log("🏢 Division Filtered:", divisionFilteredData.length);

  divisionFilteredData.forEach(item => {
    const name = item.Name?.trim() || "";
    const productNumber = item["Product Number"]?.trim() || "";
    const description = item["Product Description"]?.trim() || "";
    const lowerCombined = `${name} ${productNumber} ${description}`.toLowerCase();

    const isMatch = lowerCombined.includes("120ng") || productNumber.includes("120") || name.includes("120");
    if (!isMatch) return;

    const modelNumber = "120NG";
    const group = "GCI";
    const imageKey = modelNumber;

    let sbu = item.SBU?.trim();
    if (!sbu) {
      const prefix = item.Plant_Code?.substring(0, 2).toUpperCase();
      sbu = sbuMapping[prefix] || "Unknown";
    }

    if (!modelData[modelNumber]) {
      modelData[modelNumber] = {
        modelNumber,
        fullModel: name,
        group,
        imageKey,
        North: 0, South: 0, West: 0, East: 0,
        records: []
      };
    }

    modelData[modelNumber][sbu] = (modelData[modelNumber][sbu] || 0) + 1;
    modelData[modelNumber].records.push({ ...item, sbu });

    console.log("✅ 120NG Matched:", {
      name, productNumber, description, sbu,
      "Date Purchased": item["Date Purchased"],
      "Plant Code": item["Plant_Code"]
    });
  });

  console.log("📊 Final modelData:", modelData);
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
    const imgSrc = `images/${(data.imageKey || data.modelNumber).toLowerCase().replace(/\s+/g, "")}.png`;

    const row = `
      <tr>
        <td>${data.group}</td>
        <td>
          <img src="${imgSrc}" alt="${data.fullModel}" onerror="this.src='images/placeholder.png'" style="width:40px; vertical-align:middle; margin-right:10px;" />
          <strong>${data.modelNumber}</strong> - ${data.fullModel}
        </td>
        ${["North", "South", "West", "East"].map(region => {
          const count = data[region];
          return `<td>${count}${count > 0 ? ` <button class='expand-btn' onclick="toggleDetails('${rowId}', '${region}')">+</button>` : ""}</td>`;
        }).join("")}
        <td>${total}</td>
      </tr>
      <tr id="details-${rowId}-${data.fullModel}" class="details-row" style="display:none;">
        <td colspan="7" id="details-content-${rowId}-${data.fullModel}"></td>
      </tr>`;

    tbody.insertAdjacentHTML("beforeend", row);
  });

  document.getElementById("total-north").textContent = totalNorth;
  document.getElementById("total-south").textContent = totalSouth;
  document.getElementById("total-west").textContent = totalWest;
  document.getElementById("total-east").textContent = totalEast;
  document.getElementById("grand-total").textContent = totalNorth + totalSouth + totalWest + totalEast;

  console.log("📊 Region Totals:", {
    North: totalNorth, South: totalSouth, West: totalWest, East: totalEast
  });
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

  const entries = modelEntry.records.filter(r => r.sbu === region);
  container.innerHTML = entries.length === 0
    ? "<em>No data found.</em>"
    : entries.map(entry => {
        const cleanSerial = (entry["Serial Number"] || "").replace("_ERROR", "");
        return `🔸 ${entry["Organisation Name"]} | Serial: ${cleanSerial} | Plant: ${entry["Plant_Code"]}`;
      }).join("<br>");

  row.style.display = "table-row";
}
