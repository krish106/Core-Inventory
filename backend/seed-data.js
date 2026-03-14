/**
 * Seed Script — Generates 2 years of realistic fake inventory data
 * Uses UUIDs for all IDs (matching the DB schema)
 * Run: node seed-data.js
 */
const { db } = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rnd(0, arr.length - 1)];
const dateAgo = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

console.log('\n🌱 Seeding 2 years of fake data...\n');

// === USERS ===
const existingUsers = db.prepare("SELECT id, email FROM users").all();
const userMap = {};
existingUsers.forEach(u => { userMap[u.email] = u.id; });

const userData = [
  ['Admin User', 'admin@coreinventory.com', 'admin123', 'admin'],
  ['Rahul Sharma', 'rahul@coreinventory.com', 'pass123', 'manager'],
  ['Priya Patel', 'priya@coreinventory.com', 'pass123', 'staff'],
  ['Vikram Singh', 'vikram@coreinventory.com', 'pass123', 'staff'],
  ['Anita Desai', 'anita@coreinventory.com', 'pass123', 'manager'],
];
const userIds = [];
for (const [name, email, pass, role] of userData) {
  if (userMap[email]) { userIds.push(userMap[email]); continue; }
  const id = uuidv4();
  db.prepare("INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)").run(id, name, email, bcrypt.hashSync(pass, 10), role);
  userIds.push(id);
}
console.log('  ✅ Users:', userIds.length);

// === CATEGORIES ===
const catNames = ['Electronics', 'Raw Materials', 'Finished Goods', 'Office Supplies', 'Chemicals', 'Hardware', 'Packaging', 'Safety Equipment', 'Tools', 'Spare Parts'];
const catIds = {};
for (const name of catNames) {
  const row = db.prepare("SELECT id FROM categories WHERE name=?").get(name);
  if (row) { catIds[name] = row.id; continue; }
  const id = uuidv4();
  db.prepare("INSERT INTO categories (id, name) VALUES (?,?)").run(id, name);
  catIds[name] = id;
}
console.log('  ✅ Categories:', Object.keys(catIds).length);

// === WAREHOUSES ===
const whData = [
  ['Main Warehouse', 'WH-MAIN', 'Mumbai, Maharashtra'],
  ['North Hub', 'WH-NORTH', 'Delhi, NCR'],
  ['South Center', 'WH-SOUTH', 'Bangalore, Karnataka'],
  ['East Wing', 'WH-EAST', 'Kolkata, West Bengal'],
];
const whIds = {};
for (const [name, code, addr] of whData) {
  let row = db.prepare("SELECT id FROM warehouses WHERE short_code=?").get(code);
  if (!row) row = db.prepare("SELECT id FROM warehouses WHERE name=?").get(name);
  if (row) { whIds[code] = row.id; continue; }
  const id = uuidv4();
  db.prepare("INSERT INTO warehouses (id, name, short_code, address) VALUES (?,?,?,?)").run(id, name, code, addr);
  whIds[code] = id;
}
// Also get any existing warehouses
db.prepare("SELECT id, short_code FROM warehouses").all().forEach(w => { if (!whIds[w.short_code]) whIds[w.short_code] = w.id; });
const warehouseIdList = Object.values(whIds);
console.log('  ✅ Warehouses:', warehouseIdList.length);

// === LOCATIONS ===
const locNames = ['Shelf A', 'Shelf B', 'Rack 1', 'Rack 2', 'Cold Storage', 'Loading Bay'];
const existingLocs = db.prepare("SELECT id FROM locations").all().map(r => r.id);
const locationIds = [...existingLocs];

