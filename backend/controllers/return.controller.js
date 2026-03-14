const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function generateRef(type) {
  const prefix = type === 'customer_return' ? 'RET-C' : 'RET-S';
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const { rows } = db.query(`SELECT COUNT(*) as c FROM returns WHERE date(created_at) = date('now')`);
  const seq = String((rows[0]?.c || 0) + 1).padStart(3, '0');
  return `${prefix}-${date}-${seq}`;
}

exports.listReturns = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = `
      SELECT r.*, c.name as contact_name,
        (SELECT COUNT(*) FROM return_lines WHERE return_id = r.id) as line_count
      FROM returns r
      LEFT JOIN contacts c ON r.contact_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ` AND r.status = ?`; params.push(status); }
    if (type) { query += ` AND r.type = ?`; params.push(type); }
    query += ` ORDER BY r.created_at DESC`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to list returns' });
  }
};

exports.getReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: retRows } = db.query(`
      SELECT r.*, c.name as contact_name FROM returns r LEFT JOIN contacts c ON r.contact_id = c.id WHERE r.id = ?
    `, [id]);
    if (!retRows.length) return res.status(404).json({ error: 'Return not found' });
    const { rows: lines } = db.query(`
      SELECT rl.*, p.name as product_name, p.sku FROM return_lines rl JOIN products p ON rl.product_id = p.id WHERE rl.return_id = ?
    `, [id]);
    res.json({ ...retRows[0], lines });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to get return' });
  }
};

exports.createReturn = async (req, res) => {
  try {
    const { type, contact_id, reason, resolution, notes, lines } = req.body;
    const id = uuidv4();
    const reference = generateRef(type);
    let total_value = 0;

    db.query(`INSERT INTO returns (id, reference, type, contact_id, reason, resolution, notes, created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [id, reference, type, contact_id || null, reason || null, resolution || null, notes || null, req.user?.id || null]);

    if (lines && lines.length) {
      for (const line of lines) {
        const lineId = uuidv4();
        const { rows: pRows } = db.query(`SELECT cost_price FROM products WHERE id = ?`, [line.product_id]);
        const price = pRows[0]?.cost_price || 0;
        total_value += price * (line.quantity || 0);
        db.query(`INSERT INTO return_lines (id, return_id, product_id, quantity, reason, condition, resolution) VALUES (?,?,?,?,?,?,?)`,
          [lineId, id, line.product_id, line.quantity, line.reason || null, line.condition || 'good', line.resolution || resolution || null]);
      }
    }
    db.query(`UPDATE returns SET total_value = ? WHERE id = ?`, [total_value, id]);
    res.status(201).json({ id, reference, message: 'Return created' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to create return' });
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.query(`UPDATE returns SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);

    // If completing, handle restock for 'restock' resolutions
    if (status === 'completed') {
      const { rows: lines } = db.query(`SELECT * FROM return_lines WHERE return_id = ? AND resolution = 'restock'`, [id]);
      const { rows: retRows } = db.query(`SELECT * FROM returns WHERE id = ?`, [id]);
      // For customer returns with restock, add stock back
      if (retRows[0]?.type === 'customer_return') {
        for (const line of lines) {
          // Find a default location and add stock back
          const { rows: locRows } = db.query(`SELECT l.id FROM locations l LIMIT 1`);
          if (locRows.length) {
            const { rows: existing } = db.query(`SELECT * FROM stock WHERE product_id = ? AND location_id = ?`, [line.product_id, locRows[0].id]);
            if (existing.length) {
              db.query(`UPDATE stock SET quantity = quantity + ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?`,
                [line.quantity, line.product_id, locRows[0].id]);
            } else {
              db.query(`INSERT INTO stock (id, product_id, location_id, quantity) VALUES (?,?,?,?)`,
                [uuidv4(), line.product_id, locRows[0].id, line.quantity]);
            }
          }
        }
      }
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to update return status' });
  }
};

exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = db.query(`SELECT status FROM returns WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft returns can be deleted' });
    db.query(`DELETE FROM return_lines WHERE return_id = ?`, [id]);
    db.query(`DELETE FROM returns WHERE id = ?`, [id]);
    res.json({ message: 'Return deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to delete return' });
  }
};
