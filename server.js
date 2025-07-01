require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = 3000;

// CORS setup for local development
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

// Serve frontend statically if needed
app.use(express.static(path.join(__dirname, 'frontend')));

// Azure credentials if frontend needs them
app.get('/config', (req, res) => {
  res.json({
     clientId: "ccefd627-1db6-4e1e-b346-3854e82ea9e5",
    tenantId: "457051ff-d001-4f04-9afa-892af205a547s"
  });
});

// BLOB URL with full SAS token
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-06-27T13:05:00Z&se=2026-09-29T21:05:00Z&spr=https&sv=2024-11-04&sr=b&sig=imGKFHSGJzV%2FLLG94qpxTsIxRJFzu9M7zFeyJIM4nOA%3D";

// Health check
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// Main API route
app.get('/get-asset-report', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const urlWithCacheBust = `${blobUrl}&cacheBust=${Date.now()}`;
    console.log("📡 Streaming blob from:", urlWithCacheBust);

    const response = await fetch(urlWithCacheBust, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok || !response.body) throw new Error("❌ Failed to fetch or stream blob");

    const rl = readline.createInterface({
      input: response.body,
      crlfDelay: Infinity
    });

    const results = [];
    const { month, year } = req.query;
    const allowedDivisions = ["02", "03", "04", "07"];

    let count = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const division = item["Division code"];
        const purchased = item["Date Purchased"];
        if (!purchased || !allowedDivisions.includes(division)) continue;

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
        count++;
        if (count % 100 === 0) console.log(`📦 Processed ${count} items`);
      } catch (err) {
        console.warn("⚠️ Line skipped (parse error):", err.message);
      }
    }

    console.log("✅ Final entries returned:", results.length);
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

