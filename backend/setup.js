const { db } = require('./config/db');
const { v4: uuidv4 } = require('uuid');

function initSchema() {
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║     CoreInventory Database Setup          ║');
  console.log('  ╚══════════════════════════════════════════╝\n');

  console.log('  [1/2] Creating tables...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
      otp_code TEXT,
      otp_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category_id TEXT REFERENCES categories(id),
      unit_of_measure TEXT DEFAULT 'unit' CHECK (unit_of_measure IN ('unit', 'kg', 'litre', 'metre', 'box')),
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      reorder_point INTEGER DEFAULT 10,
      reorder_qty INTEGER DEFAULT 50,
      barcode TEXT,
      description TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      warehouse_id TEXT REFERENCES warehouses(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'internal' CHECK (type IN ('internal', 'input', 'output', 'production', 'scrap', 'virtual_supplier', 'virtual_customer')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(short_code, warehouse_id)
    );

    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
      location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
      reserved_qty INTEGER DEFAULT 0 CHECK (reserved_qty >= 0),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK (type IN ('supplier', 'customer', 'both')),
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('receipt', 'delivery', 'internal_transfer', 'adjustment')),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'cancelled')),
      source_location_id TEXT REFERENCES locations(id),
      destination_location_id TEXT REFERENCES locations(id),
      contact_id TEXT REFERENCES contacts(id),
      scheduled_date TEXT,
      completed_date TEXT,
      responsible_id TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      has_discrepancies INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operation_lines (
      id TEXT PRIMARY KEY,
      operation_id TEXT REFERENCES operations(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      expected_qty INTEGER NOT NULL DEFAULT 0,
      actual_qty INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      location_id TEXT REFERENCES locations(id),
      operation_id TEXT REFERENCES operations(id),
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference TEXT,
      notes TEXT,
      performed_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      product_id TEXT REFERENCES products(id),
      warehouse_id TEXT REFERENCES warehouses(id),
      message TEXT NOT NULL,
      urgency TEXT DEFAULT 'info' CHECK (urgency IN ('info', 'warning', 'critical')),
      is_read INTEGER DEFAULT 0,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reorder_rules (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      warehouse_id TEXT REFERENCES warehouses(id),
      min_qty INTEGER NOT NULL DEFAULT 10,
      max_qty INTEGER NOT NULL DEFAULT 100,
      reorder_qty INTEGER NOT NULL DEFAULT 50,
      lead_time_days INTEGER DEFAULT 7,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, warehouse_id)
    );

    -- Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES contacts(id),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'received', 'partially_received', 'cancelled')),
      order_date TEXT DEFAULT (datetime('now')),
      expected_date TEXT,
      received_date TEXT,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_order_lines (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      ordered_qty INTEGER NOT NULL DEFAULT 0,
      received_qty INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Returns
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('customer_return', 'supplier_return')),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'processing', 'completed', 'cancelled')),
      contact_id TEXT REFERENCES contacts(id),
      original_operation_id TEXT REFERENCES operations(id),
      reason TEXT,
      resolution TEXT CHECK (resolution IN ('restock', 'scrap', 'replace', 'refund')),
      total_value REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS return_lines (
      id TEXT PRIMARY KEY,
      return_id TEXT REFERENCES returns(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      condition TEXT CHECK (condition IN ('good', 'damaged', 'expired')),
      resolution TEXT CHECK (resolution IN ('restock', 'scrap', 'replace', 'refund')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Batches
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      product_id TEXT REFERENCES products(id),
      manufacture_date TEXT,
      expiry_date TEXT,
      supplier_id TEXT REFERENCES contacts(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS batch_stock (
      id TEXT PRIMARY KEY,
      batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE,
      location_id TEXT REFERENCES locations(id),
      quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(batch_id, location_id)
    );

    -- Cycle Counts
    CREATE TABLE IF NOT EXISTS cycle_counts (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      warehouse_id TEXT REFERENCES warehouses(id),
      status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
      scheduled_date TEXT,
      completed_date TEXT,
      count_type TEXT DEFAULT 'full' CHECK (count_type IN ('full', 'abc', 'random', 'category')),
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cycle_count_lines (
      id TEXT PRIMARY KEY,
      cycle_count_id TEXT REFERENCES cycle_counts(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      location_id TEXT REFERENCES locations(id),
      system_qty INTEGER NOT NULL DEFAULT 0,
      counted_qty INTEGER,
      variance INTEGER,
      notes TEXT,
      counted_by TEXT REFERENCES users(id),
      counted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_location ON stock(location_id);
    CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
    CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_ledger_created ON stock_ledger(created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
    CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON cycle_counts(status);

    -- Sales Orders
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES contacts(id),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','confirmed','processing','shipped','delivered','cancelled')),
      order_date TEXT DEFAULT (datetime('now')),
      shipping_date TEXT,
      delivered_date TEXT,
      total_amount REAL DEFAULT 0,
      shipping_address TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales_order_lines (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT REFERENCES sales_orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      shipped_qty INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Unit Conversions
    CREATE TABLE IF NOT EXISTS unit_conversions (
      id TEXT PRIMARY KEY,
      from_unit TEXT NOT NULL,
      to_unit TEXT NOT NULL,
      factor REAL NOT NULL,
      product_id TEXT REFERENCES products(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(from_unit, to_unit, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_so_status ON sales_orders(status);
    CREATE INDEX IF NOT EXISTS idx_so_customer ON sales_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_unit_conv_product ON unit_conversions(product_id);
  `);

  console.log('  ✅ Tables created!\n');
}

module.exports = { initSchema, uuidv4 };

// Run directly
if (require.main === module) {
  initSchema();
  console.log('  ✅ Database setup complete!');
  process.exit(0);
}
