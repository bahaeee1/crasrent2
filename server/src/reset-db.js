import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = process.env.DB_FILE || './data.db';
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.join(__dirname, '..', dbFile);

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted DB file:', dbPath);
} else {
  console.log('No DB file found at', dbPath);
}

console.log('Recreating schema...');
// Re-import db which auto-runs schema
await import('./db.js');
console.log('Done.');
