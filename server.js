require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ✅ Allow frontend origins
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

// ✅ Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Optional config endpoint
app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});

// 🔗 Azure Blob Storage URL (JSON or JSONL)
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-06-24T06:50:38Z&se=2026-12-31T14:50:38Z&spr=https&sv=2024-11-04&sr=b&sig=09ht14N%2B3BrWxoi1ZUUGq6RlARrIfTyhMDsivyrbLaA%3D";

// ✅ Health check
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// 🧠 Main asset report endpoint
app.get('/get-asset-report', async (req, res) => {
  try {
    const urlWithCacheBust = `${blobUrl}&cacheBust=${Date.now()}`;
    console.log("📡 Fetching from Azure Blob:", urlWithCacheBust);

    const response = await fetch(urlWithCacheBust);
    if (!response.ok) throw new Error("❌ Failed to fetch blob");

    const rawText = await response.text();

    // ✅ NEW: Robust JSON / JSONL handling
    let allData = [];
    try {
      allData = JSON.parse(rawText); // Treat it as full JSON array
    } catch (err) {
      console.warn("⚠️ Fallback to JSONL parsing");
      allData = rawText
        .split("\n")
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(item => item !== null);
    }

    console.log("📦 Total records fetched:", allData.length);

    // ✅ Filter logic
    const { month, year } = req.query;
    const allowedDivisions = ["02", "03", "04", "07"];

    const filtered = allData.filter(item => {
      const purchased = item["Date Purchased"];
      if (!purchased) {
        console.log("⛔️ Missing Date Purchased:", item["Serial Number"] || item["Asset ID"]);
        return false;
      }

      if (!allowedDivisions.includes(item["Division code"])) return false;

      const [yyyy, mm] = purchased.split("T")[0].split("-");
      if (year && yyyy !== year) return false;
      if (month && mm !== month) return false;

      const combinedText = `
        ${item.Name || ""} ${item.Model || ""} ${item.Description || ""}
        ${item["Product Description"] || ""} ${item["Serial Number"] || ""}
      `.toLowerCase();

      if (combinedText.includes("engine")) return false;
      return true;
    });

    console.log(`✅ Filtered: ${filtered.length} entries for ${month}/${year}`);
    res.status(200).json(filtered);

  } catch (err) {
    console.error("❌ API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch asset report", details: err.message });
  }
});

// 🔥 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

