const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.listBatches = async (req, res) => {
  try {
    const { product_id, expired } = req.query;
    let query = `
      SELECT b.*, p.name as product_name, p.sku, c.name as supplier_name,
        COALESCE((SELECT SUM(bs.quantity) FROM batch_stock bs WHERE bs.batch_id = b.id), 0) as total_qty
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN contacts c ON b.supplier_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (product_id) { query += ` AND b.product_id = ?`; params.push(product_id); }
    if (expired === 'true') { query += ` AND b.expiry_date < date('now')`; }
    if (expired === 'soon') { query += ` AND b.expiry_date >= date('now') AND b.expiry_date <= date('now', '+30 days')`; }
    query += ` ORDER BY b.expiry_date ASC`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to list batches' });
  }
};

exports.getBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: bRows } = db.query(`
      SELECT b.*, p.name as product_name, p.sku, c.name as supplier_name
      FROM batches b JOIN products p ON b.product_id = p.id LEFT JOIN contacts c ON b.supplier_id = c.id WHERE b.id = ?
    `, [id]);
    if (!bRows.length) return res.status(404).json({ error: 'Batch not found' });
    const { rows: stockRows } = db.query(`
      SELECT bs.*, l.name as location_name, w.name as warehouse_name
      FROM batch_stock bs JOIN locations l ON bs.location_id = l.id JOIN warehouses w ON l.warehouse_id = w.id WHERE bs.batch_id = ?
    `, [id]);
    res.json({ ...bRows[0], stock: stockRows });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to get batch' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { batch_number, product_id, manufacture_date, expiry_date, supplier_id, notes } = req.body;
    if (!batch_number || !product_id) return res.status(400).json({ error: 'batch_number and product_id required' });
    const id = uuidv4();
    db.query(`INSERT INTO batches (id, batch_number, product_id, manufacture_date, expiry_date, supplier_id, notes) VALUES (?,?,?,?,?,?,?)`,
      [id, batch_number, product_id, manufacture_date || null, expiry_date || null, supplier_id || null, notes || null]);
    res.status(201).json({ id, batch_number, message: 'Batch created' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to create batch' });
  }
};

exports.getExpiringBatches = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { rows } = db.query(`
      SELECT b.*, p.name as product_name, p.sku,
        COALESCE((SELECT SUM(bs.quantity) FROM batch_stock bs WHERE bs.batch_id = b.id), 0) as total_qty,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM batches b JOIN products p ON b.product_id = p.id
      WHERE b.expiry_date IS NOT NULL AND b.expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY b.expiry_date ASC
    `, [parseInt(days)]);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to get expiring batches' });
  }
};
