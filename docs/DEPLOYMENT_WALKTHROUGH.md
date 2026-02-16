# 🚀 DEPLOYMENT WALKTHROUGH - Quick Test → Production

**Goal:** Test with 2 products → Scale to 319 products → Production ready  
**Time:** 30 min quick test + 1.5 hours full deployment  
**Status:** Let's go! 🎯

---

## 📋 PHASE 1: QUICK TEST (30 minutes)

### **✅ Step 1: Access Catalyst Console (2 min)**

**Action:**
1. Open browser: https://console.catalyst.zoho.com
2. Click "Sign In" (use your Zoho CRM credentials)
3. If first time:
   - Click "Get Started"
   - Choose region: (your data center - probably US or EU)
   - Terms → Accept

**Expected Result:**
- ✅ You see Catalyst Dashboard
- ✅ "Create Project" button visible

**Screenshot this:** Dashboard view

---

### **✅ Step 2: Create Catalyst Project (3 min)**

**Action:**
1. Click "Create Project"
2. Fill form:
   ```
   Project Name: zoho-data-integration
   Project Type: Web Client (Choose this!)
   Runtime: Node.js 18
   ```
3. Click "Create"

**Expected Result:**
- ✅ Project created
- ✅ You see project dashboard with:
   - Functions (empty)
   - Datastore (empty)
   - File Store (1 default folder)

**Note the Project ID** (shown in URL): `zoho-data-integration-60xxxxx`

---

### **✅ Step 3: Install Bulk Data Processor Extension (5 min)**

**Action:**
1. In left sidebar → Click "CodeLib" (Extensions icon)
2. Search: "Zoho CRM Bulk Data Processor"
3. Click the card → Click "Install"
4. Wait for installation (~2-3 min)
5. Refresh page

**Expected Result:**
- ✅ You see new functions created:
   - `BulkJobSchedule`
   - `BulkReadJob`
   - `BulkWriteJob`
   - (and more)
- ✅ Datastore has new tables:
   - `BulkRead`
   - `BulkWrite`

**Screenshot this:** Functions list showing bulk processor functions

**If installation fails:**
- Check you have CRM admin permissions
- Try different browser (Chrome recommended)
- Check Catalyst service status

---

### **✅ Step 4: Set Up CRM API Credentials (7 min)**

**Action:**

**4A. Create Self-Client in API Console**
1. New tab: https://api-console.zoho.com
2. Click "Add Client" → "Self Client"
3. You'll see:
   ```
   Client ID: 1000.XXXXXXXXXXXXXXXXXXXXX
   Client Secret: YYYYYYYYYYYYYYYYYYYYYYYY
   ```
4. **COPY BOTH** to notepad

**4B. Generate Access Token**
1. Scroll down to "Generate Code"
2. In Scope field, enter:
   ```
   ZohoCRM.bulk.ALL,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
   ```
3. Time Duration: 10 minutes (for testing)
4. Click "Create"
5. Copy the CODE shown

**4C. Generate Token from Code**
1. In same page, scroll to "Generate Access Token"
2. Paste the CODE
3. Click "Generate"
4. Copy:
   - `access_token` (long string)
   - `refresh_token` (for later)

**4D. Add to Catalyst Environment**
1. Back to Catalyst Console
2. Settings (gear icon) → Environment Variables
3. Add these:
   ```
   Key: ZOHO_CLIENT_ID
   Value: (paste client ID)
   
   Key: ZOHO_CLIENT_SECRET
   Value: (paste client secret)
   
   Key: ZOHO_ACCESS_TOKEN
   Value: (paste access token)
   
   Key: ZOHO_REFRESH_TOKEN
   Value: (paste refresh token)
   ```
4. Click "Save"

**Expected Result:**
- ✅ 4 environment variables saved
- ✅ Access token ready to use

---

### **✅ Step 5: Create Quick Test Function (8 min)**

**Action:**

**5A. Create Function**
1. In Catalyst → Functions → Click "+ Add Function"
2. Configure:
   ```
   Function Name: test-bulk-write
   Type: Advanced I/O
   Runtime: Node.js 18
   ```
3. Click "Create"

**5B. Add Code**

Replace the auto-generated code with:

