const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'coreinventory.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Helper to make it compatible with pg-style pool.query()
const pool = {
  query: (text, params = []) => {
    // Convert $1, $2 style params to ? style
    let idx = 0;
    const converted = text.replace(/\$(\d+)/g, () => '?');

    const trimmed = converted.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('EXPLAIN')) {
      const rows = db.prepare(converted).all(...params);
      return { rows };
    } else if (trimmed.includes('RETURNING')) {
      // Handle RETURNING clause - SQLite doesn't support it natively
      // Execute the statement and then fetch the result
      const returningMatch = text.match(/RETURNING\s+(.+?)$/i);
      const baseQuery = converted.replace(/\s+RETURNING\s+.+$/i, '');

      const info = db.prepare(baseQuery).run(...params);

      if (returningMatch && info.changes > 0) {
        // Get the last inserted/updated row
        const tableName = extractTableName(text);
        if (tableName) {
          const lastRow = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(info.lastInsertRowid || info.lastInsertRowid);
          return { rows: lastRow ? [lastRow] : [] };
        }
      }
      return { rows: [], rowCount: info.changes };
    } else {
      const info = db.prepare(converted).run(...params);
      return { rows: [], rowCount: info.changes };
    }
  },
  connect: () => {
    // Return a client-like object for transactions
    return Promise.resolve({
      query: (text, params = []) => pool.query(text, params),
      release: () => {},
    });
  }
};

function extractTableName(sql) {
  const match = sql.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(\w+)/i);
  return match ? match[1] : null;
}

module.exports = pool;
module.exports.db = db;
