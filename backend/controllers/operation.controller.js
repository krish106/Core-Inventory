const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function generateReference(type) {
  const prefixes = { receipt: 'REC', delivery: 'DEL', internal_transfer: 'INT', adjustment: 'ADJ' };
  const prefix = prefixes[type] || 'OP';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// CREATE OPERATION
exports.createOperation = async (req, res) => {
  try {
    const { type, source_location_id, destination_location_id, contact_id, scheduled_date, notes, lines } = req.body;
    if (!type) return res.status(400).json({ error: 'Type is required' });

    if (type === 'delivery' && !source_location_id) return res.status(400).json({ error: 'Source location required for delivery' });
    if (type === 'receipt' && !destination_location_id) return res.status(400).json({ error: 'Destination location required for receipt' });
    if (type === 'internal_transfer' && (!source_location_id || !destination_location_id)) return res.status(400).json({ error: 'Both source and destination required for transfer' });

    const id = uuidv4();
    const reference = generateReference(type);
    pool.query(
      `INSERT INTO operations (id, reference, type, source_location_id, destination_location_id, contact_id, scheduled_date, notes, created_by, responsible_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, type, source_location_id || null, destination_location_id || null,
       contact_id || null, scheduled_date || null, notes || null, req.user.id, req.user.id]
    );

    // Add lines if provided
    const addedLines = [];
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        const lineId = uuidv4();
        pool.query(
          'INSERT INTO operation_lines (id, operation_id, product_id, expected_qty) VALUES (?, ?, ?, ?)',
          [lineId, id, line.product_id, line.expected_qty || 0]
        );
        addedLines.push({ id: lineId, product_id: line.product_id, expected_qty: line.expected_qty || 0 });
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('operation-created', { id, reference, type });

    const op = pool.query('SELECT * FROM operations WHERE id = ?', [id]);
    res.status(201).json({ ...op.rows[0], lines: addedLines });
  } catch (err) {
    console.error('Create operation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET OPERATIONS
exports.getOperations = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    let conditions = [];
    let params = [];

    if (type) { conditions.push('o.type = ?'); params.push(type); }
    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (search) { conditions.push('o.reference LIKE ?'); params.push(`%${search}%`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = pool.query(`
      SELECT o.*,
             sl.name as source_location_name, sw.name as source_warehouse_name,
             dl.name as dest_location_name, dw.name as dest_warehouse_name,
             ct.name as contact_name,
             u.name as created_by_name
      FROM operations o
      LEFT JOIN locations sl ON sl.id = o.source_location_id
      LEFT JOIN warehouses sw ON sw.id = sl.warehouse_id
      LEFT JOIN locations dl ON dl.id = o.destination_location_id
      LEFT JOIN warehouses dw ON dw.id = dl.warehouse_id
      LEFT JOIN contacts ct ON ct.id = o.contact_id
      LEFT JOIN users u ON u.id = o.created_by
      ${where}
      ORDER BY o.created_at DESC`, params);

    res.json({ operations: result.rows });
  } catch (err) {
    console.error('Get operations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET OPERATION BY ID
exports.getOperationById = async (req, res) => {
  try {
    const op = pool.query(`
      SELECT o.*,
             sl.name as source_location_name, sw.name as source_warehouse_name,
             dl.name as dest_location_name, dw.name as dest_warehouse_name,
             ct.name as contact_name, u.name as created_by_name, r.name as responsible_name
      FROM operations o
      LEFT JOIN locations sl ON sl.id = o.source_location_id
      LEFT JOIN warehouses sw ON sw.id = sl.warehouse_id
      LEFT JOIN locations dl ON dl.id = o.destination_location_id
      LEFT JOIN warehouses dw ON dw.id = dl.warehouse_id
      LEFT JOIN contacts ct ON ct.id = o.contact_id
      LEFT JOIN users u ON u.id = o.created_by
      LEFT JOIN users r ON r.id = o.responsible_id
      WHERE o.id = ?`, [req.params.id]);

    if (op.rows.length === 0) return res.status(404).json({ error: 'Operation not found' });

    const lines = pool.query(`
      SELECT ol.*, p.name as product_name, p.sku
      FROM operation_lines ol
      JOIN products p ON p.id = ol.product_id
      WHERE ol.operation_id = ?`, [req.params.id]);

    res.json({ ...op.rows[0], lines: lines.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ADD LINE
exports.addLine = async (req, res) => {
  try {
    const { product_id, expected_qty } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Product required' });
    const id = uuidv4();
    pool.query('INSERT INTO operation_lines (id, operation_id, product_id, expected_qty) VALUES (?, ?, ?, ?)',
      [id, req.params.id, product_id, expected_qty || 0]);
    const line = pool.query('SELECT ol.*, p.name as product_name, p.sku FROM operation_lines ol JOIN products p ON p.id = ol.product_id WHERE ol.id = ?', [id]);
    res.status(201).json(line.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE LINE
exports.updateLine = async (req, res) => {
  try {
    const { actual_qty, expected_qty } = req.body;
    if (actual_qty !== undefined) pool.query('UPDATE operation_lines SET actual_qty = ? WHERE id = ? AND operation_id = ?', [actual_qty, req.params.lineId, req.params.id]);
    if (expected_qty !== undefined) pool.query('UPDATE operation_lines SET expected_qty = ? WHERE id = ? AND operation_id = ?', [expected_qty, req.params.lineId, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// REMOVE LINE
exports.removeLine = async (req, res) => {
  try {
    pool.query('DELETE FROM operation_lines WHERE id = ? AND operation_id = ?', [req.params.lineId, req.params.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE STATUS
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    pool.query('UPDATE operations SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// VALIDATE OPERATION
exports.validateOperation = async (req, res) => {
  try {
    const op = pool.query('SELECT * FROM operations WHERE id = ?', [req.params.id]);
    if (op.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const operation = op.rows[0];
    if (operation.status === 'done') return res.status(400).json({ error: 'Already validated' });
    if (operation.status === 'cancelled') return res.status(400).json({ error: 'Cannot validate cancelled operation' });

    const lines = pool.query('SELECT * FROM operation_lines WHERE operation_id = ?', [req.params.id]);
    if (lines.rows.length === 0) return res.status(400).json({ error: 'No lines to validate' });

    let hasDiscrepancies = false;

    for (const line of lines.rows) {
      const qty = line.actual_qty != null ? line.actual_qty : line.expected_qty;

      // Set actual_qty if not set
      if (line.actual_qty == null) {
        pool.query('UPDATE operation_lines SET actual_qty = ? WHERE id = ?', [qty, line.id]);
      }

      if (line.actual_qty != null && line.actual_qty !== line.expected_qty) {
        hasDiscrepancies = true;
      }

      // Update stock based on operation type
      if (operation.type === 'receipt' && operation.destination_location_id) {
        // Add stock at destination
        const existing = pool.query('SELECT * FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.destination_location_id]);
        if (existing.rows.length > 0) {
          pool.query('UPDATE stock SET quantity = quantity + ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?',
            [qty, line.product_id, operation.destination_location_id]);
        } else {
          pool.query('INSERT INTO stock (id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)',
            [uuidv4(), line.product_id, operation.destination_location_id, qty]);
        }
        const bal = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.destination_location_id]);
        pool.query('INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), line.product_id, operation.destination_location_id, operation.id, 'in', qty, bal.rows[0].quantity, operation.reference, req.user.id]);

      } else if (operation.type === 'delivery' && operation.source_location_id) {
        // Remove stock from source
        const current = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.source_location_id]);
        if (current.rows.length === 0 || current.rows[0].quantity < qty) {
          return res.status(400).json({ error: `Insufficient stock for product (line ${line.id}). Available: ${current.rows[0]?.quantity || 0}, needed: ${qty}` });
        }
        pool.query('UPDATE stock SET quantity = quantity - ?, updated_at = datetime(\'now\') WHERE product_id = ? AND location_id = ?',
          [qty, line.product_id, operation.source_location_id]);
        const bal = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.source_location_id]);
        pool.query('INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), line.product_id, operation.source_location_id, operation.id, 'out', -qty, bal.rows[0].quantity, operation.reference, req.user.id]);

      } else if (operation.type === 'internal_transfer') {
        // Remove from source
        const srcStock = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.source_location_id]);
        if (srcStock.rows.length === 0 || srcStock.rows[0].quantity < qty) {
          return res.status(400).json({ error: `Insufficient stock for transfer` });
        }
        pool.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?', [qty, line.product_id, operation.source_location_id]);
        const srcBal = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.source_location_id]);
        pool.query('INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), line.product_id, operation.source_location_id, operation.id, 'out', -qty, srcBal.rows[0].quantity, operation.reference, req.user.id]);
        // Add to destination
        const dstExisting = pool.query('SELECT * FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.destination_location_id]);
        if (dstExisting.rows.length > 0) {
          pool.query('UPDATE stock SET quantity = quantity + ? WHERE product_id = ? AND location_id = ?', [qty, line.product_id, operation.destination_location_id]);
        } else {
          pool.query('INSERT INTO stock (id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)', [uuidv4(), line.product_id, operation.destination_location_id, qty]);
        }
        const dstBal = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.destination_location_id]);
        pool.query('INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), line.product_id, operation.destination_location_id, operation.id, 'in', qty, dstBal.rows[0].quantity, operation.reference, req.user.id]);

      } else if (operation.type === 'adjustment' && operation.source_location_id) {
        const current = pool.query('SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?', [line.product_id, operation.source_location_id]);
        const currentQty = current.rows.length > 0 ? current.rows[0].quantity : 0;
        const diff = qty - currentQty;
        if (current.rows.length > 0) {
          pool.query('UPDATE stock SET quantity = ? WHERE product_id = ? AND location_id = ?', [qty, line.product_id, operation.source_location_id]);
        } else {
          pool.query('INSERT INTO stock (id, product_id, location_id, quantity) VALUES (?, ?, ?, ?)', [uuidv4(), line.product_id, operation.source_location_id, qty]);
        }
        pool.query('INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), line.product_id, operation.source_location_id, operation.id, 'adjustment', diff, qty, operation.reference, req.user.id]);
      }

      // Check for low stock alerts
      const totalStock = pool.query('SELECT COALESCE(SUM(quantity), 0) as total FROM stock WHERE product_id = ?', [line.product_id]);
      const product = pool.query('SELECT name, sku, reorder_point FROM products WHERE id = ?', [line.product_id]);
      if (product.rows.length > 0 && totalStock.rows[0].total <= product.rows[0].reorder_point) {
        const alertType = totalStock.rows[0].total === 0 ? 'out_of_stock' : 'low_stock';
        const urgency = totalStock.rows[0].total === 0 ? 'critical' : 'warning';
        pool.query('INSERT INTO alerts (id, type, product_id, message, urgency) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), alertType, line.product_id,
           `${product.rows[0].name} (${product.rows[0].sku}) is ${alertType === 'out_of_stock' ? 'OUT OF STOCK' : 'running low'}: ${totalStock.rows[0].total} remaining`,
           urgency]);
      }
    }

    pool.query('UPDATE operations SET status = ?, completed_date = datetime(\'now\'), has_discrepancies = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['done', hasDiscrepancies ? 1 : 0, req.params.id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('operation-completed', { id: operation.id, reference: operation.reference, type: operation.type });
      io.emit('stock-updated');
    }

    const updated = pool.query('SELECT * FROM operations WHERE id = ?', [req.params.id]);
    const updatedLines = pool.query('SELECT ol.*, p.name as product_name, p.sku FROM operation_lines ol JOIN products p ON p.id = ol.product_id WHERE ol.operation_id = ?', [req.params.id]);
    res.json({ operation: { ...updated.rows[0], lines: updatedLines.rows }, message: 'Operation validated successfully' });
  } catch (err) {
    console.error('Validate error:', err);
    res.status(500).json({ error: err.message || 'Validation failed' });
  }
};
