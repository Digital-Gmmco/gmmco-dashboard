require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { StorageSharedKeyCredential, DataLakeServiceClient } = require('@azure/storage-file-datalake');

const app = express();
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'dashboard-frontend')));

const PORT = process.env.PORT || 3000;

// Azure Storage credentials from .env
const accountName = process.env.AZURE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_ACCOUNT_KEY;
const fileSystemName = process.env.AZURE_FILE_SYSTEM;
const filePath = process.env.AZURE_FILE_PATH;

if (!accountName || !accountKey || !fileSystemName || !filePath) {
  console.error('Missing Azure Storage configuration in .env');
  process.exit(1);
}

// Setup Azure Data Lake client
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const serviceClient = new DataLakeServiceClient(
  `https://${accountName}.dfs.core.windows.net`,
  sharedKeyCredential
);

// API route for sales data
app.get('/api/sales-data', async (req, res) => {
  try {
    const fileSystemClient = serviceClient.getFileSystemClient(fileSystemName);
    const fileClient = fileSystemClient.getFileClient(filePath);

    const downloadResponse = await fileClient.read();
    const readable = downloadResponse.readableStreamBody;

    let rawData = '';

    readable.on('data', chunk => {
      rawData += chunk.toString();
    });

    readable.on('end', () => {
      try {
        const lines = rawData.trim().split('\n');
        const jsonArray = lines.map(line => JSON.parse(line));
        res.json(jsonArray);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        res.status(500).json({ error: 'Failed to parse JSON lines' });
      }
    });

    readable.on('error', err => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'Failed to read file stream' });
    });

  } catch (err) {
    console.error('Error fetching file from ADLS:', err);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-frontend', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
