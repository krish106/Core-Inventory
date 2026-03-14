const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// CREATE PRODUCT
exports.createProduct = async (req, res) => {
  try {
    const { name, sku, category_id, unit_of_measure, cost_price, selling_price,
            reorder_point, barcode, description, initial_stock, location_id } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });

    const exists = pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'SKU already exists' });

    const id = uuidv4();
    pool.query(
      `INSERT INTO products (id, name, sku, category_id, unit_of_measure, cost_price, selling_price, reorder_point, barcode, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, sku, category_id || null, unit_of_measure || 'unit',
       cost_price || 0, selling_price || 0, reorder_point || 10,
       barcode || null, description || null, req.user.id]
    );

    if (initial_stock > 0 && location_id) {
      const stockId = uuidv4();
      pool.query(
        `INSERT INTO stock (id, product_id, location_id, quantity)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(product_id, location_id) DO UPDATE SET quantity = quantity + ?`,
        [stockId, id, location_id, initial_stock, initial_stock]
      );
      pool.query(
        `INSERT INTO stock_ledger (id, product_id, location_id, movement_type, quantity, balance_after, reference, performed_by)
         VALUES (?, ?, ?, 'in', ?, ?, 'Initial Stock', ?)`,
        [uuidv4(), id, location_id, initial_stock, initial_stock, req.user.id]
      );
    }

    const product = pool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json(product.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const { search, category_id, stock_status } = req.query;
    let params = [];
    let conditions = ['p.is_active = 1'];
    let pidx = 0;

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      conditions.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`p.category_id = ?`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    let having = '';
    if (stock_status === 'low_stock') having = 'HAVING COALESCE(SUM(s.quantity),0) <= MAX(p.reorder_point) AND COALESCE(SUM(s.quantity),0) > 0';
    else if (stock_status === 'out_of_stock') having = 'HAVING COALESCE(SUM(s.quantity),0) = 0';

    const query = `
      SELECT p.id, p.name, p.sku, p.cost_price, p.selling_price, p.unit_of_measure, p.reorder_point, p.barcode,
             c.name as category_name,
             COALESCE(SUM(s.quantity), 0) as on_hand,
             COALESCE(SUM(s.reserved_qty), 0) as reserved,
             (COALESCE(SUM(s.quantity),0) - COALESCE(SUM(s.reserved_qty),0)) as free_to_ship,
             CASE
               WHEN COALESCE(SUM(s.quantity),0) = 0 THEN 'out_of_stock'
               WHEN COALESCE(SUM(s.quantity),0) <= p.reorder_point THEN 'low_stock'
               ELSE 'in_stock'
             END as stock_status
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      ${where}
      GROUP BY p.id
      ${having}
      ORDER BY p.name`;

    const result = pool.query(query, params);
    res.json({ products: result.rows });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
  try {
    const product = pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
      [req.params.id]
    );
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const stockByLoc = pool.query(
      `SELECT s.quantity, s.reserved_qty, (s.quantity - s.reserved_qty) as free_to_ship,
              l.name as location_name, l.short_code as location_code, l.type as location_type,
              w.name as warehouse_name, w.short_code as warehouse_code,
              CASE WHEN s.quantity = 0 THEN 'out_of_stock'
                   WHEN s.quantity <= ? THEN 'low_stock' ELSE 'in_stock' END as status
       FROM stock s JOIN locations l ON l.id = s.location_id JOIN warehouses w ON w.id = l.warehouse_id
       WHERE s.product_id = ? ORDER BY w.name, l.name`,
      [product.rows[0].reorder_point, req.params.id]
    );

    const movements = pool.query(
      `SELECT sl.* FROM stock_ledger sl WHERE sl.product_id = ? ORDER BY sl.created_at DESC LIMIT 20`,
      [req.params.id]
    );

    const totalOnHand = stockByLoc.rows.reduce((s, r) => s + r.quantity, 0);
    const totalFree = stockByLoc.rows.reduce((s, r) => s + r.free_to_ship, 0);

    res.json({
      ...product.rows[0],
      total_on_hand: totalOnHand,
      total_free_to_ship: totalFree,
      stock_by_location: stockByLoc.rows,
      recent_movements: movements.rows
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
  try {
    const { name, sku, category_id, unit_of_measure, cost_price, selling_price, reorder_point, barcode, description } = req.body;
    pool.query(
      `UPDATE products SET name=?, sku=?, category_id=?, unit_of_measure=?, cost_price=?, selling_price=?, reorder_point=?, barcode=?, description=?, updated_at=datetime('now') WHERE id=?`,
      [name, sku, category_id, unit_of_measure, cost_price, selling_price, reorder_point, barcode, description, req.params.id]
    );
    const result = pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// BARCODE LOOKUP
exports.barcodeLookup = async (req, res) => {
  try {
    const result = pool.query('SELECT * FROM products WHERE barcode = ? AND is_active = 1', [req.params.barcode]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET CATEGORIES
exports.getCategories = async (req, res) => {
  try {
    const result = pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// CREATE CATEGORY
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = uuidv4();
    pool.query('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [id, name, description || null]);
    const result = pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
