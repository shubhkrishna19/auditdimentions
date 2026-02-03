# 🚀 QUICK START: Sync Your First 319 Products

**Goal:** Get data from Excel → Zoho CRM using Bulk Data Processor in 30 minutes

---

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] Zoho CRM account with admin access
- [ ] Zoho Catalyst account (free tier works)
- [ ] Node.js installed (v18+)
- [ ] Excel file: `DimensionsMasterLatest.xlsx`
- [ ] Fields created in Zoho CRM Parent_MTP_SKU module

---

## 🎯 Phase 1: Install Bulk Data Processor (10 min)

### **Step 1: Access Catalyst Console**
```
1. Go to: https://console.catalyst.zoho.com
2. Click "Sign In" (use your Zoho credentials)
3. Click "Create Project"
   - Choose: Basic I/O Function
   - Runtime: Node.js 18
   - Name: "data-integration"
```

### **Step 2: Install Bulk Processor Extension**
```
1. In Catalyst Console → Left menu → "Extensions"
2. Search: "Zoho CRM Bulk Data Processor"
3. Click "Install"
4. Wait for auto-configuration (~2 min)
5. You'll see:
   ✅ Functions created
   ✅ Datastore tables created
   ✅ File store folders created
```

### **Step 3: Configure CRM Credentials**
```
1. Go to: https://api-console.zoho.com
2. Click "Add Client" → "Self Client"
3. Note:
   - Client ID: (copy this)
   - Client Secret: (copy this)
4. Back in Catalyst → Settings → Environment Variables
5. Add:
   Key: ZOHO_CLIENT_ID | Value: (paste)
   Key: ZOHO_CLIENT_SECRET | Value: (paste)
```

---

## 🔧 Phase 2: Deploy Our Module (10 min)

### **Step 1: Get the Code**
```bash
# Clone or download ZohoDataIntegrationModule
cd catalyst-project/functions
git clone <your-repo>/ZohoDataIntegrationModule
```

### **Step 2: Create Sync Function**
```bash
# Create new function
cd functions
mkdir bulk-sync-products
cd bulk-sync-products
npm init -y
npm install

# (Code provided in next step)
```

### **Step 3: Copy Handler Code**

**File:** `functions/bulk-sync-products/index.js`
```javascript
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    try {
        const app = catalyst.initialize(req);
        
        // Get products from request
        const { products } = req.body;
        console.log(`[BulkSync] Processing ${products.length} products...`);
        
        // Prepare CSV data
        const csvRows = products.map(p => 
            `"${p.Product_Code}",${p.Billed_Physical_Weight},${p.Billed_Chargeable_Weight}`
        );
        
        const csvContent = [
            'Product_Code,Billed_Physical_Weight,Billed_Chargeable_Weight',
            ...csvRows
        ].join('\n');
        
        // Upload to File Store
        const filestore = app.filestore();
        const folder = filestore.folder(process.env.TEMP_FOLDER_ID);
        const file = await folder.uploadFile({
            code: Buffer.from(csvContent),
            name: `products_${Date.now()}.csv`
        });
        
        console.log(`[BulkSync] File uploaded: ${file.id}`);
        
        // Trigger Bulk Write
        const conn = app.connection();
        const bulkWrite = await conn.request({
            method: 'POST',
            url: 'https://www.zohoapis.com/crm/bulk/v2/write',
            headers: {
                'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
            },
            body: {
                operation: 'update',
                resource: [{
                    type: 'data',
                    module: 'Parent_MTP_SKU',
                    file_id: file.id,
                    find_by: 'Product_Code',
                    field_mappings: [
                        { api_name: 'Product_Code', index: 0 },
                        { api_name: 'Billed_Physical_Weight', index: 1 },
                        { api_name: 'Billed_Chargeable_Weight', index: 2 }
                    ]
                }]
            }
        });
        
        const jobId = bulkWrite.data[0].details.id;
        console.log(`[BulkSync] Job started: ${jobId}`);
        
        res.json({
            success: true,
            jobId: jobId,
            recordCount: products.length,
            message: `Syncing ${products.length} products...`
        });
        
    } catch (error) {
        console.error('[BulkSync] Error:', error);
        res.status(500).json({ error: error.message });
    }
};
```

### **Step 4: Deploy**
```bash
# From project root
catalyst deploy
```

---

## 📤 Phase 3: Run Your First Sync (10 min)

### **Step 1: Test with Postman/Thunder Client**

**Request:**
```
POST https://data-integration-xxx.catalyst.zoho.com/server/bulk-sync-products
Content-Type: application/json

{
  "products": [
    {
      "Product_Code": "WA-PYS-N",
      "Billed_Physical_Weight": 1890,
      "Billed_Chargeable_Weight": 1890
    },
    {
      "Product_Code": "WA-PYT-N",
      "Billed_Physical_Weight": 1890,
      "Billed_Chargeable_Weight": 1890
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "jobId": "4150868000004395001",
  "recordCount": 2,
  "message": "Syncing 2 products..."
}
```

### **Step 2: Check Job Status**

**Create status checker function:**

