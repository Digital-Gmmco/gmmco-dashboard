const products = [
  { model: "424-Backhoe Loader", group: "BCP", imgSrc: "images/424.png" },
  { model: "320D3GC", group: "GCI", imgSrc: "images/320.png" },
  { model: "323D3- Medium Excavator", group: "GCI", imgSrc: "images/323.png" },
  { model: "2021F-Small Wheel Loader", group: "BCP", imgSrc: "images/2021.png" },
  { model: "CAT D6R2XL Dozer", group: "GCI", imgSrc: "images/d6.png" },
  { model: "120NG MOTOR GRADER", group: "GCI", imgSrc: "images/120.png" },
  { model: "320D3- MEDIUM EXCAVATOR", group: "GCI", imgSrc: "images/320.png" },
  { model: "424-Backhoe Loader (BL)", group: "BCP", imgSrc: "images/424.png" },
  { model: "320-Medium Excavator (HEXMD)", group: "GCI", imgSrc: "images/320.png" },
  { model: "323-Medium Excavator (HEXMD)", group: "GCI", imgSrc: "images/323.png" },
  { model: "656-Medium Wheel Loader (MWL)", group: "SEM", imgSrc: "images/656.png" },
  { model: "2021-Small Wheel Loader (SWL)", group: "BCP", imgSrc: "images/2021.png" },
  { model: "313-Small Excavator (HEXSM)", group: "GCI", imgSrc: "images/313.png" },
  { model: "316-Small Excavator (HEXSM)", group: "GCI", imgSrc: "images/316.png" },
  { model: "120-Motor Grader (MG)", group: "GCI", imgSrc: "images/120.png" },
  { model: "140-Motor Grader (MG)", group: "GCI", imgSrc: "images/140.png" },
  { model: "216-Skid-Steer Loader (SSL)", group: "BCP", imgSrc: "images/216.png" },
  { model: "330-Medium Excavator (HEXMD)", group: "GCI", imgSrc: "images/330.png" },
  { model: "335-Medium Excavator (HEXMD)", group: "GCI", imgSrc: "images/335.png" },
  { model: "636-Small Wheel Loader (SWL)", group: "SEM", imgSrc: "images/636.png" },
  { model: "816-Medium Track Type Tractor (TTTMD)", group: "SEM", imgSrc: "images/816.png" },
  { model: "822-Medium Track Type Tractor (TTTMD)", group: "SEM", imgSrc: "images/822.png" },
  { model: "950-Medium Wheel Loader (MWL)", group: "GCI", imgSrc: "images/950.png" },
  { model: "345-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/345.png" },
  { model: "349-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/349.png" },
  { model: "336-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/336.png" },
  { model: "D8-Medium Track Type Tractor (TTTMD)", group: "GCI", imgSrc: "images/D8.png" },
  { model: "D5-Medium Track Type Tractor (TTTMD)", group: "GCI", imgSrc: "images/D5.png" },
  { model: "988-Large Wheel Loader (LWL)", group: "GCI", imgSrc: "images/988.png" },
  { model: "919-Motor Grader (MG)", group: "SEM", imgSrc: "images/919.png" },
  { model: "915-Motor Grader (MG)", group: "SEM", imgSrc: "images/915.png" },
  { model: "953-Medium Track Type Tractor (TTTMD)", group: "GCI", imgSrc: "images/953.png" },
  { model: "777-Quarry & Construction Trucks (QCT)", group: "GCI", imgSrc: "images/777.png" },
  { model: "770-Quarry & Construction Trucks (QCT)", group: "GCI", imgSrc: "images/770.png" },
  { model: "772-Quarry & Construction Trucks (QCT)", group: "GCI", imgSrc: "images/772.png" },
  { model: "773-Quarry & Construction Trucks (QCT)", group: "GCI", imgSrc: "images/773.png" },
  { model: "374-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/374.png" },
  { model: "966-Large Wheel Loader (LWL)", group: "GCI", imgSrc: "images/966.png" },
  { model: "980-Large Wheel Loader (LWL)", group: "GCI", imgSrc: "images/980.png" },
  { model: "395-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/395.png" },
  { model: "350-Large Excavator (HEXLG)", group: "GCI", imgSrc: "images/350.png" },
  { model: "972-Large Wheel Loader (LWL)", group: "GCI", imgSrc: "images/972.png" },
  { model: "986-Large Wheel Loader (LWL)", group: "GCI", imgSrc: "images/986.png" },
  { model: "818-Medium Track Type Tractor (TTTMD)", group: "SEM", imgSrc: "images/818.png" },
  { model: "303-Mini Excavator (HEXMI)", group: "BCP", imgSrc: "images/303.png" },
  { model: "D9-Large Track Type Tractor (TTTLG)", group: "Mining", imgSrc: "images/D9.png" },
  { model: "D11-Large Track Type Tractor (TTTLG)", group: "Mining", imgSrc: "images/D11.png" },
  { model: "320D3- Medium Excavator", group: "GCI", imgSrc: "images/320_medium.png" },
];

