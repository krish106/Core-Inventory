const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// CREATE LOCATION
exports.createLocation = async (req, res) => {
  try {
    const { name, short_code, warehouse_id, type } = req.body;
    if (!name || !short_code || !warehouse_id) {
      return res.status(400).json({ error: 'Name, short code, and warehouse are required' });
    }
    const id = uuidv4();
    pool.query(
      'INSERT INTO locations (id, name, short_code, warehouse_id, type) VALUES (?, ?, ?, ?, ?)',
      [id, name, short_code, warehouse_id, type || 'internal']
    );
    const result = pool.query('SELECT l.*, w.name as warehouse_name FROM locations l JOIN warehouses w ON w.id = l.warehouse_id WHERE l.id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET LOCATIONS
exports.getLocations = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let query = 'SELECT l.*, w.name as warehouse_name FROM locations l JOIN warehouses w ON w.id = l.warehouse_id WHERE l.is_active = 1';
    const params = [];
    if (warehouse_id) {
      query += ' AND l.warehouse_id = ?';
      params.push(warehouse_id);
    }
    query += ' ORDER BY w.name, l.name';
    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE LOCATION
exports.updateLocation = async (req, res) => {
  try {
    const { name, short_code, type } = req.body;
    pool.query('UPDATE locations SET name=?, short_code=?, type=? WHERE id=?',
      [name, short_code, type, req.params.id]);
    const result = pool.query('SELECT * FROM locations WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE LOCATION (soft)
exports.deleteLocation = async (req, res) => {
  try {
    pool.query('UPDATE locations SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Location deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
