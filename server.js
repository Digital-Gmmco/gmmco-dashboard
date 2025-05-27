require('dotenv').config(); 
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;
app.use(cors({
  origin: ['http://localhost:8081', 'http://127.0.0.1:8081','http://127.0.0.1:5500','http://localhost:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-05-17T13:48:14Z&se=2025-07-11T21:48:14Z&spr=https&sv=2024-11-04&sr=b&sig=aOXpZeNPt7zjjcM%2FJjMegssfgI%2Bm7CeJrlVfPx4IQ5s%3D";
app.get('/', (req, res) => {
  res.send("✅ API Server is Running");
});
// ✅ API route to serve asset report data
app.get('/get-asset-report', async (req, res) => {
  try {
    console.log("✅ Fetching data from Blob URL...");
    const response = await fetch(blobUrl);
    console.log("✅ Fetch response status:", response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`❌ Blob fetch failed: ${response.status} ${response.statusText}`);
    }
    const rawText = await response.text();
    console.log("✅ Raw Content Loaded.");
    // ✅ Parse JSONL data
    const data = rawText
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.error("❌ Error parsing line:", err.message);
          return null;
        }
      })
      .filter(item => item !== null);
    console.log(`✅ Data parsed: ${data.length} records`);
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to fetch asset report.", details: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
