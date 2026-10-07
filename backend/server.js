/**
 * Main Server Entry Point (Node.js & Express)
 * -------------------------------------------
 * Ei file-ti holo amader Node.js Backend Server-er main file:
 * 1. Environment variables load kore (.env)
 * 2. MongoDB Database connect kore
 * 3. Empty database thakle automatically demo companies seed kore
 * 4. CORS & Express middlewares attach kore
 * 5. REST API routes mount kore (/api)
 * 6. Port 8000-e server start kore
 */

// 1. Load environment variables first before importing modules that need them
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const { connectDB, getDB, client } = require('./src/config/db');
const seedData = require('./src/utils/seedData');
const apiRoutes = require('./src/routes/api.routes');



const app = express();
const PORT = process.env.PORT || 8000;

// 2. CORS Middleware Configuration
const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: corsOrigins.includes('*') ? '*' : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Body Parsers (5GB limit for large payloads)
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));

// 4. Request Logging Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 5. Mount API Routes under /api prefix
app.use('/api', apiRoutes);

// 6. Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error Occurred]:', err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    detail: err.message || 'Internal Server Error'
  });
});

/**
 * Seed database with demo data if empty
 */
async function seedIfEmpty(force = false) {
  try {
    const db = getDB();
    const count = await db.collection('company_data').countDocuments();
    
    // Only seed if database is 100% empty AND force flag is true
    if (count === 0 && force) {
      const docs = seedData.buildAll();
      for (const d of docs) {
        await db.collection('company_data').replaceOne(
          { company_id: d.company_id },
          d,
          { upsert: true }
        );
      }
      console.log(`[Seed Data] Successfully seeded ${docs.length} demo companies into MongoDB.`);
    } else {
      console.log(`[Database] Total company records: ${count}. Automatic demo seeding skipped.`);
    }
  } catch (err) {
    console.error('[Seed Data Error]:', err.message);
  }
}

/**
 * Start Express Server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Verify database state (demo seeding disabled)
    await seedIfEmpty(false);

    // Start listening on configured port
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Tally Pulse Node.js Server running on port ${PORT}`);
      console.log(`📡 REST API available at: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown handling
    const shutdown = async () => {
      console.log('\n[Shutdown] Shutting down server gracefully...');
      server.close(async () => {
        await client.close();
        console.log('[Shutdown] MongoDB connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
