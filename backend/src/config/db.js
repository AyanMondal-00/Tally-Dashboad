/**
 * Database Configuration (MongoDB Connection)
 * -------------------------------------------
 * Ekhane amra MongoDB database connection create korchi
 * MongoClient er maddhome connection pool establish kora hoyeche.
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'tally_pulse_db';

const client = new MongoClient(mongoUrl);
let db = null;

/**
 * Connect to MongoDB and return the database instance
 */
async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      db = client.db(dbName);
      console.log(`[Database] MongoDB connected successfully to database: ${dbName}`);
    } catch (error) {
      console.error('[Database] MongoDB connection error:', error.message);
      process.exit(1);
    }
  }
  return db;
}

/**
 * Get current database instance
 */
function getDB() {
  if (!db) {
    throw new Error('Database is not initialized. Please call connectDB() first.');
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  client
};
