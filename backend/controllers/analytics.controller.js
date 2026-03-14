const db = require('../config/db');

exports.getDeadStock = async (req, res) => {
  try {
    const { days = 30, threshold = 0 } = req.query;
    const pastDateStr = `-${days} days`;

    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.cost_price,
        (COALESCE(SUM(s.quantity), 0) * p.cost_price) as stock_value,
        (
          SELECT MAX(created_at) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out'
        ) as last_movement_date,
        (
          SELECT COUNT(*) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' 
          AND created_at >= datetime('now', ?)
        ) as movement_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING current_stock > 0 AND movement_count <= ?
      ORDER BY stock_value DESC
    `;

    const { rows: deadStockItems } = db.query(query, [pastDateStr, parseInt(threshold)]);

    // Calculate totals
    const total_dead_stock_items = deadStockItems.length;
    const total_dead_stock_value = deadStockItems.reduce((sum, item) => sum + item.stock_value, 0);

    // Get total inventory value for percentage calculation
    const valQuery = `
      SELECT SUM(s.quantity * p.cost_price) as total_inventory_value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = 1
    `;
    const { rows: valRows } = db.query(valQuery);
    const total_inventory_value = valRows[0]?.total_inventory_value || 0;
    
    let percentage_of_total_inventory = 0;
    if (total_inventory_value > 0) {
      percentage_of_total_inventory = ((total_dead_stock_value / total_inventory_value) * 100).toFixed(2);
    }

    // Add days_idle to items
    const now = new Date();
    const items = deadStockItems.map(item => {
      let days_idle = 'Never moved';
      if (item.last_movement_date) {
        const lastMove = new Date(item.last_movement_date);
        const diffTime = Math.abs(now - lastMove);
        days_idle = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return { ...item, days_idle };
    });

    res.json({
      summary: {
        total_dead_stock_items,
        total_dead_stock_value,
        total_inventory_value,
        percentage_of_total_inventory
      },
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dead stock analytics' });
  }
};

exports.getSlowMoving = async (req, res) => {
  try {
    const { days = 30, threshold = 5 } = req.query; // Items with 1-5 movements
    const pastDateStr = `-${days} days`;

    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.cost_price,
        (COALESCE(SUM(s.quantity), 0) * p.cost_price) as stock_value,
        (
          SELECT MAX(created_at) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out'
        ) as last_movement_date,
        (
          SELECT COUNT(*) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' 
          AND created_at >= datetime('now', ?)
        ) as movement_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING current_stock > 0 AND movement_count > 0 AND movement_count <= ?
      ORDER BY movement_count ASC, stock_value DESC
    `;

    const { rows: slowItems } = db.query(query, [pastDateStr, parseInt(threshold)]);

    const now = new Date();
    const items = slowItems.map(item => {
      let days_idle = 0;
      if (item.last_movement_date) {
        const lastMove = new Date(item.last_movement_date);
        const diffTime = Math.abs(now - lastMove);
        days_idle = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return { ...item, days_idle };
    });

    res.json({
      summary: {
        total_slow_items: items.length,
        total_slow_value: items.reduce((sum, item) => sum + item.stock_value, 0)
      },
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch slow moving analytics' });
  }
};

exports.getStockTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT 
        date(created_at) as trend_date,
        SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) as incoming,
        SUM(CASE WHEN movement_type = 'out' THEN ABS(quantity) ELSE 0 END) as outgoing,
        SUM(CASE WHEN movement_type = 'adjustment' THEN quantity ELSE 0 END) as adjustments
      FROM stock_ledger
      WHERE created_at >= datetime('now', ?)
      GROUP BY date(created_at)
      ORDER BY trend_date ASC
    `;
    const { rows } = db.query(query, [pastDateStr]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock trend' });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku,
        COUNT(sl.id) as movement_count,
        SUM(ABS(sl.quantity)) as total_qty_moved
      FROM products p
      JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE sl.created_at >= datetime('now', ?)
      GROUP BY p.id
      ORDER BY movement_count DESC
      LIMIT ?
    `;
    const { rows } = db.query(query, [pastDateStr, parseInt(limit)]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
};

exports.getWarehouseComparison = async (req, res) => {
  try {
    const query = `
      SELECT 
        w.name as warehouse_name,
        COUNT(DISTINCT p.id) as item_count,
        COALESCE(SUM(s.quantity * p.cost_price), 0) as stock_value
      FROM warehouses w
      LEFT JOIN locations l ON w.id = l.warehouse_id
      LEFT JOIN stock s ON l.id = s.location_id
      LEFT JOIN products p ON s.product_id = p.id
      GROUP BY w.id
    `;
    const { rows } = db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch warehouse comparison' });
  }
};

exports.getCategoryBreakdown = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as item_count,
        COALESCE(SUM(s.quantity * p.cost_price), 0) as stock_value
      FROM categories c
      JOIN products p ON c.id = p.category_id
      LEFT JOIN stock s ON p.id = s.product_id
      GROUP BY c.id
      ORDER BY stock_value DESC
    `;
    const { rows } = db.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
};

exports.getOperationStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT type, status, COUNT(*) as count 
      FROM operations
      WHERE created_at >= datetime('now', ?)
      GROUP BY type, status
    `;
    const { rows } = db.query(query, [pastDateStr]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch operation stats' });
  }
};

// ABC Classification - Pareto analysis based on revenue/movement value
exports.abcClassification = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku, c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.cost_price, p.selling_price,
        (COALESCE(SUM(s.quantity), 0) * p.cost_price) as stock_value,
        COALESCE((
          SELECT SUM(ABS(quantity)) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' AND created_at >= datetime('now', ?)
        ), 0) as total_sold,
        COALESCE((
          SELECT SUM(ABS(quantity) * p.selling_price) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' AND created_at >= datetime('now', ?)
        ), 0) as revenue
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY revenue DESC
    `;
    const { rows } = db.query(query, [pastDateStr, pastDateStr]);

    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    let cumulative = 0;
    const classified = rows.map(item => {
      cumulative += item.revenue;
      const cumPct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      let classification = 'C';
      if (cumPct <= 80) classification = 'A';
      else if (cumPct <= 95) classification = 'B';
      return { ...item, cumulative_pct: Math.round(cumPct * 100) / 100, classification };
    });

    const summary = {
      A: { count: classified.filter(i => i.classification === 'A').length, revenue: classified.filter(i => i.classification === 'A').reduce((s, i) => s + i.revenue, 0) },
      B: { count: classified.filter(i => i.classification === 'B').length, revenue: classified.filter(i => i.classification === 'B').reduce((s, i) => s + i.revenue, 0) },
      C: { count: classified.filter(i => i.classification === 'C').length, revenue: classified.filter(i => i.classification === 'C').reduce((s, i) => s + i.revenue, 0) },
      total_revenue: totalRevenue
    };
    res.json({ summary, items: classified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute ABC classification' });
  }
};

// Turnover Ratio - How fast inventory is sold and replaced
exports.turnoverRatio = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.cost_price,
        (COALESCE(SUM(s.quantity), 0) * p.cost_price) as stock_value,
        COALESCE((
          SELECT SUM(ABS(quantity) * p.cost_price) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' AND created_at >= datetime('now', ?)
        ), 0) as cogs
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING current_stock > 0
      ORDER BY cogs DESC
    `;
    const { rows } = db.query(query, [pastDateStr]);
    const items = rows.map(item => {
      const avgInventory = item.stock_value; // simplified: using current stock as avg
      const turnover = avgInventory > 0 ? item.cogs / avgInventory : 0;
      const daysInInventory = turnover > 0 ? Math.round(parseInt(days) / turnover) : 999;
      return { ...item, turnover_ratio: Math.round(turnover * 100) / 100, days_in_inventory: daysInInventory };
    });
    res.json(items.sort((a, b) => b.turnover_ratio - a.turnover_ratio));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute turnover ratio' });
  }
};

