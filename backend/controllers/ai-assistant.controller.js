const db = require('../config/db');

// Intent matching keywords
const INTENTS = {
  STOCK_QUERY: ['stock', 'quantity', 'how much', 'how many', 'check stock', 'inventory of', 'units of'],
  LOW_STOCK: ['low stock', 'running low', 'reorder', 'need to order', 'out of stock', 'shortage'],
  QUICK_RECEIPT: ['receive', 'receipt', 'incoming', 'restock', 'add stock'],
  QUICK_DELIVERY: ['ship', 'deliver', 'send', 'outgoing', 'dispatch'],
  SUMMARY: ['summary', 'report', 'overview', 'dashboard', "how's inventory", 'how is inventory', 'status of inventory'],
  SEARCH: ['find', 'search', 'where is', 'look for', 'locate'],
  RECENT: ['recent', 'happened', 'activity', 'last operations', 'today', 'history', 'latest'],
  SUGGESTIONS: ['suggest', 'should i', 'recommend', 'action', 'what next', 'priority', 'todo']
};

function detectIntent(msg) {
  const m = msg.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (keywords.some(k => m.includes(k))) return intent;
  }
  return 'FALLBACK';
}

function extractProductHint(msg, products) {
  const m = msg.toLowerCase();
  for (const p of products) {
    if (m.includes(p.name.toLowerCase()) || m.includes(p.sku.toLowerCase())) return p;
  }
  return null;
}

