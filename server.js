require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = 3000;

// CORS setup
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

// Serve frontend statically
app.use(express.static(path.join(__dirname, 'frontend')));

// Azure auth config
app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});

// Azure Blob Storage URL with SAS token
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-06-27T13:05:00Z&se=2026-09-29T21:05:00Z&spr=https&sv=2024-11-04&sr=b&sig=imGKFHSGJzV%2FLLG94qpxTsIxRJFzu9M7zFeyJIM4nOA%3D";

// Health check
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// Main API route
app.get('/get-asset-report', async (req, res) => {
  try {
    const urlWithCacheBust = `${blobUrl}&cacheBust=${Date.now()}`;
    console.log("📡 Streaming from:", urlWithCacheBust);

    const response = await fetch(urlWithCacheBust);
    if (!response.ok) throw new Error("❌ Failed to fetch blob");

    const rl = readline.createInterface({
      input: response.body,
      crlfDelay: Infinity
    });

    const results = [];
    const { month, year } = req.query;
    const allowedDivisions = ["02", "03", "04", "07"];

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const item = JSON.parse(line);

        const purchased = item["Date Purchased"];
        if (!purchased || !allowedDivisions.includes(item["Division code"])) continue;

        // 🕒 Convert UTC to IST safely
        const istDate = new Date(new Date(purchased).toLocaleString("en-US", {
          timeZone: "Asia/Kolkata"
        }));
        const istMonth = String(istDate.getMonth() + 1).padStart(2, '0');
        const istYear = String(istDate.getFullYear());

        if (year && istYear !== year) continue;
        if (month && istMonth !== month) continue;

        const combinedText = `${item.Name || ""} ${item["Product Description"] || ""}`.toLowerCase();
        if (combinedText.includes("engine")) continue;

        results.push(item);
      } catch (err) {
        console.warn("⚠️ Failed to parse line:", err);
      }
    }

    console.log("✅ Streamed entries:", results.length);
    res.status(200).json(results);

  } catch (err) {
    console.error("❌ API error:", err.message);
    res.status(500).json({ error: "Failed to fetch data", details: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