for (const whId of warehouseIdList) {
  const existingCount = db.prepare("SELECT COUNT(*) as c FROM locations WHERE warehouse_id=?").get(whId).c;
  const needed = Math.max(0, 3 - existingCount);
  for (let i = 0; i < needed; i++) {
    const id = uuidv4();
    const name = locNames[existingCount + i] || `Zone-${i+1}`;
    const code = `${id.slice(0,6)}`;
    try {
      db.prepare("INSERT INTO locations (id, warehouse_id, name, short_code, type) VALUES (?,?,?,?,?)").run(id, whId, name, code, pick(['internal','input','output']));
      locationIds.push(id);
    } catch(e) { /* skip */ }
  }
}
console.log('  ✅ Locations:', locationIds.length);

// === PRODUCTS ===
const productData = [
  ['Steel Rods 12mm', 'STL-012', 'Raw Materials', 'kg', 85, 120, 50],
  ['Steel Rods 16mm', 'STL-016', 'Raw Materials', 'kg', 95, 140, 40],
  ['Copper Wire 2mm', 'CPR-002', 'Raw Materials', 'metre', 45, 65, 100],
  ['Aluminium Sheets', 'ALM-002', 'Raw Materials', 'unit', 320, 450, 20],
  ['Iron Nails 3inch', 'IRN-003', 'Raw Materials', 'box', 12, 18, 200],
  ['PVC Pipes 2inch', 'PVC-002', 'Raw Materials', 'unit', 55, 80, 80],
  ['Wooden Planks Oak', 'WPL-OAK', 'Raw Materials', 'unit', 150, 220, 30],
  ['Cement Portland', 'CMT-PRT', 'Raw Materials', 'kg', 380, 420, 100],
  ['USB-C Cable 1m', 'USB-C01', 'Electronics', 'unit', 120, 250, 50],
  ['USB-C Cable 2m', 'USB-C02', 'Electronics', 'unit', 150, 300, 30],
  ['HDMI Cable 4K', 'HDM-4K1', 'Electronics', 'unit', 180, 350, 25],
  ['Laptop Stand Pro', 'LPS-PRO', 'Electronics', 'unit', 450, 899, 15],
  ['Monitor Arm Dual', 'MON-DL2', 'Electronics', 'unit', 800, 1500, 10],
  ['Keyboard Wireless', 'KBD-WLS', 'Electronics', 'unit', 350, 699, 20],
  ['Mouse Ergonomic', 'MSE-ERG', 'Electronics', 'unit', 200, 450, 25],
  ['Webcam HD 1080p', 'WCM-HD1', 'Electronics', 'unit', 280, 550, 15],
  ['LED Panel 40W', 'LED-040', 'Electronics', 'unit', 220, 400, 30],
  ['Power Strip 6way', 'PWR-006', 'Electronics', 'unit', 90, 180, 40],
  ['Office Chair Deluxe', 'CHR-DLX', 'Finished Goods', 'unit', 2500, 5500, 8],
  ['Office Desk LShape', 'DSK-LSH', 'Finished Goods', 'unit', 4500, 9500, 5],
  ['Filing Cabinet', 'FLC-004', 'Finished Goods', 'unit', 3200, 6000, 6],
  ['Bookshelf 5Tier', 'BSF-005', 'Finished Goods', 'unit', 2800, 5200, 7],
  ['Whiteboard 120x90', 'WTB-129', 'Finished Goods', 'unit', 1200, 2400, 10],
  ['A4 Paper Pack 500', 'PPR-A4P', 'Office Supplies', 'box', 180, 350, 100],
  ['Stapler Heavy Duty', 'STP-HDY', 'Office Supplies', 'unit', 80, 150, 50],
  ['Pen Box Blue 50pc', 'PEN-BLU', 'Office Supplies', 'box', 120, 250, 60],
  ['Marker Set 12col', 'MRK-012', 'Office Supplies', 'box', 65, 120, 40],
  ['Binder Clips 100', 'BND-100', 'Office Supplies', 'box', 25, 50, 80],
  ['Notebook A5 200pg', 'NBK-A52', 'Office Supplies', 'unit', 35, 75, 100],
  ['Isopropyl Alcohol', 'IPA-001', 'Chemicals', 'litre', 85, 150, 50],
  ['Acetone Industrial', 'ACT-IND', 'Chemicals', 'litre', 65, 120, 40],
  ['Epoxy Resin Kit', 'EPX-KIT', 'Chemicals', 'unit', 250, 450, 20],
  ['Bolt Set M8 100pc', 'BLT-M08', 'Hardware', 'box', 95, 180, 40],
  ['Screw Set Mixed', 'SCW-MIX', 'Hardware', 'box', 75, 140, 50],
  ['Hinge Stainless', 'HNG-SS4', 'Hardware', 'unit', 45, 90, 60],
  ['Door Handle Chrome', 'DHC-CHR', 'Hardware', 'unit', 180, 350, 30],
  ['Bubble Wrap 10m', 'BUB-010', 'Packaging', 'metre', 120, 200, 50],
  ['Cardboard Box Lg', 'CBX-LRG', 'Packaging', 'unit', 25, 45, 200],
  ['Packing Tape 48mm', 'PKT-048', 'Packaging', 'unit', 18, 35, 100],
  ['Safety Helmet', 'SFH-WHT', 'Safety Equipment', 'unit', 180, 350, 30],
  ['Safety Goggles', 'SFG-001', 'Safety Equipment', 'unit', 120, 220, 40],
  ['Welding Gloves', 'WGV-001', 'Safety Equipment', 'unit', 150, 280, 25],
  ['First Aid Kit Pro', 'FAK-PRO', 'Safety Equipment', 'unit', 450, 850, 10],
  ['Drill Bit Set HSS', 'DBS-HSS', 'Tools', 'box', 350, 650, 15],
  ['Wrench Set 8pc', 'WRN-008', 'Tools', 'box', 420, 800, 12],
  ['Measuring Tape 5m', 'MST-005', 'Tools', 'unit', 45, 90, 50],
  ['Spirit Level 60cm', 'SPL-060', 'Tools', 'unit', 180, 350, 20],
  ['Bearing 6205 2RS', 'BRG-620', 'Spare Parts', 'unit', 95, 180, 40],
  ['V-Belt A68', 'VBT-A68', 'Spare Parts', 'unit', 120, 220, 30],
  ['Oil Filter Indust', 'OLF-IND', 'Spare Parts', 'unit', 75, 140, 35],
];

