import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'audits.db');

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema();
  }
  return _db;
}

function initSchema() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_tool TEXT,
      results JSON,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function createAudit(url) {
  const db = getDb();
  const id = randomUUID();
  const stmt = db.prepare(
    'INSERT INTO audits (id, url, status) VALUES (?, ?, ?)'
  );
  stmt.run(id, url, 'pending');
  return { id, url, status: 'pending', current_tool: null, results: null, error: null };
}

export function getAudit(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM audits WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    results: row.results ? JSON.parse(row.results) : null,
  };
}

export function updateAudit(id, updates) {
  const db = getDb();
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'results') {
      fields.push('results = ?');
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE audits SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function listAudits(limit = 20) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audits ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(row => ({
    ...row,
    results: row.results ? JSON.parse(row.results) : null,
  }));
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
