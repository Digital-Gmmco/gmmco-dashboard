require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Allow frontend origins (adjust as needed)
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

// Serve static files from 'frontend' folder
app.use(express.static(path.join(__dirname, 'frontend')));

// Azure Auth Config endpoint (if needed)
app.get('/config', (req, res) => {
  res.json({
    clientId: process.env.AZURE_CLIENT_ID,
    tenantId: process.env.AZURE_TENANT_ID
  });
});

// Azure Blob Storage URL for JSONL data (update this if it changes)
const blobUrl = "https://gmmcopbistorageaccount.blob.core.windows.net/gmmco-dwh/API/Asset_Report/Asset_Report.json?sp=r&st=2025-05-17T13:48:14Z&se=2025-07-11T21:48:14Z&spr=https&sv=2024-11-04&sr=b&sig=aOXpZeNPt7zjjcM%2FJjMegssfgI%2Bm7CeJrlVfPx4IQ5s%3D";

// Health check endpoint
app.get('/', (req, res) => {
  res.send("✅ GMMCO API Server is Running");
});

// Main endpoint to fetch and filter asset report
app.get('/get-asset-report', async (req, res) => {
  try {
    // Fetch JSONL data from blob storage
    const response = await fetch(blobUrl);
    if (!response.ok) throw new Error("Blob fetch failed");

    const rawText = await response.text();

    // Parse JSON Lines data
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

    // Extract filters from query params
    const { month, year } = req.query;

    // Filter data
    const filtered = allData.filter(item => {
      // Use "Date Installed" for filtering
const purchased = item["Date Purchased"];
if (!purchased || !purchased.includes("-")) return false;

const [yyyy, mm] = purchased.split("-");


      // Combine fields into searchable string
      const combinedText = `
        ${item.Name || ""}
        ${item.Model || ""}
        ${item.Description || ""}
        ${item["Product Description"] || ""}
        ${item["Serial Number"] || ""}
      `.toLowerCase();

      // Exclude entries containing "engine"
      if (combinedText.includes("engine")) return false;

      // Apply year/month filters if specified
      if (year && yyyy !== year) return false;
      if (month && mm !== month) return false;

      return true;
    });

    // Return filtered data as JSON
    res.status(200).json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch asset report.", details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
