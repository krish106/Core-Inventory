require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initSchema } = require('./setup');

// Initialize database tables
initSchema();

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/warehouses', require('./routes/warehouse.routes'));
app.use('/api/v1/locations', require('./routes/location.routes'));
app.use('/api/v1/operations', require('./routes/operation.routes'));
app.use('/api/v1/stock', require('./routes/stock.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/api/v1/alerts', require('./routes/alert.routes'));
app.use('/api/v1/reports', require('./routes/report.routes'));
app.use('/api/v1/analytics', require('./routes/analytics.routes'));
app.use('/api/v1/barcode', require('./routes/barcode.routes'));
app.use('/api/v1/purchase-orders', require('./routes/purchaseOrder.routes'));
app.use('/api/v1/returns', require('./routes/return.routes'));
app.use('/api/v1/batches', require('./routes/batch.routes'));
app.use('/api/v1/cycle-counts', require('./routes/cycleCount.routes'));
app.use('/api/v1/sales-orders', require('./routes/salesOrder.routes'));
app.use('/api/v1/unit-conversions', require('./routes/unitConversion.routes'));
app.use('/api/v1/assistant', require('./routes/assistant.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CoreInventory server running on port ${PORT}`);
});