function formatBillingPeriod() {
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  return `Sales Data for ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function aggregateSales(dataArray) {
  const result = {};
  dataArray.forEach(item => {
    const model = item.Name?.trim();
    const sbu = item.SBU?.trim();
    if (!model || !sbu) return;

    if (!result[model]) {
      result[model] = { North: 0, South: 0, East: 0, West: 0 };
    }

    if (result[model][sbu] !== undefined) {
      result[model][sbu]++;
    }
  });
  return result;
}

function renderTable(modelData) {
  const tbody = document.getElementById("sales-body");
  const tfoot = document.getElementById("sales-footer");
  tbody.innerHTML = "";
  tfoot.innerHTML = "";

  let totalNorth = 0, totalSouth = 0, totalEast = 0, totalWest = 0;

  Object.entries(modelData).forEach(([model, sbuCounts]) => {
    const product = products.find(p => p.model === model);
    const group = product?.group || "--";
    const imgSrc = product?.imgSrc || "images/placeholder.png";

    const n = sbuCounts.North || 0;
    const s = sbuCounts.South || 0;
    const e = sbuCounts.East || 0;
    const w = sbuCounts.West || 0;
    const total = n + s + e + w;

    totalNorth += n;
    totalSouth += s;
    totalEast += e;
    totalWest += w;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${group}</td>
      <td>
        <div class="group-with-image">
          <img src="${imgSrc}" alt="${model}" class="product-img" onerror="this.src='images/placeholder.png';" />
          ${model}
        </div>
      </td>
      <td>${n}</td>
      <td>${s}</td>
      <td>${w}</td>
      <td>${e}</td>
      <td>${total}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totals row
  const totalRow = document.createElement("tr");
  totalRow.className = "total-row";
  totalRow.innerHTML = `
    <td colspan="2">Total</td>
    <td>${totalNorth}</td>
    <td>${totalSouth}</td>
    <td>${totalWest}</td>
    <td>${totalEast}</td>
    <td>${totalNorth + totalSouth + totalEast + totalWest}</td>
  `;
  tfoot.appendChild(totalRow);

  // Update summary counts
  document.getElementById("north-count").textContent = totalNorth;
  document.getElementById("south-count").textContent = totalSouth;
  document.getElementById("east-count").textContent = totalEast;
  document.getElementById("west-count").textContent = totalWest;
}

async function fetchAndRenderSalesData() {
  try {
    const response = await fetch("http://localhost:3000/api/sales-data"); // Replace with production URL
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    const aggregated = aggregateSales(data);
    renderTable(aggregated);
  } catch (err) {
    console.error("Failed to fetch or render sales data:", err);
    const tbody = document.getElementById("sales-body");
    tbody.innerHTML = `<tr><td colspan="7">Failed to load sales data.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("billing-period").textContent = formatBillingPeriod();
  fetchAndRenderSalesData();
  setInterval(fetchAndRenderSalesData, 60000); // Refresh every 60 seconds
});
