const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function generateRef() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const { rows } = db.query(`SELECT COUNT(*) as c FROM cycle_counts WHERE date(created_at) = date('now')`);
  const seq = String((rows[0]?.c || 0) + 1).padStart(3, '0');
  return `CC-${date}-${seq}`;
}

exports.listCycleCounts = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT cc.*, w.name as warehouse_name, u.name as created_by_name,
        (SELECT COUNT(*) FROM cycle_count_lines WHERE cycle_count_id = cc.id) as line_count,
        (SELECT COUNT(*) FROM cycle_count_lines WHERE cycle_count_id = cc.id AND counted_qty IS NOT NULL) as counted_lines
      FROM cycle_counts cc
      LEFT JOIN warehouses w ON cc.warehouse_id = w.id
      LEFT JOIN users u ON cc.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ` AND cc.status = ?`; params.push(status); }
    query += ` ORDER BY cc.created_at DESC`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to list cycle counts' });
  }
};

exports.getCycleCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: ccRows } = db.query(`
      SELECT cc.*, w.name as warehouse_name FROM cycle_counts cc LEFT JOIN warehouses w ON cc.warehouse_id = w.id WHERE cc.id = ?
    `, [id]);
    if (!ccRows.length) return res.status(404).json({ error: 'Cycle count not found' });
    const { rows: lines } = db.query(`
      SELECT ccl.*, p.name as product_name, p.sku, l.name as location_name
      FROM cycle_count_lines ccl
      JOIN products p ON ccl.product_id = p.id
      JOIN locations l ON ccl.location_id = l.id
      WHERE ccl.cycle_count_id = ?
    `, [id]);
    res.json({ ...ccRows[0], lines });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to get cycle count' });
  }
};

exports.createCycleCount = async (req, res) => {
  try {
    const { warehouse_id, count_type, scheduled_date, notes } = req.body;
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' });
    const id = uuidv4();
    const reference = generateRef();

    db.query(`INSERT INTO cycle_counts (id, reference, warehouse_id, count_type, scheduled_date, notes, created_by) VALUES (?,?,?,?,?,?,?)`,
      [id, reference, warehouse_id, count_type || 'full', scheduled_date || null, notes || null, req.user?.id || null]);

    // Auto-populate lines based on current stock in this warehouse
    const { rows: stockItems } = db.query(`
      SELECT s.product_id, s.location_id, s.quantity
      FROM stock s
      JOIN locations l ON s.location_id = l.id
      WHERE l.warehouse_id = ? AND s.quantity > 0
    `, [warehouse_id]);

    for (const item of stockItems) {
      db.query(`INSERT INTO cycle_count_lines (id, cycle_count_id, product_id, location_id, system_qty) VALUES (?,?,?,?,?)`,
        [uuidv4(), id, item.product_id, item.location_id, item.quantity]);
    }

    res.status(201).json({ id, reference, message: 'Cycle count created', lines_added: stockItems.length });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to create cycle count' });
  }
};

exports.updateCycleCountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.query(`UPDATE cycle_counts SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
    if (status === 'completed') {
      db.query(`UPDATE cycle_counts SET completed_date = datetime('now') WHERE id = ?`, [id]);
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.recordCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { lines } = req.body; // [{line_id, counted_qty}]
    for (const line of lines) {
      const { rows: existing } = db.query(`SELECT system_qty FROM cycle_count_lines WHERE id = ?`, [line.line_id]);
      const variance = existing.length ? (line.counted_qty - existing[0].system_qty) : 0;
      db.query(`UPDATE cycle_count_lines SET counted_qty = ?, variance = ?, counted_at = datetime('now'), counted_by = ? WHERE id = ?`,
        [line.counted_qty, variance, req.user?.id || null, line.line_id]);
    }
    // Check if all lines are counted
    const { rows: uncounted } = db.query(`SELECT COUNT(*) as c FROM cycle_count_lines WHERE cycle_count_id = ? AND counted_qty IS NULL`, [id]);
    if (uncounted[0]?.c === 0) {
      db.query(`UPDATE cycle_counts SET status = 'completed', completed_date = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [id]);
    } else {
      db.query(`UPDATE cycle_counts SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`, [id]);
    }
    res.json({ message: 'Count recorded' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to record count' });
  }
};