function extractNumber(msg) {
  const match = msg.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const intent = detectIntent(message);

    // Pre-fetch product list for matching
    const { rows: products } = await db.query('SELECT id, name, sku, unit_of_measure, cost_price, reorder_point FROM products WHERE is_active = true ORDER BY name');

    let reply = '';
    let actions = [];

    switch (intent) {
      case 'STOCK_QUERY': {
        const product = extractProductHint(message, products);
        if (product) {
          const { rows: stockRows } = await db.query(
            `SELECT s.quantity, l.name as loc_name, w.name as wh_name
             FROM stock s JOIN locations l ON s.location_id = l.id JOIN warehouses w ON l.warehouse_id = w.id
             WHERE s.product_id = $1 AND s.quantity > 0`, [product.id]);
          const total = stockRows.reduce((sum, r) => sum + r.quantity, 0);
          const locs = stockRows.map(r => `  • ${r.wh_name} → ${r.loc_name}: ${r.quantity} ${product.unit_of_measure}`).join('\n');
          const status = total === 0 ? '🔴 OUT OF STOCK' : total <= (product.reorder_point || 0) ? '🟡 LOW STOCK' : '🟢 In Stock';
          reply = `📦 **${product.name}** (${product.sku})\n\n**Total:** ${total} ${product.unit_of_measure}\n**Status:** ${status}\n\n**Locations:**\n${locs || '  No stock found'}`;
        } else {
          reply = '🔍 I couldn\'t identify the product. Could you specify the product name or SKU? For example: "Check stock for Steel Rods"';
        }
        break;
      }
      case 'LOW_STOCK': {
        const { rows } = await db.query(
          `SELECT p.name, p.sku, p.reorder_point, p.unit_of_measure, COALESCE(SUM(s.quantity), 0) as total
           FROM products p LEFT JOIN stock s ON p.id = s.product_id
           WHERE p.is_active = true GROUP BY p.id, p.name, p.sku, p.reorder_point, p.unit_of_measure HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_point ORDER BY total ASC LIMIT 10`);
        if (rows.length === 0) {
          reply = '✅ Great news! No items are currently below their reorder points.';
        } else {
          const items = rows.map((r, i) => {
            const icon = r.total === 0 ? '🔴' : '🟡';
            return `${i + 1}. ${icon} **${r.name}** — ${r.total} ${r.unit_of_measure} left (reorder at ${r.reorder_point})`;
          }).join('\n');
          reply = `⚠️ **${rows.length} items need attention:**\n\n${items}\n\n💡 Shall I help you create a receipt to restock?`;
          actions = [{ type: 'navigate', label: '📦 Create Receipt', path: '/receipts/new' }];
        }
        break;
      }
      case 'QUICK_RECEIPT': {
        const product = extractProductHint(message, products);
        const qty = extractNumber(message);
        if (product) {
          reply = `📥 I'll help you receive **${qty || '___'} ${product.name}**.\n\nClick below to create a pre-filled receipt:`;
          actions = [{ type: 'navigate', label: `📦 Receive ${product.name}`, path: '/receipts/new' }];
        } else {
          reply = '📥 Sure! To create a receipt, tell me the product and quantity.\n\nExample: "Receive 50 Steel Rods"';
          actions = [{ type: 'navigate', label: '📦 New Receipt', path: '/receipts/new' }];
        }
        break;
      }
      case 'QUICK_DELIVERY': {
        const product = extractProductHint(message, products);
        const qty = extractNumber(message);
        if (product) {
          reply = `📤 I'll help you ship **${qty || '___'} ${product.name}**.\n\nClick below to create a delivery:`;
          actions = [{ type: 'navigate', label: `🚚 Ship ${product.name}`, path: '/deliveries/new' }];
        } else {
          reply = '📤 To create a delivery, specify the product and quantity.\n\nExample: "Ship 10 Wooden Chairs"';
          actions = [{ type: 'navigate', label: '🚚 New Delivery', path: '/deliveries/new' }];
        }
        break;
      }
      case 'SUMMARY': {
        const { rows: [stats] } = await db.query(
          `SELECT (SELECT COUNT(*) FROM products WHERE is_active=true) as total_products,
                  (SELECT COALESCE(SUM(s.quantity),0) FROM stock s) as total_stock,
                  (SELECT COUNT(*) FROM products p LEFT JOIN (SELECT product_id, SUM(quantity) as qty FROM stock GROUP BY product_id) st ON p.id=st.product_id WHERE p.is_active=true AND COALESCE(st.qty,0)<=p.reorder_point) as low_stock,
                  (SELECT COUNT(*) FROM products p LEFT JOIN (SELECT product_id, SUM(quantity) as qty FROM stock GROUP BY product_id) st ON p.id=st.product_id WHERE p.is_active=true AND COALESCE(st.qty,0)=0) as out_of_stock,
                  (SELECT COALESCE(SUM(s.quantity * p.cost_price),0) FROM stock s JOIN products p ON s.product_id=p.id) as total_value,
                  (SELECT COUNT(*) FROM operations WHERE status='draft' OR status='waiting' OR status='ready') as pending_ops`);
        reply = `📊 **Inventory Summary**\n\n• **${stats.total_products}** products tracked\n• **${parseInt(stats.total_stock).toLocaleString()}** total units in stock\n• **₹${parseInt(stats.total_value).toLocaleString()}** total stock value\n• **${stats.low_stock}** low stock alerts\n• **${stats.out_of_stock}** out of stock\n• **${stats.pending_ops}** pending operations\n\n${parseInt(stats.low_stock) > 0 ? '⚠️ Some items need restocking!' : '✅ All stock levels are healthy.'}`;
        break;
      }
      case 'SEARCH': {
        const product = extractProductHint(message, products);
        if (product) {
          const { rows: stockRows } = await db.query(`SELECT COALESCE(SUM(quantity),0) as total FROM stock WHERE product_id=$1`, [product.id]);
          const total = stockRows[0].total;
          reply = `🔎 Found: **${product.name}**\n\n• SKU: ${product.sku}\n• Unit: ${product.unit_of_measure}\n• Cost: ₹${product.cost_price}\n• Stock: ${total} units\n• Reorder Point: ${product.reorder_point}`;
        } else {
          const hint = message.toLowerCase().replace(/find|search|look for|where is|locate/g, '').trim();
          if (hint) {
            const { rows: matches } = await db.query(`SELECT name, sku FROM products WHERE is_active=true AND (LOWER(name) LIKE $1 OR LOWER(sku) LIKE $1) LIMIT 5`, [`%${hint}%`]);
            if (matches.length) {
              reply = `🔎 Products matching "${hint}":\n\n` + matches.map(m => `• **${m.name}** (${m.sku})`).join('\n');
            } else {
              reply = `🔎 No products found matching "${hint}". Try a different keyword.`;
            }
          } else {
            reply = '🔎 What product are you looking for? Try: "Find Steel Rods" or "Search SKU CHR-001"';
          }
        }
        break;
      }
      case 'RECENT': {
        const { rows: moves } = await db.query(
          `SELECT sl.created_at, sl.movement_type, sl.quantity, p.name as product, sl.reference
           FROM stock_ledger sl JOIN products p ON sl.product_id = p.id
           ORDER BY sl.created_at DESC LIMIT 5`);
        if (moves.length === 0) {
          reply = '📋 No recent activity found.';
        } else {
          const items = moves.map(m => {
            const icon = m.movement_type === 'in' ? '📥' : m.movement_type === 'out' ? '📤' : '🔄';
            const ago = getTimeAgo(m.created_at);
            return `${icon} **${m.product}** — ${m.movement_type === 'in' ? '+' : ''}${m.quantity} (${m.reference || 'Manual'}) · ${ago}`;
          }).join('\n');
          reply = `📋 **Recent Activity:**\n\n${items}`;
        }
        break;
      }
      case 'SUGGESTIONS': {
        const suggestions = [];
        const { rows: lowStock } = await db.query(
          `SELECT p.name, COALESCE(SUM(s.quantity),0) as qty FROM products p LEFT JOIN stock s ON p.id=s.product_id WHERE p.is_active=true GROUP BY p.id, p.name, p.reorder_point HAVING COALESCE(SUM(s.quantity),0) <= p.reorder_point LIMIT 3`);
        lowStock.forEach(r => suggestions.push(`🔴 **Restock ${r.name}** — only ${r.qty} left`));
        const { rows: pendingOps } = await db.query(`SELECT reference, type, status FROM operations WHERE status IN ('draft','waiting','ready') ORDER BY created_at ASC LIMIT 3`);
        pendingOps.forEach(r => suggestions.push(`🟡 Process **${r.reference}** (${r.type}, ${r.status})`));
        const { rows: deadStock } = await db.query(
          `SELECT p.name FROM products p JOIN stock s ON p.id=s.product_id LEFT JOIN stock_ledger lg ON p.id=lg.product_id AND lg.created_at > datetime('now', '-30 days') WHERE s.quantity > 0 GROUP BY p.id, p.name HAVING COUNT(lg.id)=0 LIMIT 3`);
        deadStock.forEach(r => suggestions.push(`🟢 Review **${r.name}** — no movement in 30 days`));
        if (suggestions.length === 0) {
          reply = '🎯 Everything looks great! No urgent actions needed right now.';
        } else {
          reply = `🎯 **Recommended Actions:**\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        }
        break;
      }
      default:
        reply = `👋 I can help you with:\n\n• **Check stock** — "How much Steel Rods do we have?"\n• **Low stock alerts** — "What's running low?"\n• **Create operations** — "Receive 50 Steel Rods"\n• **Daily summary** — "Give me a summary"\n• **Search products** — "Find SKU CHR-001"\n• **Recent activity** — "What happened today?"\n• **Suggestions** — "What should I do?"\n\nWhat would you like to know?`;
    }

    res.json({ reply, actions, intent });
  } catch (err) {
    console.error('AI Assistant Error:', err);
    res.status(500).json({ error: 'Assistant encountered an error' });
  }
};

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
