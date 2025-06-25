require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ✅ Allow frontend origins (adjust if needed)
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

// ✅ Azure Auth Config (if needed)
app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});

// ✅ Azure Blob URL for JSONL data
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-05-17T13:48:14Z&se=2025-07-11T21:48:14Z&spr=https&sv=2024-11-04&sr=b&sig=aOXpZeNPt7zjjcM%2FJjMegssfgI%2Bm7CeJrlVfPx4IQ5s%3D";

// ✅ Health check
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// ✅ Main data route
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

    // Get filters from query string
    const { month, year } = req.query;

    // ✅ Final filter: exclude anything with "engine" in any model string
   const filtered = allData.filter(item => {
  const installed = item["Date Installed"];
  if (!installed || !installed.includes("-")) return false;

  const [yyyy, mm] = installed.split("-");

  // 🔐 Combine all potential fields into a single searchable string
  const combinedText = `
    ${item.Name || ""}
    ${item.Model || ""}
    ${item.Description || ""}
    ${item["Product Description"] || ""}
    ${item["Serial Number"] || ""}
  `.toLowerCase();

  // ❌ Reject anything with the word "engine" anywhere in any of those fields
  if (combinedText.includes("engine")) return false;

  // ✅ Filter by year/month if present
  if (year && yyyy !== year) return false;
  if (month && mm !== month) return false;

  return true;
});

    res.status(200).json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch asset report.", details: error.message });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
