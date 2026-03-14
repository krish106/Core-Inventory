const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Generate PO reference like PO-20260314-001
function generateRef() {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const { rows } = db.query(`SELECT COUNT(*) as c FROM purchase_orders WHERE date(created_at) = date('now')`);
  const seq = String((rows[0]?.c || 0) + 1).padStart(3, '0');
  return `PO-${date}-${seq}`;
}

exports.listPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    let query = `
      SELECT po.*, c.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_order_lines WHERE purchase_order_id = po.id) as line_count
      FROM purchase_orders po
      LEFT JOIN contacts c ON po.supplier_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ` AND po.status = ?`; params.push(status); }
    if (supplier_id) { query += ` AND po.supplier_id = ?`; params.push(supplier_id); }
    query += ` ORDER BY po.created_at DESC`;
    const { rows } = db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list purchase orders' });
  }
};

exports.getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: poRows } = db.query(`
      SELECT po.*, c.name as supplier_name, c.email as supplier_email, c.phone as supplier_phone
      FROM purchase_orders po
      LEFT JOIN contacts c ON po.supplier_id = c.id
      WHERE po.id = ?
    `, [id]);
    if (!poRows.length) return res.status(404).json({ error: 'Purchase order not found' });

    const { rows: lines } = db.query(`
      SELECT pol.*, p.name as product_name, p.sku
      FROM purchase_order_lines pol
      JOIN products p ON pol.product_id = p.id
      WHERE pol.purchase_order_id = ?
    `, [id]);

    res.json({ ...poRows[0], lines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get purchase order' });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, expected_date, notes, lines } = req.body;
    const id = uuidv4();
    const reference = generateRef();

    let total_amount = 0;
    if (lines && lines.length) {
      total_amount = lines.reduce((sum, l) => sum + (l.ordered_qty * l.unit_price), 0);
    }

    db.query(`
      INSERT INTO purchase_orders (id, reference, supplier_id, expected_date, notes, total_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, reference, supplier_id || null, expected_date || null, notes || null, total_amount, req.user?.id || null]);

    if (lines && lines.length) {
      for (const line of lines) {
        const lineId = uuidv4();
        const lineTotal = (line.ordered_qty || 0) * (line.unit_price || 0);
        db.query(`
          INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, ordered_qty, unit_price, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [lineId, id, line.product_id, line.ordered_qty, line.unit_price || 0, lineTotal]);
      }
    }

    res.status(201).json({ id, reference, message: 'Purchase order created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['draft', 'confirmed', 'received', 'partially_received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.query(`UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);

    // If marking as received, auto-create a receipt operation
    if (status === 'received' || status === 'partially_received') {
      db.query(`UPDATE purchase_orders SET received_date = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [id]);
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

exports.receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { lines } = req.body; // [{line_id, received_qty}]

    // Get the PO
    const { rows: poRows } = db.query(`SELECT * FROM purchase_orders WHERE id = ?`, [id]);
    if (!poRows.length) return res.status(404).json({ error: 'PO not found' });

    // Update each line's received qty
    let allFullyReceived = true;
    for (const line of lines) {
      db.query(`UPDATE purchase_order_lines SET received_qty = ? WHERE id = ?`, [line.received_qty, line.line_id]);
      
      const { rows: lineRows } = db.query(`SELECT * FROM purchase_order_lines WHERE id = ?`, [line.line_id]);
      if (lineRows.length && lineRows[0].received_qty < lineRows[0].ordered_qty) {
        allFullyReceived = false;
      }
    }

    const newStatus = allFullyReceived ? 'received' : 'partially_received';
    db.query(`UPDATE purchase_orders SET status = ?, received_date = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [newStatus, id]);

    res.json({ message: `Purchase order ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = db.query(`SELECT status FROM purchase_orders WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft POs can be deleted' });

    db.query(`DELETE FROM purchase_order_lines WHERE purchase_order_id = ?`, [id]);
    db.query(`DELETE FROM purchase_orders WHERE id = ?`, [id]);
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
};
