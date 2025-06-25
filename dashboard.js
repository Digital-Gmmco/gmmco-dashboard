const products = [
  { model: "424", group: "BCP" }, { model: "320", group: "GCI" },
  { model: "323", group: "GCI" }, { model: "656", group: "SEM" },
  { model: "2021", group: "BCP" }, { model: "313", group: "GCI" },
  { model: "316", group: "GCI" }, { model: "120", group: "GCI" },
  { model: "140", group: "GCI" }, { model: "216", group: "GCI" },
  { model: "330", group: "GCI" }, { model: "335", group: "GCI" },
  { model: "636", group: "SEM" }, { model: "816", group: "SEM" },
  { model: "822", group: "SEM" }, { model: "950", group: "GCI" },
  { model: "345", group: "GCI" }, { model: "349", group: "GCI" },
  { model: "336", group: "GCI" }, { model: "D8", group: "GCI" },
  { model: "D5", group: "GCI" }, { model: "988", group: "GCI" },
  { model: "919", group: "SEM" }, { model: "915", group: "SEM" },
  { model: "953", group: "GCI" }, { model: "D6", group: "GCI" },
  { model: "350", group: "GCI" }, { model: "818", group: "SEM" },
  { model: "395", group: "GCI" }, { model: "320D", group: "GCI" },
  { model: "772G", group: "GCI" }, { model: "950H", group: "GCI" },
  { model: "773E", group: "GCI" }, { model: "777", group: "GCI" },
  { model: "962GII", group: "GCI" }, { model: "775G", group: "GCI" },
  { model: "777G", group: "GCI" }, { model: "770", group: "GCI" },
  { model: "772", group: "GCI" }, { model: "cs533e", group: "GCI" },
  { model: "980SMA", group: "GCI" }, { model: "631k", group: "GCI" },
  { model: "374", group: "GCI" }, { model: "CT100", group: "GCI" },
  { model: "m14", group: "GCI" }, { model: "d9r", group: "GCI" },
  { model: "962", group: "GCI" }, { model: "1025", group: "GCI" },
  { model: "303", group: "GCI" }, { model: "966e", group: "GCI" },
  { model: "980l", group: "GCI" }, { model: "325", group: "GCI" },
  { model: "426F2", group: "GCI" }, { model: "12k", group: "GCI" },
  { model: "966h", group: "GCI" }, { model: "ayw00562", group: "GCI" },
  { model: "trans 966h", group: "GCI" }, { model: "PC600", group: "GCI" }
];

const sbuMapping = {
  AP: "East", CG: "East", TS: "East",
  DL: "North", MP: "North",
  KA: "South", KL: "South", TN: "South",
  GA: "West", GJ: "West", MH: "West"
};

let modelData = {};

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentYear = String(today.getFullYear());
  document.getElementById("month-select").value = currentMonth;
  document.getElementById("year-select").value = currentYear;
  document.getElementById("group-select").value = "";
  formatBillingPeriod();
  applyFilters();
  setInterval(applyFilters, 10000);
  ["month-select", "year-select", "group-select"].forEach(id => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
});

function formatBillingPeriod() {
  const today = new Date();
  const billingMonth = today.toLocaleString("default", { month: "long" });
  const billingYear = today.getFullYear();
  document.getElementById("billing-period").textContent = `Live Billing Period: ${billingMonth} ${billingYear}`;
}

function applyFilters() {
  const month = document.getElementById("month-select").value;
  const year = document.getElementById("year-select").value;
  const group = document.getElementById("group-select").value;

  let url = "http://localhost:3000/get-asset-report";
  const params = [];
  if (month) params.push(`month=${month}`);
  if (year) params.push(`year=${year}`);
  if (group) params.push(`group=${group}`);
  if (params.length > 0) url += `?${params.join("&")}`;

  fetch(url)
    .then(res => res.json())
    .then(data => processAndRenderData(data))
    .catch(err => {
      console.error("❌ Error fetching filtered data:", err);
      document.getElementById("sales-body").innerHTML = `<tr><td colspan='7' style='color:red;'>❌ Failed to load filtered data</td></tr>`;
    });
}

function processAndRenderData(data) {
  modelData = {};
  const month = document.getElementById("month-select").value;
  const year = document.getElementById("year-select").value;
  const selectedGroup = document.getElementById("group-select").value;

  const filteredData = data.filter(item => {
    const purchasedStr = item["Date Purchased"];
    if (!purchasedStr) {
      console.warn("⛔ Skipped: Missing Date Purchased", item);
      return false;
    }
    const purchasedDate = new Date(purchasedStr);
    if (isNaN(purchasedDate.getTime())) {
      console.warn("⛔ Skipped: Invalid Date", purchasedStr);
      return false;
    }
    const purchasedMonth = String(purchasedDate.getMonth() + 1).padStart(2, '0');
    const purchasedYear = String(purchasedDate.getFullYear());
    return purchasedYear === year && purchasedMonth === month;
  });

  console.log("✅ Filtered entries:", filteredData.length);

  filteredData.forEach(item => {
    const name = item.Name?.trim() || "";
    const productNumber = item["Product Number"]?.trim() || "";
    const description = item["Product Description"]?.trim() || "";
    const nameLower = name.toLowerCase();

    if (/hammer\s*kit/i.test(name)) return;

    let matchedProduct = products.find(p =>
      nameLower.includes(p.model.toLowerCase()) ||
      productNumber.toLowerCase().includes(p.model.toLowerCase()) ||
      description.toLowerCase().includes(p.model.toLowerCase())
    );

    let modelNumber = matchedProduct ? matchedProduct.model : productNumber || "Unknown";
    let group = matchedProduct ? matchedProduct.group : "Unknown";

    if (group === "Unknown") {
      console.warn("🔍 Unknown group:", name);
    }

    // Skip specific unwanted entries
    if (
      group === "Unknown" &&
      (
        nameLower.includes("eind230c9.3") ||
        nameLower.includes("c9.3b") ||
        nameLower.includes("af220") ||
        nameLower.includes("one time eq for iims") ||
        nameLower.includes("966h") ||
        nameLower.includes("ayw00562") ||
        nameLower.includes("trans 966h")
      )
    ) {
      console.warn("❌ Skipped: Unwanted entry", name);
      return;
    }

    let imageKey = matchedProduct ? matchedProduct.model : modelNumber;
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
  });

  if (selectedGroup) {
    Object.keys(modelData).forEach(key => {
      if (modelData[key].group !== selectedGroup) delete modelData[key];
    });
  }

  console.log("✅ Models rendered:", Object.keys(modelData).length);
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
    const imgSrc = data.fullModel.toLowerCase().includes("engine")
      ? 'images/engine.png'
      : `images/${(data.imageKey || data.modelNumber).toLowerCase().replace(/\s+/g, "")}.png`;

    const row = `
    <tr>
      <td>${data.group}</td>
      <td>
        <img src="${imgSrc}" alt="${data.fullModel}" onerror="this.src='images/placeholder.png'" style="width:40px; vertical-align:middle; margin-right:10px;" />
        ${data.fullModel.includes(data.modelNumber) ? data.fullModel : `<strong>${data.modelNumber}</strong> - ${data.fullModel}`}
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
