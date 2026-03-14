const pool = require('../config/db');

// GET DASHBOARD KPIs
exports.getDashboardKPIs = async (req, res) => {
  try {
    const productsInStock = pool.query('SELECT COUNT(DISTINCT product_id) as count FROM stock WHERE quantity > 0');
    const lowStock = pool.query(`SELECT COUNT(*) as count FROM (
      SELECT p.id FROM products p LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.is_active = 1 GROUP BY p.id HAVING COALESCE(SUM(s.quantity),0) > 0 AND COALESCE(SUM(s.quantity),0) <= p.reorder_point)`);
    const outOfStock = pool.query(`SELECT COUNT(*) as count FROM (
      SELECT p.id FROM products p LEFT JOIN stock s ON s.product_id = p.id
      WHERE p.is_active = 1 GROUP BY p.id HAVING COALESCE(SUM(s.quantity),0) = 0)`);
    const pendingReceipts = pool.query("SELECT COUNT(*) as count FROM operations WHERE type='receipt' AND status NOT IN ('done','cancelled')");
    const pendingDeliveries = pool.query("SELECT COUNT(*) as count FROM operations WHERE type='delivery' AND status NOT IN ('done','cancelled')");
    const pendingTransfers = pool.query("SELECT COUNT(*) as count FROM operations WHERE type='internal_transfer' AND status NOT IN ('done','cancelled')");
    const stockValue = pool.query('SELECT COALESCE(SUM(s.quantity * p.cost_price), 0) as total FROM stock s JOIN products p ON p.id = s.product_id');
    const recentAlerts = pool.query(`SELECT a.id, a.type, a.message, a.urgency, a.created_at,
       p.name as product_name, p.sku, w.name as warehouse_name
       FROM alerts a
       LEFT JOIN products p ON p.id = a.product_id
       LEFT JOIN warehouses w ON w.id = a.warehouse_id
       WHERE a.is_resolved = 0
       ORDER BY CASE a.urgency WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, a.created_at DESC
       LIMIT 5`);
    const todayMovements = pool.query(`SELECT movement_type, COUNT(*) as count, COALESCE(SUM(ABS(quantity)),0) as total_qty
       FROM stock_ledger WHERE created_at >= date('now') GROUP BY movement_type`);

    res.json({
      kpis: {
        products_in_stock: productsInStock.rows[0].count,
        low_stock_items: lowStock.rows[0].count,
        out_of_stock_items: outOfStock.rows[0].count,
        pending_receipts: pendingReceipts.rows[0].count,
        pending_deliveries: pendingDeliveries.rows[0].count,
        pending_transfers: pendingTransfers.rows[0].count,
        total_stock_value: parseFloat(stockValue.rows[0].total)
      },
      recent_alerts: recentAlerts.rows,
      today_movements: todayMovements.rows
    });
  } catch (err) {
    console.error('Dashboard KPI error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET REORDER SUGGESTIONS
exports.getReorderSuggestions = async (req, res) => {
  try {
    const result = pool.query(`
      SELECT p.id, p.name, p.sku, p.reorder_point, p.reorder_qty,
             COALESCE(ps.current_stock, 0) as current_stock,
             CASE
               WHEN COALESCE(ps.current_stock, 0) = 0 THEN 'CRITICAL'
               WHEN COALESCE(ps.current_stock, 0) <= p.reorder_point THEN 'ORDER_NOW'
               ELSE 'OK'
             END as urgency
      FROM products p
      LEFT JOIN (SELECT product_id, SUM(quantity) as current_stock FROM stock GROUP BY product_id) ps ON ps.product_id = p.id
      WHERE p.is_active = 1
        AND (COALESCE(ps.current_stock, 0) = 0 OR COALESCE(ps.current_stock, 0) <= p.reorder_point)
      ORDER BY CASE WHEN COALESCE(ps.current_stock, 0) = 0 THEN 1 ELSE 2 END, ps.current_stock ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Reorder suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
