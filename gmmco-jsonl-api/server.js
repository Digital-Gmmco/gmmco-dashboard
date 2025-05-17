require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { StorageSharedKeyCredential, DataLakeServiceClient } = require('@azure/storage-file-datalake');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// === Serve static frontend ===
app.use(express.static(path.join(__dirname, '..', 'dashboard-frontend')));

// === Azure Data Lake: /api/sales-data ===
const accountName = process.env.AZURE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_ACCOUNT_KEY;
const fileSystemName = process.env.AZURE_FILE_SYSTEM;
const filePath = process.env.AZURE_FILE_PATH;

if (!accountName || !accountKey || !fileSystemName || !filePath) {
  console.error('Missing Azure Storage config in .env');
  process.exit(1);
}

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const serviceClient = new DataLakeServiceClient(
  `https://${accountName}.dfs.core.windows.net`,
  sharedKeyCredential
);

app.get('/api/sales-data', async (req, res) => {
  try {
    const fileSystemClient = serviceClient.getFileSystemClient(fileSystemName);
    const fileClient = fileSystemClient.getFileClient(filePath);

    const downloadResponse = await fileClient.read();
    const readable = downloadResponse.readableStreamBody;

    let rawData = '';
    readable.on('data', chunk => rawData += chunk.toString());

    readable.on('end', () => {
      try {
        const lines = rawData.trim().split('\n');
        const jsonArray = lines.map(line => JSON.parse(line));
        res.json(jsonArray);
      } catch (err) {
        console.error('JSON parse error:', err);
        res.status(500).json({ error: 'Failed to parse JSON lines' });
      }
    });

    readable.on('error', err => {
      console.error('Stream error:', err);
      res.status(500).json({ error: 'Failed to read file stream' });
    });
  } catch (err) {
    console.error('ADLS fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// === Dynamic route: /:id ===
app.get('/:id', (req, res, next) => {
  const id = req.params.id;

  // Prevent catching static files and /api routes
  if (id === 'favicon.ico' || id === 'api') return next();

  console.log(`Received request with ID: ${id}`);
  res.json({ message: `You requested ID: ${id}` });
});

// === Example sub-router for /api/:resource ===
const resourceRouter = express.Router();

resourceRouter.get('/', (req, res) => {
  const resource = req.baseUrl.split('/').pop();
  res.json({ resource, message: `Data for ${resource}` });
});

app.use('/api/:resource', (req, res, next) => {
  const reserved = ['sales-data']; // prevent conflict
  if (reserved.includes(req.params.resource)) return next();
  return resourceRouter(req, res, next);
});

// === Serve index.html for everything else (SPA mode) ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard-frontend', 'index.html'));
});

// === Start the server ===
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
