import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = process.env.DB_FILE || './data.db';
const dbPath = path.isAbsolute(dbFile) ? dbFile : path.join(__dirname, '..', dbFile);

const db = new Database(dbPath);

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Pragmas for reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
