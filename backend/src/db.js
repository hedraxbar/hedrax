// backend/src/db.js — Mongo singleton + indexes
require('dotenv').config();
const { MongoClient } = require('mongodb');

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

let client, db;

async function connectMongo() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10_000
  });
  await client.connect();
  db = client.db(); // default DB from URI path

  // indexes
  const col = db.collection('collections');
  await col.createIndex({ address: 1 }, { unique: true });
  await col.createIndex({ createdAt: -1 });

  const users = db.collection('users');
  await users.createIndex({ address: 1 }, { unique: true });

  return db;
}

function getDb() {
  if (!db) throw new Error('Mongo not initialized. Call connectMongo() first.');
  return db;
}

module.exports = { connectMongo, getDb };
