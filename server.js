require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Allow frontend origins
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Azure Auth Config endpoint (if needed)
app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});

// Azure Blob Storage JSONL URL
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-06-24T06:50:38Z&se=2026-12-31T14:50:38Z&spr=https&sv=2024-11-04&sr=b&sig=09ht14N%2B3BrWxoi1ZUUGq6RlARrIfTyhMDsivyrbLaA%3D";

// Health check
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// Filtered asset report endpoint
app.get('/get-asset-report', async (req, res) => {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) throw new Error("Blob fetch failed");

    const rawText = await response.text();
    console.log("📥 Raw blob fetched, length:", rawText.length);

    const allData = rawText
      .split("\n")
      .filter(line => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn(`⚠️ JSON parse failed at line ${index}:`, e.message);
          return null;
        }
      })
      .filter(item => item !== null);

    const { month, year } = req.query;
    console.log("🧪 Incoming Filters:", { month, year });

    const allowedDivisions = ["02", "03", "04", "07"];

    const filtered = allData.filter(item => {
      const purchased = item["Date Purchased"];
      if (!purchased) {
        console.log("⛔️ Skipping - missing 'Date Purchased':", item["Asset ID"]);
        return false;
      }

      if (!allowedDivisions.includes(item["Division code"])) {
        console.log("❌ Skipping - Division not allowed:", item["Division code"]);
        return false;
      }

      const [yyyy, mm] = purchased.split("T")[0].split("-");
      const purchasedMonth = mm;
      const purchasedYear = yyyy;

      const combinedText = `
        ${item.Name || ""}
        ${item.Model || ""}
        ${item.Description || ""}
        ${item["Product Description"] || ""}
        ${item["Serial Number"] || ""}
      `.toLowerCase();

      if (combinedText.includes("engine")) {
        console.log("🔧 Skipping - Contains 'engine':", item["Asset ID"]);
        return false;
      }

      const match = (!year || purchasedYear === year) && (!month || purchasedMonth === month);
      if (!match) {
        console.log(`📆 Not a match (Wanted ${month}-${year}, Got ${purchasedMonth}-${purchasedYear}):`, item["Asset ID"]);
      }

      return match;
    });

    console.log("📦 Total records:", allData.length);
    console.log("✅ Records after filtering:", filtered.length);

    res.status(200).json(filtered);
  } catch (error) {
    console.error("🔥 API Error:", error.message);
    res.status(500).json({ error: "Failed to fetch asset report.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
