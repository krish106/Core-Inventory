const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// GET ALERTS
exports.getAlerts = async (req, res) => {
  try {
    const { type, urgency, is_read, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let params = [];
    let conditions = ['a.is_resolved = 0'];

    if (type) { conditions.push(`a.type = ?`); params.push(type); }
    if (urgency) { conditions.push(`a.urgency = ?`); params.push(urgency); }
    if (is_read !== undefined) { conditions.push(`a.is_read = ?`); params.push(is_read === 'true' ? 1 : 0); }

    const where = 'WHERE ' + conditions.join(' AND ');
    params.push(parseInt(limit), parseInt(offset));

    const result = pool.query(`
      SELECT a.*, p.name as product_name, p.sku, w.name as warehouse_name
      FROM alerts a
      LEFT JOIN products p ON p.id = a.product_id
      LEFT JOIN warehouses w ON w.id = a.warehouse_id
      ${where}
      ORDER BY CASE a.urgency WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, a.created_at DESC
      LIMIT ? OFFSET ?`, params);

    const unreadResult = pool.query("SELECT COUNT(*) as count FROM alerts WHERE is_read = 0 AND is_resolved = 0");
    res.json({ alerts: result.rows, unread_count: unreadResult.rows[0].count });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// MARK AS READ
exports.markAsRead = async (req, res) => {
  try {
    pool.query('UPDATE alerts SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// MARK ALL AS READ
exports.markAllAsRead = async (req, res) => {
  try {
    pool.query('UPDATE alerts SET is_read = 1 WHERE is_read = 0');
    res.json({ message: 'All alerts marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// RESOLVE ALERT
exports.resolveAlert = async (req, res) => {
  try {
    pool.query('UPDATE alerts SET is_resolved = 1, is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