**File:** `functions/check-job/index.js`
```javascript
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    const app = catalyst.initialize(req);
    const { jobId } = req.query;
    
    const conn = app.connection();
    const status = await conn.request({
        method: 'GET',
        url: `https://www.zohoapis.com/crm/bulk/v2/write/${jobId}`,
        headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
        }
    });
    
    res.json(status.data[0]);
};
```

**Check status:**
```
GET https://data-integration-xxx.catalyst.zoho.com/server/check-job?jobId=4150868000004395001
```

**Response:**
```json
{
  "status": "COMPLETED",
  "total_count": 2,
  "processed_count": 2,
  "failed_count": 0,
  "file": {
    "url": "https://download..." // Result CSV
  }
}
```

### **Step 3: Verify in Zoho CRM**
```
1. Open Zoho CRM
2. Go to Parent_MTP_SKU module
3. Search for "WA-PYS-N"
4. Check fields:
   ✅ Billed Physical Weight = 1.890 kg (displayed)
   ✅ (Stored as 1890 grams internally)
```

---

## 🎉 Success! Now Scale It

### **Sync All 319 Products:**

**File:** `sync-all-products.js` (local script)
```javascript
const axios = require('axios');
const XLSX = require('xlsx');

const CATALYST_URL = 'https://data-integration-xxx.catalyst.zoho.com';

async function syncAllProducts() {
    // Read Excel
    const wb = XLSX.readFile('./DimensionsMasterLatest.xlsx');
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    
    // Transform to Zoho format
    const products = rows.map(row => ({
        Product_Code: row['SKU'],
        Billed_Physical_Weight: parseFloat(row['Physical Weight (grams)']),
        Billed_Chargeable_Weight: Math.max(
            parseFloat(row['Physical Weight (grams)']),
            parseFloat(row['Volumetric Weight (grams)'])
        )
    }));
    
    console.log(`Syncing ${products.length} products...`);
    
    // Send to Catalyst
    const response = await axios.post(
        `${CATALYST_URL}/server/bulk-sync-products`,
        { products }
    );
    
    console.log('Job ID:', response.data.jobId);
    
    // Poll status
    let complete = false;
    while (!complete) {
        await new Promise(r => setTimeout(r, 5000)); // Wait 5 sec
        
        const status = await axios.get(
            `${CATALYST_URL}/server/check-job?jobId=${response.data.jobId}`
        );
        
        console.log(`Status: ${status.data.status} | Processed: ${status.data.processed_count}/${status.data.total_count}`);
        
        if (status.data.status === 'COMPLETED') {
            complete = true;
            console.log('✅ Sync complete!');
            console.log(`Success: ${status.data.total_count - status.data.failed_count}`);
            console.log(`Failed: ${status.data.failed_count}`);
        }
    }
}

syncAllProducts().catch(console.error);
```

**Run it:**
```bash
node sync-all-products.js
```

---

## 🔄 Enable Bidirectional Sync

### **Fetch Data FROM Zoho:**

**File:** `functions/bulk-fetch/index.js`
```javascript
module.exports = async (req, res) => {
    const app = catalyst.initialize(req);
    const conn = app.connection();
    
    // Trigger Bulk Read
    const bulkRead = await conn.request({
        method: 'POST',
        url: 'https://www.zohoapis.com/crm/bulk/v2/read',
        headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
        },
        body: {
            query: {
                module: 'Parent_MTP_SKU',
                fields: [
                    'Product_Code',
                    'Billed_Physical_Weight',
                    'Billed_Volumetric_Weight',
                    'Billed_Chargeable_Weight'
                ]
            }
        }
    });
    
    const jobId = bulkRead.data[0].details.id;
    
    // Poll until complete
    // Download CSV
    // Parse and return JSON
    
    res.json({
        jobId: jobId,
        message: 'Fetching products from Zoho...'
    });
};
```

---

## ✅ Verification Checklist

After sync, verify:

- [ ] All 319 products show in Zoho CRM
- [ ] Weights are correct (in kg when displayed)
- [ ] Box dimensions populated (if included)
- [ ] Weight categories assigned
- [ ] No failed records (check job result)

---

## 🚨 Common Issues & Fixes

### **Issue 1: "Invalid OAuth Token"**
**Fix:**
```bash
# Regenerate token in Catalyst
catalyst login --refresh
```

### **Issue 2: "Field doesn't exist"**
**Fix:**
1. Check field API names in Zoho
2. Update field_mappings in code
3. Redeploy

### **Issue 3: "File upload failed"**
**Fix:**
- Check File Store folder permissions
- Ensure CSV format is correct
- Validate file size < 10MB

---

## 🎯 Next Steps

**You've completed:**
- ✅ Installed Bulk Data Processor
- ✅ Synced first products
- ✅ Verified in Zoho

**Now add:**
1. **Checkpoints** - Save state before sync
2. **Restore** - Rollback capability
3. **UI** - Frontend for non-technical users
4. **Scheduling** - Auto-sync daily
5. **Monitoring** - Track sync health

**See:** `PRIMARY_INTEGRATION_GUIDE.md` for advanced features

---

**Time to Production: 30 minutes** ✅  
**Total Investment: Zero infrastructure costs** ✅  
**Scalability: 200,000 records** ✅

**YOU'RE READY TO SYNC!** 🚀
