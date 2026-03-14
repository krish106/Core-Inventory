const db = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// --- Helper Functions for Excel and PDF ---

const sendExcel = async (res, filename, sheetName, columns, data) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15
  }));

  // Style headers
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  // Add Data
  sheet.addRows(data);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  await workbook.xlsx.write(res);
  res.end();
};

const sendPDF = (res, filename, title, columns, data) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header Title
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#2563EB').text('CoreInventory', { align: 'center' });
  doc.fontSize(12).fillColor('#333333').text(title, { align: 'center' });
  doc.fontSize(9).fillColor('#666666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' }).moveDown(1.5);
  doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).strokeColor('#e5e7eb').stroke();
  doc.moveDown(0.5);

  const startX = 30;
  let currentY = doc.y;

  const usableWidth = doc.page.width - 60; 
  const defaultWidth = usableWidth / columns.length;
  
  // Table Header
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af');
  let currentX = startX;
  columns.forEach(col => {
    doc.text(col.header, currentX, currentY, { width: col.width || defaultWidth, align: col.align || 'left' });
    currentX += col.width || defaultWidth;
  });
  
  currentY += 15;
  doc.moveTo(startX, currentY).lineTo(doc.page.width - 30, currentY).strokeColor('#93c5fd').stroke();
  currentY += 5;

  // Table Data
  doc.font('Helvetica').fillColor('#374151');
  data.forEach((row, i) => {
    if (currentY > doc.page.height - 60) {
      doc.addPage();
      currentY = 30;
      // Footer on previous page
    }
    
    // Alternate row shading
    if (i % 2 === 0) {
      doc.save().rect(startX, currentY - 2, usableWidth, 15).fillColor('#f9fafb').fill().restore();
      doc.fillColor('#374151');
    }

    currentX = startX;
    columns.forEach(col => {
      let val = row[col.key];
      if (val === null || val === undefined) val = '-';
      doc.fontSize(8).text(String(val), currentX, currentY, { width: col.width || defaultWidth, align: col.align || 'left' });
      currentX += col.width || defaultWidth;
    });
    currentY += 15;
  });

  // Footer
  doc.fontSize(7).fillColor('#9ca3af');
  doc.text('CoreInventory — Confidential', 30, doc.page.height - 30, { align: 'left' });
  doc.text(`Page 1`, doc.page.width - 100, doc.page.height - 30, { align: 'right' });

  doc.end();
};

// --- Report Endpoints ---

