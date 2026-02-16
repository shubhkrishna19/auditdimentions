# Bluewud Dimensions Audit & Authenticator

A premium, enterprise-grade auditing tool built to synchronize and validate product physical dimensions across the Bluewud ecosystem. This tool connects directly to **Zoho CRM** to remediate master data and provides a professional interface for warehouse operators.

## 🚀 Vision
To provide a single point of truth for all product dimensions, eliminating billing variances between warehouse measurements and marketplace records (Amazon, Flipkart, etc.).

## ✨ Key Features
- **Real-time Zoho Sync**: Bidirectional synchronization with `Parent_MTP_SKU` and `Products` modules.
- **Smart Category Inference**: Automatically derives product categories (e.g., Seating, Storage) from SKU names.
- **Weight Slab Calculation**: Standardizes shipment weight categories for logistics optimization.
- **PWA Ready**: Installable on mobile devices with offline caching for warehouse environments.
- **Zoho CRM Integration**: Optimized for deployment as a Zoho CRM Web Tab or Widget.

## 🛠 Tech Stack
- **Frontend**: React 19 + Vite 7
- **Styling**: Vanilla CSS (Premium Zoho Aesthetic)
- **API**: Zoho CRM Embedded App SDK + MCP Orchestration
- **Data Integrity**: Unified Master Data Engine (XLSX -> JSON)

## 📁 Repository Structure
- `/src`: Core React application logic and components.
- `/public`: Static assets, PWA manifest, and Service Worker.
- `/scripts`: Orchestration and data cleanup scripts used for the initial production sync.
- `/docs`: Detailed audit reports, master plans, and implementation logs.

## 📦 Deployment Instructions

### 1. Build the App
```bash
npm install
npm run build
```

### 2. Prepare for Zoho CRM
1. Host the contents of the `dist` folder on a secure origin (Vercel, Zoho Catalyst, or AWS).
2. Go to **Zoho CRM Setup > Customization > Web Tabs**.
3. Create a new Tab named **Product Audit**.
4. Set the Type to **Web Tab** and paste your deployed URL.
5. In the Tab's Content-Security-Policy settings, ensure `frame-ancestors` includes `*.zoho.com`.

### 3. Environment Variables
Create a `.env.production` file:
```env
VITE_API_MODE=live
```

## 📊 Data Quality Status
As of the last production sync, the database maintains a **97.8% Data Quality Score**.
For details, see `docs/data_quality_report_FINAL.json`.

---
*Developed by Antigravity AI for Bluewud Concepts Pvt. Ltd.*
