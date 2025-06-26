require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Allow frontend origins
app.use(cors({
/*  origin: [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],*/
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
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-05-17T13:48:14Z&se=2025-07-11T21:48:14Z&spr=https&sv=2024-11-04&sr=b&sig=aOXpZeNPt7zjjcM%2FJjMegssfgI%2Bm7CeJrlVfPx4IQ5s%3D";

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

    const allData = rawText
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

    const { month, year } = req.query;
    const allowedDivisions = ["02", "03", "04", "07"]; // ✅ ONLY these

    const filtered = allData.filter(item => {
      const purchased = item["Date Purchased"];
      if (!purchased) return false;

      // ❌ Skip if Division code is not one of the allowed
      if (!allowedDivisions.includes(item["Division code"])) return false;

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

      if (combinedText.includes("engine")) return false;
      if (year && purchasedYear !== year) return false;
      if (month && purchasedMonth !== month) return false;

      return true;
    });

    console.log("🧾 Total raw records:", allData.length);
    console.log("✅ Filtered records:", filtered.length, "| Month:", month, "| Year:", year);
    console.log("Month:", month, "Year:", year);
    console.log("Sample Purchased Date:", allData[0]?.["Date Purchased"]);

    res.status(200).json(filtered);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Failed to fetch asset report.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