```javascript
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (catalystApp, context) => {
    try {
        const app = catalyst.initialize(catalystApp);
        
        console.log('[TestBulkWrite] Starting test...');
        
        // Test data: 2 products
        const testProducts = [
            {
                Product_Code: 'WA-PYS-N',
                Billed_Physical_Weight: 1890,
                Billed_Chargeable_Weight: 1890
            },
            {
                Product_Code: 'WA-PYT-N',
                Billed_Physical_Weight: 1890,
                Billed_Chargeable_Weight: 1890
            }
        ];
        
        // Convert to CSV
        const csvHeader = 'Product_Code,Billed_Physical_Weight,Billed_Chargeable_Weight';
        const csvRows = testProducts.map(p => 
            `${p.Product_Code},${p.Billed_Physical_Weight},${p.Billed_Chargeable_Weight}`
        );
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        console.log('[TestBulkWrite] CSV prepared:', csvContent);
        
        // Upload to File Store
        const filestore = app.filestore();
        const folder = filestore.folder('BulkFiles'); // Created by Bulk Processor
        
        const uploadedFile = await folder.uploadFile({
            code: Buffer.from(csvContent),
            name: `test_products_${Date.now()}.csv`
        });
        
        console.log('[TestBulkWrite] File uploaded:', uploadedFile.id);
        
        // Make Bulk Write API call
        const accessToken = process.env.ZOHO_ACCESS_TOKEN;
        const conn = app.connection();
        
        const bulkResponse = await conn.request({
            method: 'POST',
            url: 'https://www.zohoapis.com/crm/bulk/v2/write',
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: {
                operation: 'update',
                resource: [{
                    type: 'data',
                    module: {
                        api_name: 'Parent_MTP_SKU'
                    },
                    file_id: uploadedFile.id,
                    find_by: 'Product_Code',
                    field_mappings: [
                        { api_name: 'Product_Code', index: 0 },
                        { api_name: 'Billed_Physical_Weight', index: 1 },
                        { api_name: 'Billed_Chargeable_Weight', index: 2 }
                    ]
                }]
            }
        });
        
        console.log('[TestBulkWrite] Bulk response:', bulkResponse);
        
        const jobId = bulkResponse.data[0].details.id;
        
        context.write({
            success: true,
            message: 'Bulk write job started successfully!',
            jobId: jobId,
            recordCount: testProducts.length,
            nextStep: `Check status at: /server/test-bulk-write/check-status?jobId=${jobId}`
        });
        
    } catch (error) {
        console.error('[TestBulkWrite] Error:', error);
        context.write({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
```

**5C. Install Dependencies**
1. In function editor → Terminal (bottom panel)
2. Run:
   ```bash
   npm install zcatalyst-sdk-node
   ```

**5D. Deploy Function**
1. Click "Deploy" button (top right)
2. Wait for deployment (~30 sec)

**Expected Result:**
- ✅ Function deployed successfully
- ✅ You see function URL in Catalyst console

---

### **✅ Step 6: Test the Function (3 min)**

**Action:**

**6A. Get Function URL**
1. In Functions list → Click "test-bulk-write"
2. Copy the "Invoke URL" shown

**6B. Test with Browser or Postman**

**Option A: Browser (Easiest)**
1. Paste URL in browser
2. Press Enter

**Option B: Postman/Thunder Client**
```
GET https://zoho-data-integration-60xxxxx.catalyst.zoho.com/server/test-bulk-write
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bulk write job started successfully!",
  "jobId": "4150868000004395001",
  "recordCount": 2,
  "nextStep": "Check status at: /server/test-bulk-write/check-status?jobId=..."
}
```

**If you get errors:**
- ❌ "Invalid token" → Regenerate access token (step 4)
- ❌ "Module not found" → Check module name in Zoho CRM
- ❌ "Field doesn't exist" → Create fields in Zoho first (see IMMEDIATE_ACTION_CHECKLIST.md)

---

### **✅ Step 7: Check Job Status (2 min)**

**Action:**

Create another function to check status:

**Function Name:** `check-job-status`  
**Code:**
```javascript
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (catalystApp, context) => {
    try {
        const app = catalyst.initialize(catalystApp);
        const jobId = context.request.query.jobId;
        
        if (!jobId) {
            context.write({ error: 'jobId query parameter required' });
            return;
        }
        
        const conn = app.connection();
        const accessToken = process.env.ZOHO_ACCESS_TOKEN;
        
        const statusResponse = await conn.request({
            method: 'GET',
            url: `https://www.zohoapis.com/crm/bulk/v2/write/${jobId}`,
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`
            }
        });
        
        const jobData = statusResponse.data[0];
        
        context.write({
            jobId: jobId,
            status: jobData.state,
            totalRecords: jobData.result?.total_count || 0,
            processed: jobData.result?.processed_count || 0,
            failed: jobData.result?.failed_count || 0,
            createdTime: jobData.created_time,
            completedTime: jobData.completed_time,
            downloadUrl: jobData.file?.url || null
        });
        
    } catch (error) {
        context.write({
            error: error.message
        });
    }
};
```

Deploy and call:
```
GET https://your-url/server/check-job-status?jobId=4150868000004395001
```

**Expected Response:**
```json
{
  "jobId": "4150868000004395001",
  "status": "COMPLETED",
  "totalRecords": 2,
  "processed": 2,
  "failed": 0
}
```

---

### **✅ Step 8: Verify in Zoho CRM (2 min)**

**Action:**
1. Open Zoho CRM: https://crm.zoho.com
2. Go to Parent_MTP_SKU module
3. Search for: "WA-PYS-N"
4. Open product record
5. Check fields:
   - Billed Physical Weight = 1.890 kg (or 1890 if displayed as grams)
   - Billed Chargeable Weight = 1.890 kg

