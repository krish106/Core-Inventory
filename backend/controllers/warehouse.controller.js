const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// CREATE WAREHOUSE
exports.createWarehouse = async (req, res) => {
  try {
    const { name, short_code, address } = req.body;
    if (!name || !short_code) return res.status(400).json({ error: 'Name and short code required' });
    const id = uuidv4();
    pool.query('INSERT INTO warehouses (id, name, short_code, address) VALUES (?, ?, ?, ?)',
      [id, name, short_code, address || null]);
    // Create default locations
    const defaults = [
      { name: 'Input Zone', code: 'INPUT', type: 'input' },
      { name: 'Output Zone', code: 'OUTPUT', type: 'output' },
      { name: 'Main Storage', code: 'MAIN', type: 'internal' }
    ];
    for (const loc of defaults) {
      pool.query('INSERT INTO locations (id, name, short_code, warehouse_id, type) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), loc.name, loc.code, id, loc.type]);
    }
    const result = pool.query('SELECT * FROM warehouses WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create warehouse error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET WAREHOUSES
exports.getWarehouses = async (req, res) => {
  try {
    const result = pool.query(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM locations WHERE warehouse_id = w.id) as location_count,
        (SELECT COUNT(DISTINCT s.product_id) FROM stock s JOIN locations l ON l.id = s.location_id WHERE l.warehouse_id = w.id AND s.quantity > 0) as product_count,
        (SELECT COALESCE(SUM(s.quantity), 0) FROM stock s JOIN locations l ON l.id = s.location_id WHERE l.warehouse_id = w.id) as total_stock
      FROM warehouses w WHERE w.is_active = 1 ORDER BY w.name`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET WAREHOUSE BY ID
exports.getWarehouseById = async (req, res) => {
  try {
    const wh = pool.query('SELECT * FROM warehouses WHERE id = ?', [req.params.id]);
    if (wh.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
    const locs = pool.query(
      `SELECT l.*, COALESCE(SUM(s.quantity), 0) as total_stock
       FROM locations l LEFT JOIN stock s ON s.location_id = l.id
       WHERE l.warehouse_id = ? GROUP BY l.id ORDER BY l.name`, [req.params.id]);
    res.json({ ...wh.rows[0], locations: locs.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE WAREHOUSE
exports.updateWarehouse = async (req, res) => {
  try {
    const { name, short_code, address } = req.body;
    pool.query('UPDATE warehouses SET name=?, short_code=?, address=? WHERE id=?',
      [name, short_code, address, req.params.id]);
    const result = pool.query('SELECT * FROM warehouses WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE WAREHOUSE (soft)
exports.deleteWarehouse = async (req, res) => {
  try {
    pool.query('UPDATE warehouses SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Warehouse deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
