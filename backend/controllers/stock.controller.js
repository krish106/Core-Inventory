const pool = require('../config/db');

// GET STOCK OVERVIEW
exports.getStockOverview = async (req, res) => {
  try {
    const { warehouse_id, search, stock_status } = req.query;
    let params = [];
    let conditions = ['p.is_active = 1'];
    let joins = 'LEFT JOIN stock s ON s.product_id = p.id';

    if (warehouse_id) {
      params.push(warehouse_id);
      joins += ' LEFT JOIN locations l ON l.id = s.location_id';
      conditions.push(`l.warehouse_id = ?`);
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      conditions.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    let having = '';
    if (stock_status === 'low_stock') having = 'HAVING COALESCE(SUM(s.quantity),0) <= MAX(p.reorder_point) AND COALESCE(SUM(s.quantity),0) > 0';
    else if (stock_status === 'out_of_stock') having = 'HAVING COALESCE(SUM(s.quantity),0) = 0';

    const query = `
      SELECT p.id as product_id, p.name, p.sku, p.cost_price, p.unit_of_measure, p.reorder_point,
             COALESCE(SUM(s.quantity), 0) as on_hand,
             COALESCE(SUM(s.reserved_qty), 0) as reserved,
             (COALESCE(SUM(s.quantity),0) - COALESCE(SUM(s.reserved_qty),0)) as free_to_ship,
             ROUND(COALESCE(SUM(s.quantity),0) * p.cost_price, 2) as stock_value,
             CASE
               WHEN COALESCE(SUM(s.quantity),0) = 0 THEN 'out_of_stock'
               WHEN COALESCE(SUM(s.quantity),0) <= p.reorder_point THEN 'low_stock'
               ELSE 'in_stock'
             END as status
      FROM products p ${joins} ${where}
      GROUP BY p.id ${having}
      ORDER BY p.name`;

    const result = pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Stock overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET STOCK LEDGER
exports.getStockLedger = async (req, res) => {
  try {
    const { product_id, location_id, warehouse_id, movement_type, start_date, end_date, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    let params = [];
    let conditions = [];

    if (product_id) { conditions.push(`sl.product_id = ?`); params.push(product_id); }
    if (location_id) { conditions.push(`sl.location_id = ?`); params.push(location_id); }
    if (warehouse_id) { conditions.push(`l.warehouse_id = ?`); params.push(warehouse_id); }
    if (movement_type) { conditions.push(`sl.movement_type = ?`); params.push(movement_type); }
    if (start_date) { conditions.push(`sl.created_at >= ?`); params.push(start_date); }
    if (end_date) { conditions.push(`sl.created_at <= ?`); params.push(end_date); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), parseInt(offset));

    const query = `
      SELECT sl.id, sl.movement_type, sl.quantity, sl.balance_after, sl.reference, sl.notes, sl.created_at,
             p.name as product_name, p.sku,
             l.name as location_name, l.short_code as location_code,
             w.name as warehouse_name,
             u.name as performed_by_name,
             o.reference as operation_reference, o.type as operation_type, o.status as operation_status
      FROM stock_ledger sl
      JOIN products p ON p.id = sl.product_id
      JOIN locations l ON l.id = sl.location_id
      JOIN warehouses w ON w.id = l.warehouse_id
      LEFT JOIN users u ON u.id = sl.performed_by
      LEFT JOIN operations o ON o.id = sl.operation_id
      ${where}
      ORDER BY sl.created_at DESC
      LIMIT ? OFFSET ?`;

    const result = pool.query(query, params);
    res.json({ ledger: result.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Ledger error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET PRODUCT STOCK
exports.getProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = pool.query(
      `SELECT s.quantity, s.reserved_qty,
              (s.quantity - s.reserved_qty) as free_to_ship,
              l.name as location_name, l.short_code as location_code, l.type as location_type,
              w.name as warehouse_name, w.short_code as warehouse_code,
              CASE WHEN s.quantity = 0 THEN 'out_of_stock'
                   WHEN s.quantity <= p.reorder_point THEN 'low_stock'
                   ELSE 'in_stock' END as status
       FROM stock s
       JOIN locations l ON l.id = s.location_id
       JOIN warehouses w ON w.id = l.warehouse_id
       JOIN products p ON p.id = s.product_id
       WHERE s.product_id = ?
       ORDER BY w.name, l.name`, [productId]
    );
    const totalOnHand = result.rows.reduce((s, r) => s + r.quantity, 0);
    const totalFree = result.rows.reduce((s, r) => s + r.free_to_ship, 0);
    res.json({ product_id: productId, total_on_hand: totalOnHand, total_free_to_ship: totalFree, locations: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
