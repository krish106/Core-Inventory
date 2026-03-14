# CoreInventory 📦

A modern, full-stack **Inventory Management System** built for the hackathon challenge. CoreInventory replaces manual registers, Excel sheets, and scattered tracking methods with a centralized, real-time, easy-to-use web application.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Tech](https://img.shields.io/badge/React-Vite-blue) ![Backend](https://img.shields.io/badge/Node.js-Express-green) ![DB](https://img.shields.io/badge/SQLite-Database-orange)

---

## 🚀 Features

### Core Modules
- **📊 Dashboard** — Real-time KPIs (stock levels, low stock alerts, pending operations), interactive charts (stock trends, category breakdown, warehouse comparison), and dynamic filters by document type, status, warehouse, and category
- **📦 Product Management** — Create/edit products with SKU, category, unit of measure, cost & selling price, reorder points, and barcode support
- **📥 Receipts** — Receive incoming goods from vendors, validate to auto-increase stock
- **📤 Deliveries** — Ship outgoing goods to customers, validate to auto-decrease stock
- **🔄 Internal Transfers** — Move inventory between warehouses and locations with full audit trail
- **⚖️ Stock Adjustments** — Physical count reconciliation with automatic stock correction
- **📜 Move History** — Complete stock ledger with every movement logged

### Advanced Features
- **🤖 AI Assistant** — Chat-based inventory assistant with real-time data queries (stock checks, low stock alerts, summaries, product search)
- **🎙️ Voice Commands** — Navigate and perform operations using voice (Web Speech API)
- **🌗 Dark Mode** — Beautiful dark theme across all pages
- **📊 Analytics** — Dead stock analysis, turnover rates, category insights, warehouse comparisons
- **📄 Export** — Download reports as PDF or Excel
- **🔔 Smart Alerts** — Automated low stock and out-of-stock notifications
- **🏭 Multi-Warehouse** — Support for multiple warehouses with location-level tracking
- **🛒 Purchase Orders** — Full PO lifecycle management
- **🛍️ Sales Orders** — Order-to-delivery tracking
- **↩️ Returns** — Customer and supplier return handling
- **🔢 Batch Tracking** — Track batches with manufacture/expiry dates
- **📋 Cycle Counts** — Planned inventory counting workflows

### Authentication
- Email/Password login
- OTP-based login (6-digit code)
- Password reset via OTP
- New account registration

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | SQLite (better-sqlite3) |
| **Auth** | JWT, bcryptjs, OTP |
| **Export** | PDFKit, ExcelJS |

---

## 📁 Project Structure

```
CoreInventory/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic (18 controllers)
│   ├── middleware/       # Auth middleware
│   ├── routes/          # API routes (18 route files)
│   ├── setup.js         # Database schema initialization
│   ├── seed-data.js     # Sample data generator
│   └── server.js        # Express server entry point
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── api/         # Axios configuration
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # Auth context
│   │   ├── hooks/       # Custom hooks (dark mode, voice, socket)
│   │   └── pages/       # 27 page components
│   ├── index.html
│   └── vite.config.js
├── start.bat            # One-click launcher (Windows)
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/krish106/Hackathon-Core-Inventory.git
cd Hackathon-Core-Inventory

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

**Option 1: One-click start (Windows)**
```bash
# From the project root
start.bat
```

**Option 2: Manual start**
```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### Seeding Sample Data (Optional)

```bash
cd backend
node seed-data.js
```
This generates **2 years of realistic inventory data** including 50 products, 4 warehouses, 420+ operations, purchase orders, sales orders, and alerts.

---

## 🔑 Default Login

| Email | Password |
|-------|----------|
| `admin@coreinventory.com` | `admin123` |

---


## 🔌 API Endpoints

| Module | Endpoints |
|--------|----------|
| Auth | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/login-otp`, `POST /api/v1/auth/request-otp` |
| Products | `GET/POST /api/v1/products`, `GET/PUT/DELETE /api/v1/products/:id` |
| Operations | `GET/POST /api/v1/operations`, `POST /api/v1/operations/:id/validate` |
| Stock | `GET /api/v1/stock`, `GET /api/v1/stock/product/:id` |
| Dashboard | `GET /api/v1/dashboard/kpis`, `GET /api/v1/dashboard/reorder-suggestions` |
| Analytics | `GET /api/v1/analytics/stock-trend`, `GET /api/v1/analytics/category-breakdown` |
| AI Assistant | `POST /api/v1/assistant/chat` |
| Reports | `GET /api/v1/reports/stock`, `GET /api/v1/reports/movements` |

---

## 👥 Team

- **Krish** — Full Stack Developer
- **Shrey Rabadiya** — Full Stack Developer
- **Shruti Babariya** — Full Stack Developer
- **Makati Vruti** — Full Stack Developer

---

## 📄 License

This project was built for the hackathon challenge. All rights reserved.
