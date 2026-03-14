const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function generateRef() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const { rows } = db.query(`SELECT COUNT(*) as c FROM sales_orders WHERE date(created_at) = date('now')`);
  const seq = String((rows[0]?.c || 0) + 1).padStart(3, '0');
  return `SO-${date}-${seq}`;
}

exports.listSalesOrders = async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let query = `
      SELECT so.*, c.name as customer_name,
        (SELECT COUNT(*) FROM sales_order_lines WHERE sales_order_id = so.id) as line_count
      FROM sales_orders so
      LEFT JOIN contacts c ON so.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ` AND so.status = ?`; params.push(status); }
    if (customer_id) { query += ` AND so.customer_id = ?`; params.push(customer_id); }
    query += ` ORDER BY so.created_at DESC`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to list sales orders' });
  }
};

exports.getSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: soRows } = db.query(`
      SELECT so.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM sales_orders so LEFT JOIN contacts c ON so.customer_id = c.id WHERE so.id = ?
    `, [id]);
    if (!soRows.length) return res.status(404).json({ error: 'Sales order not found' });
    const { rows: lines } = db.query(`
      SELECT sol.*, p.name as product_name, p.sku
      FROM sales_order_lines sol JOIN products p ON sol.product_id = p.id WHERE sol.sales_order_id = ?
    `, [id]);
    res.json({ ...soRows[0], lines });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to get sales order' });
  }
};

exports.createSalesOrder = async (req, res) => {
  try {
    const { customer_id, shipping_address, shipping_date, notes, lines } = req.body;
    const id = uuidv4();
    const reference = generateRef();
    let total_amount = 0;
    if (lines && lines.length) {
      total_amount = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
    }
    db.query(`INSERT INTO sales_orders (id, reference, customer_id, shipping_address, shipping_date, notes, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [id, reference, customer_id || null, shipping_address || null, shipping_date || null, notes || null, total_amount, req.user?.id || null]);
    if (lines && lines.length) {
      for (const line of lines) {
        const lineId = uuidv4();
        const lineTotal = (line.quantity || 0) * (line.unit_price || 0);
        db.query(`INSERT INTO sales_order_lines (id, sales_order_id, product_id, quantity, unit_price, line_total) VALUES (?,?,?,?,?,?)`,
          [lineId, id, line.product_id, line.quantity, line.unit_price || 0, lineTotal]);
      }
    }
    res.status(201).json({ id, reference, message: 'Sales order created' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to create sales order' });
  }
};

exports.updateSalesOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['draft','confirmed','processing','shipped','delivered','cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    db.query(`UPDATE sales_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
    if (status === 'shipped') db.query(`UPDATE sales_orders SET shipping_date = datetime('now') WHERE id = ?`, [id]);
    if (status === 'delivered') db.query(`UPDATE sales_orders SET delivered_date = datetime('now') WHERE id = ?`, [id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.shipSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { lines } = req.body; // [{line_id, shipped_qty}]
    let allShipped = true;
    for (const line of lines) {
      db.query(`UPDATE sales_order_lines SET shipped_qty = ? WHERE id = ?`, [line.shipped_qty, line.line_id]);
      const { rows } = db.query(`SELECT * FROM sales_order_lines WHERE id = ?`, [line.line_id]);
      if (rows.length && rows[0].shipped_qty < rows[0].quantity) allShipped = false;
    }
    const newStatus = allShipped ? 'shipped' : 'processing';
    db.query(`UPDATE sales_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`, [newStatus, id]);
    if (allShipped) db.query(`UPDATE sales_orders SET shipping_date = datetime('now') WHERE id = ?`, [id]);
    res.json({ message: `Sales order ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to ship sales order' });
  }
};

exports.deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = db.query(`SELECT status FROM sales_orders WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft orders can be deleted' });
    db.query(`DELETE FROM sales_order_lines WHERE sales_order_id = ?`, [id]);
    db.query(`DELETE FROM sales_orders WHERE id = ?`, [id]);
    res.json({ message: 'Sales order deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to delete sales order' });
  }
};