// Simple demand forecasting using moving average
exports.demandForecast = async (req, res) => {
  try {
    const { days = 90, forecast_days = 30 } = req.query;
    const pastDateStr = `-${days} days`;
    const query = `
      SELECT 
        p.id, p.name as product_name, p.sku,
        COALESCE(SUM(s.quantity), 0) as current_stock,
        p.reorder_point,
        COALESCE((
          SELECT SUM(ABS(quantity)) FROM stock_ledger 
          WHERE product_id = p.id AND movement_type = 'out' AND created_at >= datetime('now', ?)
        ), 0) as total_demand
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING current_stock > 0
    `;
    const { rows } = db.query(query, [pastDateStr]);
    const items = rows.map(item => {
      const dailyDemand = parseInt(days) > 0 ? item.total_demand / parseInt(days) : 0;
      const forecastDemand = Math.round(dailyDemand * parseInt(forecast_days));
      const daysOfStock = dailyDemand > 0 ? Math.round(item.current_stock / dailyDemand) : 999;
      const needsReorder = daysOfStock <= parseInt(forecast_days);
      const suggestedOrder = needsReorder ? Math.max(0, forecastDemand - item.current_stock) : 0;
      return { ...item, daily_demand: Math.round(dailyDemand * 100) / 100, forecast_demand: forecastDemand, days_of_stock: daysOfStock, needs_reorder: needsReorder, suggested_order: suggestedOrder };
    });
    res.json(items.sort((a, b) => a.days_of_stock - b.days_of_stock));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute demand forecast' });
  }
};