exports.getStockReport = async (req, res) => {
  try {
    const { format = 'pdf', warehouse_id } = req.query;

    let query = `
      SELECT 
        p.name as product_name, p.sku, c.name as category_name, p.unit_of_measure as unit,
        COALESCE(SUM(sl.quantity), 0) as on_hand,
        p.cost_price,
        (COALESCE(SUM(sl.quantity), 0) * p.cost_price) as stock_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
    `;
    let params = [];
    let paramIdx = 1;
    if (warehouse_id) {
      query += ` LEFT JOIN locations l ON sl.location_id = l.id WHERE l.warehouse_id = $${paramIdx++} AND p.is_active = true `;
      params.push(warehouse_id);
    } else {
      query += ` WHERE p.is_active = true `;
    }
    query += ` GROUP BY p.id, p.name, p.sku, c.name, p.unit_of_measure, p.cost_price ORDER BY p.name ASC`;
    
    const { rows: products } = await db.query(query, params);

    const filename = `stock-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

    if (format === 'excel') {
      const cols = [
        { header: 'Product', key: 'product_name', width: 25 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Category', key: 'category_name', width: 15 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'On Hand', key: 'on_hand', width: 10 },
        { header: 'Unit Cost (₹)', key: 'cost_price', width: 12 },
        { header: 'Stock Value (₹)', key: 'stock_value', width: 15 }
      ];
      await sendExcel(res, filename, 'Stock Report', cols, products);
    } else {
      const cols = [
        { header: 'Product', key: 'product_name', width: 150 },
        { header: 'SKU', key: 'sku', width: 80 },
        { header: 'On Hand', key: 'on_hand', width: 70, align: 'right' },
        { header: 'Cost (₹)', key: 'cost_price', width: 70, align: 'right' },
        { header: 'Value (₹)', key: 'stock_value', width: 80, align: 'right' }
      ];
      sendPDF(res, filename, 'Stock Overview Report', cols, products);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate stock report' });
  }
};

exports.getMovementReport = async (req, res) => {
  try {
    const { format = 'excel', start_date, end_date } = req.query;

    let query = `
      SELECT 
        sl.created_at, sl.movement_type as type, p.name as product_name, p.sku,
        l.name as location_name, w.name as warehouse_name,
        sl.quantity, sl.balance_after as balance, sl.reference, u.name as performed_by
      FROM stock_ledger sl
      JOIN products p ON sl.product_id = p.id
      JOIN locations l ON sl.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON sl.performed_by = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramIdx = 1;
    if (start_date) { query += ` AND date(sl.created_at) >= $${paramIdx++}`; params.push(start_date); }
    if (end_date) { query += ` AND date(sl.created_at) <= $${paramIdx++}`; params.push(end_date); }
    query += ` ORDER BY sl.created_at DESC LIMIT 5000`;
    
    const { rows: dbRows } = await db.query(query, params);
    const rows = dbRows.map(r => ({ ...r, date: new Date(r.created_at).toLocaleString() }));
    const filename = `movements-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

    if (format === 'excel') {
      const cols = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Warehouse', key: 'warehouse_name', width: 20 },
        { header: 'Location', key: 'location_name', width: 15 },
        { header: 'Qty', key: 'quantity', width: 10 },
        { header: 'Balance', key: 'balance', width: 10 },
        { header: 'Reference', key: 'reference', width: 15 },
        { header: 'By', key: 'performed_by', width: 15 }
      ];
      await sendExcel(res, filename, 'Movements', cols, rows);
    } else {
      const cols = [
        { header: 'Date', key: 'date', width: 100 },
        { header: 'Type', key: 'type', width: 40 },
        { header: 'Product', key: 'product_name', width: 120 },
        { header: 'Qty', key: 'quantity', width: 50, align: 'right' },
        { header: 'Balance', key: 'balance', width: 50, align: 'right' },
        { header: 'Ref', key: 'reference', width: 80 }
      ];
      sendPDF(res, filename, 'Movement History Report', cols, rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate movement report' });
  }
};

exports.getValuationReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;

    let query = `
      SELECT 
        p.name as product_name, p.sku, 
        COALESCE(SUM(sl.quantity), 0) as total_qty,
        p.cost_price,
        (COALESCE(SUM(sl.quantity), 0) * p.cost_price) as total_value
      FROM products p
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.cost_price
      HAVING COALESCE(SUM(sl.quantity), 0) > 0 ORDER BY total_value DESC
    `;
    
    const { rows } = await db.query(query);
    const filename = `valuation-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

    if (format === 'excel') {
      const cols = [
        { header: 'Product', key: 'product_name', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Quantity', key: 'total_qty', width: 15 },
        { header: 'Unit Cost (₹)', key: 'cost_price', width: 15 },
        { header: 'Total Value (₹)', key: 'total_value', width: 20 }
      ];
      await sendExcel(res, filename, 'Inventory Valuation', cols, rows);
    } else {
      const cols = [
        { header: 'Product', key: 'product_name', width: 220 },
        { header: 'SKU', key: 'sku', width: 90 },
        { header: 'Qty', key: 'total_qty', width: 60, align: 'right' },
        { header: 'Cost (₹)', key: 'cost_price', width: 60, align: 'right' },
        { header: 'Total Value (₹)', key: 'total_value', width: 90, align: 'right' }
      ];
      sendPDF(res, filename, 'Inventory Valuation Report', cols, rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate valuation report' });
  }
};
