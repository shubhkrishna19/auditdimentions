# 🚀 ZOHO DATA INTEGRATION - COMPLETE GUIDE & PRIMARY INSTRUCTION SET

**Version:** 2.0.0  
**Platform:** Zoho Catalyst + Zoho CRM Bulk Data Processor  
**Purpose:** Company-wide standard for ALL Zoho CRM integrations

---

## ⚠️ READ THIS FIRST - COMPANY STANDARD

**This is the PRIMARY and ONLY way to integrate data with Zoho CRM in our company.**

All developers and AI agents MUST:
1. ✅ Use this guide for ALL Zoho integrations
2. ✅ Follow the patterns documented here
3. ✅ Add new learnings back to this guide
4. ✅ Never create custom integration methods

**Why Bulk Data Processor?**
- ✅ **200,000 records** per call vs 200 with standard API
- ✅ **Automatic batching** and rate limiting
- ✅ **Asynchronous processing** - no timeouts
- ✅ **CSV/JSON support** - easy data handling
- ✅ **Pre-configured** with best practices
- ✅ **Serverless** on Catalyst - zero infrastructure

---

## 📚 Table of Contents

1. [Understanding the Tools](#understanding-the-tools)
2. [Setup & Installation](#setup--installation)
3. [How Bulk Data Processor Works](#how-it-works)
4. [Integration Architecture](#integration-architecture)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)
10. [Adding New Learnings](#adding-new-learnings)

---

## 🎯 Understanding the Tools

### **1. Zoho CRM Bulk Data Processor**

**What it is:**
- Pre-built Catalyst solution for large-scale CRM operations
- Handles read, process, write operations in bulk
- Built-in error handling and retry logic

**Key Components:**
- **Bulk Read API** - Fetch up to 200,000 records
- **Bulk Write API** - Write up to 25,000 records
- **Bulk File Upload** - Upload CSV files directly
- **Field Metadata API** - Auto-discover field names
- **Organization Data API** - Get CRM account details

**Perfect for:**
- Data cleansing (fixing dimension errors)
- Customer segmentation
- Lead scoring
- Mass updates (sync 319 products)
- Data migrations
- Automated audits

### **2. Zoho Catalyst Platform**

**What it is:**
- Serverless platform from Zoho
- Hosts our integration logic
- Provides Functions, Datastore, Cache, File Store

**Why we use it:**
- ✅ No server management
- ✅ Auto-scaling
- ✅ Built-in monitoring
- ✅ Direct CRM access

### **3. Our ZohoDataIntegrationModule**

**What it adds:**
- ✅ Checkpoint/Restore system
- ✅ Unit conversion (grams ↔ kg)
- ✅ Field mappings
- ✅ Company best practices
- ✅ Error handling patterns

---

## 🔧 Setup & Installation

### **Phase 1: Catalyst Setup**

#### **Step 1: Install Catalyst CLI**
```bash
npm install -g zoho-catalyst-cli
```

#### **Step 2: Login to Catalyst**
```bash
catalyst login
# Opens browser for Zoho login
```

#### **Step 3: Create Catalyst Project**
```bash
catalyst init

# Choose:
# - Project Type: Basic I/O Function
# - Runtime: Node.js 18
# - Project Name: zoho-data-integration
```

### **Phase 2: Install Bulk Data Processor**

#### **Step 1: Access Catalyst Console**
1. Go to https://console.catalyst.zoho.com
2. Select your project
3. Navigate to **Extensions** → **Catalyst CodeLib**

#### **Step 2: Install Bulk Processor**
1. Search for "Zoho CRM Bulk Data Processor"
2. Click **Install**
3. Processor will auto-configure:
   - Cron functions
   - Event listeners
   - File store folders
   - Datastore tables

#### **Step 3: Configure Credentials**
1. Go to Zoho API Console: https://api-console.zoho.com
2. Register Self-Client application:
   - **Client Name:** "Data Integration Module"
   - **Homepage URL:** Your Catalyst app URL
   - **Authorized Redirect URIs:** Catalyst callback URL
3. Note: **Client ID** and **Client Secret**
4. Add to Catalyst Environment Variables:
   ```
   ZOHO_CLIENT_ID=xxx
   ZOHO_CLIENT_SECRET=xxx
   ZOHO_REDIRECT_URI=xxx
   ```

### **Phase 3: Deploy Our Module**

#### **Step 1: Copy Module to Catalyst**
```bash
cd catalyst-project/functions
cp -r /path/to/ZohoDataIntegrationModule ./
```

#### **Step 2: Install Dependencies**
```bash
cd ZohoDataIntegrationModule
npm install
```

#### **Step 3: Deploy**
```bash
catalyst deploy
```

---

## ⚙️ How It Works

### **Bulk Read Flow (Fetching FROM Zoho)**

```
1. Trigger Bulk Read Request
   ├─> POST to Bulk Read API
   ├─> Specify: Module, Fields, Criteria
   └─> Receive: Job ID

2. Zoho Processes Request (Async)
   ├─> Query CRM database
   ├─> Extract up to 200,000 records
   └─> Generate CSV/JSON file

3. Download Result
   ├─> Check job status with Job ID
   ├─> When complete, get download URL
   └─> Download CSV/JSON file

4. Process Data (Our Module)
   ├─> Parse CSV/JSON
   ├─> Convert units (grams → kg)
   ├─> Map field names
   └─> Return to frontend

SPEED: 10,000 records in ~5-10 seconds
```

### **Bulk Write Flow (Sending TO Zoho)**

```
1. Prepare Data (Our Module)
   ├─> Validate data
   ├─> Convert units (kg → grams)
   ├─> Map to Zoho API names
   ├─> Create checkpoints
   └─> Generate CSV/JSON

2. Upload to Catalyst File Store
   ├─> Save CSV to temp folder
   └─> Get file ID

3. Trigger Bulk Write Request
   ├─> POST to Bulk Write API
   ├─> Attach file ID
   ├─> Specify: Module, Operation (insert/update)
   └─> Receive: Job ID

4. Zoho Processes Request (Async)
   ├─> Parse CSV
   ├─> Validate records
   ├─> Insert/Update in CRM
   └─> Generate result file

5. Check Results
   ├─> Poll job status
   ├─> Download result CSV
   ├─> Parse success/failure counts
   └─> Log errors

SPEED: 25,000 records in ~10-15 seconds
```

---

## 🏗️ Integration Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND (React App)                                          │
│  - Upload Excel                                                 │
│  - Trigger Sync                                                │
│  - View Results                                                │
│  - Restore Data                                                │
└──────────────────┬─────────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌────────────────────────────────────────────────────────────────┐
│  CATALYST SERVERLESS FUNCTIONS                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ZohoDataIntegrationModule (Our Custom Logic)            │ │
│  │  ├─ TransactionManager.js (Checkpoints)                  │ │
│  │  ├─ BulkProcessorAdapter.js (Wrapper)                    │ │
│  │  ├─ FieldMapper.js (Unit conversion)                     │ │
│  │  └─ ValidationEngine.js (Pre-sync checks)                │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │  Zoho CRM Bulk Data Processor (Pre-installed)            │ │
│  │  ├─ Bulk Read Handler                                    │ │
│  │  ├─ Bulk Write Handler                                   │ │
│  │  ├─ File Upload Handler                                  │ │
│  │  └─ Metadata Handler                                     │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │  Catalyst Datastore                                       │ │
│  │  ├─ Checkpoints Table (Rollback data)                    │ │
│  │  ├─ Job Status Table (Track sync progress)               │ │
│  │  └─ Cache Table (Fetched data)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────┬─────────────────────────────────────────────┘
                   │ Zoho CRM APIs
                   ▼
┌────────────────────────────────────────────────────────────────┐
│  ZOHO CRM (SINGLE SOURCE OF TRUTH)                             │
│  ├─ Parent_MTP_SKU Module                                      │
│  ├─ Products Module                                            │
│  ├─ Custom Fields                                              │
│  └─ Subforms                                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation

### **Use Case 1: Sync 319 Products with Dimensions & Weights**

#### **Step 1: Prepare Data**
```javascript
// In Catalyst Function: prepare-data.js
const prepareProductData = (excelData) => {
    return excelData.map(row => ({
        // Product identification
        Product_Code: row.SKU,
        
        // Weights in GRAMS (Zoho storage format)
        Billed_Physical_Weight: row.physicalWeightKg * 1000,
        Billed_Volumetric_Weight: row.volumetricWeightKg * 1000,
        Billed_Chargeable_Weight: Math.max(
            row.physicalWeightKg * 1000,
            row.volumetricWeightKg * 1000
        ),
        
        // Box dimensions subform
        Bill_Dimension_Weight: row.boxes.map(box => ({
            Box_Number: box.number,
            Length: box.length,
            Width: box.width,
            Height: box.height,
            Weight: box.weightKg * 1000, // Convert to grams
            Box_Measurement: 'cm',
            Weight_Measurement: 'Gram'
        })),
        
        // Category
        Weight_Category_Billed: calculateWeightCategory(
            Math.max(row.physicalWeightKg, row.volumetricWeightKg)
        )
    }));
};
```

#### **Step 2: Create Checkpoints**
```javascript
// Before sync, save current state
const createBulkCheckpoint = async (products) => {
    const checkpoint = {
        id: `CHK_${Date.now()}`,
        timestamp: new Date().toISOString(),
        productCount: products.length,
        products: []
    };
    
    // Fetch current state from Zoho
    for (const product of products) {
        const current = await bulkRead({
            module: 'Parent_MTP_SKU',
            criteria: `Product_Code:equals:${product.Product_Code}`
        });
        
        checkpoint.products.push({
            sku: product.Product_Code,
            before: current.data[0] // Original state
        });
    }
    
    // Save to Catalyst Datastore
    await catalystDatastore.insert('checkpoints', checkpoint);
    
    return checkpoint.id;
};
```

#### **Step 3: Trigger Bulk Write**
```javascript
// Catalyst Function: bulk-sync.js
module.exports = async (req, res) => {
    try {
        const { products } = req.body;
        
        // 1. Create checkpoint
        const checkpointId = await createBulkCheckpoint(products);
        console.log(`Checkpoint created: ${checkpointId}`);
        
        // 2. Prepare data
        const preparedData = prepareProductData(products);
        
        // 3. Convert to CSV
        const csv = convertToCSV(preparedData);
        
        // 4. Upload to File Store
        const fileId = await catalystFileStore.upload('temp', csv);
        
        // 5. Trigger Bulk Write
        const jobId = await bulkWrite({
            operation: 'update',
            module: 'Parent_MTP_SKU',
            file_id: fileId,
            callback_url: `${process.env.CATALYST_URL}/api/bulk-write-callback`
        });
        
        // 6. Return job details
        res.json({
            success: true,
            jobId: jobId,
            checkpointId: checkpointId,
            recordCount: products.length
        });
        
    } catch (error) {
        console.error('Bulk sync error:', error);
        res.status(500).json({ error: error.message });
    }
};
```

#### **Step 4: Monitor Job Status**
```javascript
// Catalyst Function: check-job-status.js
module.exports = async (req, res) => {
    const { jobId } = req.query;
    
    const status = await bulkReadJobDetails(jobId);
    
    res.json({
        jobId: jobId,
        state: status.state, // COMPLETED, FAILED, IN_PROGRESS
        totalRecords: status.total_count,
        processed: status.processed_count,
        failed: status.failed_count,
        downloadUrl: status.file_url // When complete
    });
};
```

#### **Step 5: Process Results**
```javascript
// Catalyst Function: process-results.js
module.exports = async (req, res) => {
    const { jobId } = req.body;
    
    // Download result CSV
    const resultCSV = await downloadFile(jobId);
    
    // Parse results
    const results = parseCSV(resultCSV);
    
    // Separate success/failure
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    
    // Log failures
    if (failed.length > 0) {
        console.error(`${failed.length} records failed:`, failed);
        // Store in datastore for review
        await catalystDatastore.insertMany('failed_syncs', failed);
    }
    
    res.json({
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        errors: failed.map(f => ({ sku: f.Product_Code, error: f.message }))
    });
};
```

---

## 📖 API Reference

### **1. Bulk Read API**

**Endpoint:** `https://www.zohoapis.com/crm/bulk/v2/read`

**Request:**
```json
{
  "query": {
    "module": "Parent_MTP_SKU",
    "fields": [
      "Product_Code",
      "Billed_Physical_Weight",
      "Billed_Chargeable_Weight"
    ],
    "criteria": "(Product_Code:starts_with:WA)",
    "page": 1
  }
}
```

**Response:**
```json
{
  "data": [{
    "id": "4150868000004381001",
    "status": "success",
    "operation": "read",
    "created_by": {...},
    "created_time": "2026-02-03T12:00:00+05:30",
    "state": "COMPLETED",
    "file": {
      "url": "https://download.zohoapis.com/v2/..."
    }
  }]
}
```

**Usage in Our Module:**
```javascript
const fetchAllProducts = async () => {
    const job = await bulkRead({
        module: 'Parent_MTP_SKU',
        fields: ['Product_Code', 'Billed_Physical_Weight'],
        criteria: null // All records
    });
    
    // Wait for completion
    const result = await pollJobStatus(job.id);
    
    // Download CSV
    const csvData = await downloadFile(result.file.url);
    
    // Parse and convert units
    return parseAndConvertWeights(csvData);
};
```

### **2. Bulk Write API**

**Endpoint:** `https://www.zohoapis.com/crm/bulk/v2/write`

**Request:**
```json
{
  "operation": "update",
  "resource": [{
    "type": "data",
    "module": "Parent_MTP_SKU",
    "file_id": "4150868000004395001",
    "find_by": "Product_Code",
    "field_mappings": [
      {"api_name": "Product_Code", "index": 0},
      {"api_name": "Billed_Physical_Weight", "index": 1}
    ]
  }]
}
```

**CSV Format:**
```csv
Product_Code,Billed_Physical_Weight
WA-PYS-N,1890
WA-PYT-N,1890
```

---

**(Continuing in next response...)**