const productIds = [];
for (const [name, sku, catName, uom, cost, sell, reorder] of productData) {
  const exists = db.prepare("SELECT id FROM products WHERE sku=?").get(sku);
  if (exists) { productIds.push(exists.id); continue; }
  const id = uuidv4();
  const cid = catIds[catName] || Object.values(catIds)[0];
  db.prepare("INSERT INTO products (id, name, sku, category_id, unit_of_measure, cost_price, selling_price, reorder_point, is_active, created_by) VALUES (?,?,?,?,?,?,?,?,1,?)").run(id, name, sku, cid, uom, cost, sell, reorder, userIds[0]);
  productIds.push(id);
}
console.log('  ✅ Products:', productIds.length);

// === STOCK ===
console.log('  📦 Initializing stock levels...');
const stockCheck = db.prepare("SELECT id FROM stock WHERE product_id=? AND location_id=?");
for (const pid of productIds) {
  const numLocs = rnd(1, 3);
  const usedLocs = new Set();
  for (let i = 0; i < numLocs; i++) {
    const locId = pick(locationIds);
    if (usedLocs.has(locId)) continue;
    usedLocs.add(locId);
    if (stockCheck.get(pid, locId)) continue;
    const qty = rnd(10, 500);
    const reserved = rnd(0, Math.floor(qty * 0.2));
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO stock (id, product_id, location_id, quantity, reserved_qty) VALUES (?,?,?,?,?)").run(id, pid, locId, qty, reserved);
    } catch(e) { /* skip duplicates */ }
  }
}
console.log('  ✅ Stock levels set');