**Expected Result:**
- ✅ Product found
- ✅ Weights updated
- ✅ Values correct

**🎉 QUICK TEST COMPLETE!** If you see updated weights in Zoho, bulk sync is working!

---

## 📋 PHASE 2: PRODUCTION DEPLOYMENT (1.5 hours)

Now let's scale to all 319 products with full features!

### **✅ Step 9: Create Production Function with Checkpoints (15 min)**

**Function Name:** `bulk-sync-products`

**Code:**
```javascript
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (catalystApp, context) => {
    try {
        const app = catalyst.initialize(catalystApp);
        const { products, createCheckpoints = true } = context.request.body;
        
        if (!products || !Array.isArray(products)) {
            context.write({ error: 'products array required in request body' });
            return;
        }
        
        console.log(`[BulkSync] Starting sync for ${products.length} products`);
        
        // STEP 1: Create checkpoints if enabled
        let checkpointId = null;
        if (createCheckpoints) {
            console.log('[BulkSync] Creating checkpoints...');
            
            const datastore = app.datastore();
            const table = datastore.table('Checkpoints'); // We'll create this
            
            // Fetch current state from Zoho for each product
            const conn = app.connection();
            const accessToken = process.env.ZOHO_ACCESS_TOKEN;
            
            const checkpointData = {
                timestamp: new Date().toISOString(),
                productCount: products.length,
                products: []
            };
            
            // For quick test, just store SKUs (full implementation would fetch current values)
            for (const product of products) {
                checkpointData.products.push({
                    sku: product.Product_Code,
                    // In production: fetch and store current values from Zoho
                });
            }
            
            const checkpoint = await table.insertRow(checkpointData);
            checkpointId = checkpoint.ROWID;
            
            console.log(`[BulkSync] Checkpoint created: ${checkpointId}`);
        }
        
        // STEP 2: Prepare CSV
        console.log('[BulkSync] Preparing CSV data...');
        
        const csvHeader = 'Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed';
        
        const csvRows = products.map(p => {
            return `"${p.Product_Code}",${p.Billed_Physical_Weight},${p.Billed_Volumetric_Weight},${p.Billed_Chargeable_Weight},${p.BOM_Weight || 0},"${p.Weight_Category_Billed || ''}"`;
        });
        
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        // STEP 3: Upload to File Store
        console.log('[BulkSync] Uploading to File Store...');
        
        const filestore = app.filestore();
        const folder = filestore.folder('BulkFiles');
        
        const uploadedFile = await folder.uploadFile({
            code: Buffer.from(csvContent),
            name: `products_sync_${Date.now()}.csv`
        });
        
        console.log(`[BulkSync] File uploaded: ${uploadedFile.id}`);
        
        // STEP 4: Trigger Bulk Write
        console.log('[BulkSync] Triggering Bulk Write API...');
        
        const conn = app.connection();
        const accessToken = process.env.ZOHO_ACCESS_TOKEN;
        
        const bulkResponse = await conn.request({
            method: 'POST',
            url: 'https://www.zohoapis.com/crm/bulk/v2/write',
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: {
                operation: 'update',
                resource: [{
                    type: 'data',
                    module: {
                        api_name: 'Parent_MTP_SKU'
                    },
                    file_id: uploadedFile.id,
                    find_by: 'Product_Code',
                    field_mappings: [
                        { api_name: 'Product_Code', index: 0 },
                        { api_name: 'Billed_Physical_Weight', index: 1 },
                        { api_name: 'Billed_Volumetric_Weight', index: 2 },
                        { api_name: 'Billed_Chargeable_Weight', index: 3 },
                        { api_name: 'BOM_Weight', index: 4 },
                        { api_name: 'Weight_Category_Billed', index: 5 }
                    ]
                }]
            }
        });
        
        const jobId = bulkResponse.data[0].details.id;
        
        console.log(`[BulkSync] ✅ Job started: ${jobId}`);
        
        // STEP 5: Log to datastore
        const logsTable = datastore.table('SyncLogs');
        await logsTable.insertRow({
            jobId: jobId,
            checkpointId: checkpointId,
            productCount: products.length,
            startTime: new Date().toISOString(),
            status: 'IN_PROGRESS'
        });
        
        context.write({
            success: true,
            jobId: jobId,
            checkpointId: checkpointId,
            recordCount: products.length,
            message: `Syncing ${products.length} products to Zoho CRM...`
        });
        
    } catch (error) {
        console.error('[BulkSync] Error:', error);
        context.write({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
```

---

**(Guide continues in next section...)**

**CURRENT STATUS:**
- ✅ Phase 1 (Quick Test) ready to execute
- ⏳ Phase 2 (Production) code prepared
- ⏳ Need to create Datastore tables
- ⏳ Need to parse Excel and trigger sync

**Should I continue with:**
1. Creating the Datastore tables (Checkpoints, SyncLogs)?
2. Creating Excel parser script?
3. Creating restore function?

**OR would you like to start executing Phase 1 now?** (I can guide you through each step in real-time)