// === CONTACTS ===
const contactNames = ['Tata Steel Ltd', 'Reliance Industries', 'Infosys Campus', 'Amazon India', 'Flipkart Warehouse', 'Mahindra Group', 'Bajaj Electricals', 'Godrej Industries', 'Asian Paints', 'Havells India', 'Blue Star Ltd', 'Crompton Greaves', 'Larsen Toubro', 'Bosch India', 'Siemens India'];
const contactIds = [];
for (const name of contactNames) {
  const exists = db.prepare("SELECT id FROM contacts WHERE name=?").get(name);
  if (exists) { contactIds.push(exists.id); continue; }
  const id = uuidv4();
  db.prepare("INSERT INTO contacts (id, name, type, email, phone) VALUES (?,?,?,?,?)").run(id, name, pick(['supplier','customer','both']), `${name.toLowerCase().replace(/\s+/g,'.')}@example.com`, `+91-${rnd(7000000000,9999999999)}`);
  contactIds.push(id);
}
console.log('  ✅ Contacts:', contactIds.length);

// === OPERATIONS (2 years) ===
console.log('  📦 Generating 2 years of operations...');
let opCount = 0;
const totalDays = 730;

const insertOps = db.transaction(() => {
  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset--) {
    const opsPerDay = rnd(1, 5);
    for (let j = 0; j < opsPerDay; j++) {
      const type = pick(['receipt', 'delivery', 'internal_transfer']);
      const status = pick(['done','done','done','done','draft','waiting','ready','cancelled']);
      const srcLoc = pick(locationIds);
      let destLoc = pick(locationIds);
      while (destLoc === srcLoc && locationIds.length > 1) destLoc = pick(locationIds);
      
      const createdAt = dateAgo(dayOffset);
      const scheduledDate = dateAgo(dayOffset - rnd(0, 3));
      const completedDate = status === 'done' ? dateAgo(Math.max(0, dayOffset - rnd(0, 1))) : null;
      const refNum = `${type === 'receipt' ? 'REC' : type === 'delivery' ? 'DEL' : 'TRF'}-${String(opCount + 1).padStart(5, '0')}`;
      
      const opId = uuidv4();
      try {
        db.prepare("INSERT INTO operations (id, reference, type, status, source_location_id, destination_location_id, contact_id, scheduled_date, completed_date, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(
          opId, refNum, type, status,
          type === 'receipt' ? null : srcLoc,
          type === 'delivery' ? null : destLoc,
          pick(contactIds), scheduledDate, completedDate,
          `${type} operation`, pick(userIds), createdAt
        );
      } catch(e) { continue; }

      // Lines
      const lineCount = rnd(1, 3);
      for (let k = 0; k < lineCount; k++) {
        const prodId = pick(productIds);
        const qty = rnd(5, 80);
        const doneQty = status === 'done' ? qty : status === 'cancelled' ? 0 : rnd(0, qty);
        try {
          db.prepare("INSERT INTO operation_lines (id, operation_id, product_id, expected_qty, actual_qty) VALUES (?,?,?,?,?)").run(uuidv4(), opId, prodId, qty, doneQty);
        } catch(e) { /* skip */ }

        // Ledger
        if (status === 'done') {
          const movType = type === 'receipt' ? 'in' : type === 'delivery' ? 'out' : 'in';
          const ledgerQty = type === 'delivery' ? -doneQty : doneQty;
          try {
            db.prepare("INSERT INTO stock_ledger (id, product_id, location_id, operation_id, movement_type, quantity, balance_after, reference, performed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(
              uuidv4(), prodId, destLoc || srcLoc, opId, movType, ledgerQty, rnd(50, 500), refNum, pick(userIds), createdAt);
          } catch(e) { /* skip */ }
        }
      }
      opCount++;
    }
  }
});
insertOps();
console.log('  ✅ Operations:', opCount);

// === ALERTS ===
let alertCount = 0;
const insertAlerts = db.transaction(() => {
  for (let dayOffset = 90; dayOffset >= 0; dayOffset -= rnd(1, 3)) {
    const pid = pick(productIds);
    const prod = db.prepare("SELECT name FROM products WHERE id=?").get(pid);
    const type = pick(['low_stock', 'out_of_stock', 'reorder_needed']);
    const urgency = type === 'out_of_stock' ? 'critical' : pick(['warning', 'info']);
    try {
      db.prepare("INSERT INTO alerts (id, type, product_id, warehouse_id, message, urgency, is_read, created_at) VALUES (?,?,?,?,?,?,?,?)").run(
        uuidv4(), type, pid, pick(warehouseIdList), `${type.replace(/_/g,' ')}: ${prod?.name || 'Product'}`, urgency, dayOffset > 7 ? 1 : 0, dateAgo(dayOffset));
      alertCount++;
    } catch(e) { /* skip */ }
  }
});
insertAlerts();
console.log('  ✅ Alerts:', alertCount);

// === PURCHASE ORDERS ===
let poCount = 0;
const insertPOs = db.transaction(() => {
  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset -= rnd(5, 15)) {
    const poId = uuidv4();
    const ref = `PO-${String(poCount + 1).padStart(5, '0')}`;
    const status = pick(['draft','confirmed','received','received','partially_received','cancelled']);
    try {
      db.prepare("INSERT INTO purchase_orders (id, reference, supplier_id, status, order_date, expected_date, total_amount, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(
        poId, ref, pick(contactIds), status, dateAgo(dayOffset), dateAgo(dayOffset - rnd(5, 15)), rnd(5000, 500000), pick(userIds), dateAgo(dayOffset));
      const lines = rnd(1, 4);
      let total = 0;
      for (let k = 0; k < lines; k++) {
        const prod = pick(productIds);
        const qty = rnd(10, 100);
        const price = rnd(50, 5000);
        total += qty * price;
        db.prepare("INSERT INTO purchase_order_lines (id, purchase_order_id, product_id, ordered_qty, received_qty, unit_price, line_total) VALUES (?,?,?,?,?,?,?)").run(
          uuidv4(), poId, prod, qty, status === 'received' ? qty : rnd(0, qty), price, qty * price);
      }
      db.prepare("UPDATE purchase_orders SET total_amount=? WHERE id=?").run(total, poId);
      poCount++;
    } catch(e) { /* skip */ }
  }
});
insertPOs();
console.log('  ✅ Purchase Orders:', poCount);

// === SALES ORDERS ===
let soCount = 0;
const insertSOs = db.transaction(() => {
  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset -= rnd(3, 10)) {
    const soId = uuidv4();
    const ref = `SO-${String(soCount + 1).padStart(5, '0')}`;
    const status = pick(['draft','confirmed','processing','shipped','delivered','delivered','cancelled']);
    try {
      db.prepare("INSERT INTO sales_orders (id, reference, customer_id, status, order_date, total_amount, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)").run(
        soId, ref, pick(contactIds), status, dateAgo(dayOffset), rnd(1000, 200000), pick(userIds), dateAgo(dayOffset));
      const lines = rnd(1, 3);
      let total = 0;
      for (let k = 0; k < lines; k++) {
        const prod = pick(productIds);
        const qty = rnd(1, 50);
        const price = rnd(100, 10000);
        total += qty * price;
        db.prepare("INSERT INTO sales_order_lines (id, sales_order_id, product_id, quantity, shipped_qty, unit_price, line_total) VALUES (?,?,?,?,?,?,?)").run(
          uuidv4(), soId, prod, qty, status === 'delivered' ? qty : 0, price, qty * price);
      }
      db.prepare("UPDATE sales_orders SET total_amount=? WHERE id=?").run(total, soId);
      soCount++;
    } catch(e) { /* skip */ }
  }
});
insertSOs();
console.log('  ✅ Sales Orders:', soCount);

console.log('\n✨ Seed complete!');
console.log(`  Products: ${productIds.length} | Operations: ${opCount} | POs: ${poCount} | SOs: ${soCount} | Alerts: ${alertCount}`);
console.log('\n🔑 Login: admin@coreinventory.com / admin123\n');
