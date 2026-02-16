# 🎯 CORRECT WAY: Using Zoho CRM Bulk Data Processor (Pre-Built Tool)

**Important:** The Bulk Data Processor is a **pre-configured CodeLib extension** - you DON'T write custom functions. You just install it, configure it, and use it!

---

## ✅ CORRECT WORKFLOW

### **Step 1: Install Bulk Data Processor Extension (5 min)**

1. Go to Catalyst Console: https://console.catalyst.zoho.com
2. Create/Open a Catalyst project
3. Left sidebar → Click **"CodeLib"**
4. Search: **"Zoho CRM Bulk Data Processor"**
5. Click **"Install"**

**What Gets Auto-Installed:**
- ✅ **3 Functions:**
  - `BulkJobSchedule` (Cron function)
  - `BulkDataProcessor` (Event function)
  - `zohocrm_bulk_callback` (Advanced I/O function)
- ✅ **3 Datastore Tables:**
  - `BulkRead` - Tracks read operations
  - `ReadQueue` - Queue for reading
  - `WriteQueue` - Queue for writing
- ✅ **1 Event Listener Rule** - Triggers processing
- ✅ **1 File Store Folder** - For temp files

---

### **Step 2: Configure API Credentials (7 min)**

**2A. Get Zoho CRM Credentials**

1. Go to: https://api-console.zoho.com
2. **Add Client** → **Self Client**
3. Copy:
   - Client ID: `1000.XXXXX`
   - Client Secret: `YYYYY`

**2B. Generate Tokens**

1. In API Console → Generate Code:
   ```
   Scope: ZohoCRM.bulk.ALL,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
   Duration: 10 minutes (for now)
   ```
2. Click "Create" → Copy the CODE
3. Generate Access Token from CODE
4. Copy:
   - Access Token
   - Refresh Token

**2C. Add to Catalyst**

1. In Catalyst → Functions → Click **"BulkDataProcessor"**
2. Open file: `catalyst-config.json`
3. Add your credentials:
   ```json
   {
     "zoho_crm": {
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "access_token": "YOUR_ACCESS_TOKEN",
       "refresh_token": "YOUR_REFRESH_TOKEN",
       "api_domain": "https://www.zohoapis.com"
     }
   }
   ```
4. Save and Deploy

---

### **Step 3: Configure What Data to Process (10 min)**

**3A. Create Cron Job**

1. Catalyst Console → **Cloud Scale** → **Triggers** → **Cron**
2. Click **"Create Cron"**
3. Fill:
   ```
   Cron Name: Process_Product_Weights
   Description: Daily sync of product dimensions and weights
   Schedule: Daily at 2:00 AM (or as needed)
   Schedule Point: Function
   Target Function: BulkJobSchedule
   ```

**3B. Set Parameters**

In the Cron configuration, add parameters:

```json
{
  "MODULES": "Parent_MTP_SKU",
  "FIELDS_TO_BE_PROCESSED": "Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed"
}
```

**Important:**
- `MODULES` = Module API name you want to process
- `FIELDS_TO_BE_PROCESSED` = Comma-separated field API names

**3C. Deploy**

Click **"Deploy"** to activate the cron job.

---

### **Step 4: Add Your Custom Processing Logic (15 min)**

**The Key File:** `ZCRMRecordsProcessorImpl.java` (or `.js` for Node runtime)

1. In Catalyst → Functions → **"BulkDataProcessor"**
2. Open: `ZCRMRecordsProcessorImpl.java` (or Node.js equivalent)
3. Find the `processRecords()` method
4. Add your logic:

**Example - Process Product Weights:**

```javascript
// Node.js version (if using Node runtime)
async function processRecords(records) {
    const processedRecords = [];
    
    for (const record of records) {
        // Your custom logic here
        const physicalWeight = parseFloat(record.Billed_Physical_Weight) || 0;
        const volumetricWeight = parseFloat(record.Billed_Volumetric_Weight) || 0;
        
        // Calculate chargeable weight
        const chargeableWeight = Math.max(physicalWeight, volumetricWeight);
        
        // Determine weight category
        const chargeableKg = chargeableWeight / 1000;
        let category = '10kg';
        if (chargeableKg <= 0.5) category = '500gm';
        else if (chargeableKg <= 1) category = '1kg';
        else if (chargeableKg <= 2) category = '2kg';
        else if (chargeableKg <= 5) category = '5kg';
        
        // Update record
        record.Billed_Chargeable_Weight = chargeableWeight;
        record.Weight_Category_Billed = category;
        record.Total_Weight = chargeableWeight;
        
        processedRecords.push(record);
    }
    
    return processedRecords;
}
```

5. Save and **Deploy** the function

---

### **Step 5: Use the Bulk Processor**

**Option A: Automatic (via Cron)**
- Cron runs at scheduled time
- Fetches data from Zoho
- Processes with your logic
- Writes back to Zoho
- **You do nothing!** ✅

**Option B: Manual Trigger (via Datastore)**

1. Go to Catalyst → **Datastore** → **BulkRead** table
2. Insert a row:
   ```json
   {
     "module_api_name": "Parent_MTP_SKU",
     "status": "PENDING"
   }
   ```
3. Event Listener detects the insert
4. Triggers `BulkDataProcessor` function
5. Processing starts automatically

**Option C: Direct API Call (from your app)**

```javascript
// From your React app or Node script
const triggerBulkProcess = async () => {
    // Insert into BulkRead table via Catalyst Datastore API
    const response = await fetch(
        'https://your-project.catalyst.zoho.com/baas/v1/project/{project_id}/table/BulkRead/row',
        {
            method: 'POST',
            headers: {
                'Authorization': 'Zoho-oauthtoken YOUR_TOKEN',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: [{
                    module_api_name: 'Parent_MTP_SKU',
                    status: 'PENDING'
                }]
            })
        }
    );
    
    console.log('Bulk process triggered!');
};
```

---

## 📊 How It Works Under the Hood

```
1. Trigger (Cron/Manual)
   ↓
2. BulkJobSchedule Function
   → Updates BulkRead table with module name
   ↓
3. Event Listener Detects Change
   ↓
4. BulkDataProcessor Function Runs
   → Calls Zoho Bulk Read API
   → Fetches up to 200,000 records
   ↓
5. zohocrm_bulk_callback Receives Response
   → Downloads CSV from Zoho
   → Processes each record with YOUR custom logic
   → Generates output CSV
   ↓
6. Calls Zoho Bulk Write API
   → Uploads processed CSV
   → Updates records in Zoho CRM
   ↓
7. Done! ✅
```

---

## 🎯 For Our Use Case: Syncing Product Dimensions

### **Configuration:**

**Cron Parameters:**
```json
{
  "MODULES": "Parent_MTP_SKU",
  "FIELDS_TO_BE_PROCESSED": "Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed,Bill_Dimension_Weight"
}
```

**Custom Logic (in processRecords):**
```javascript
async function processRecords(records) {
    const updated = [];
    
    for (const record of records) {
        // Parse box dimensions from subform
        const boxes = record.Bill_Dimension_Weight || [];
        
        let totalPhysicalWeight = 0;
        let totalVolumetricWeight = 0;
        
        boxes.forEach(box => {
            totalPhysicalWeight += parseFloat(box.Weight) || 0;
            
            const volume = (box.Length * box.Width * box.Height) / 5; // Divisor 5 for grams
            totalVolumetricWeight += volume;
        });
        
        // Update calculated fields
        record.Billed_Physical_Weight = totalPhysicalWeight;
        record.Billed_Volumetric_Weight = totalVolumetricWeight;
        record.Billed_Chargeable_Weight = Math.max(totalPhysicalWeight, totalVolumetricWeight);
        record.BOM_Weight = totalPhysicalWeight;
        
        // Weight category
        const kg = record.Billed_Chargeable_Weight / 1000;
        if (kg <= 0.5) record.Weight_Category_Billed = '500gm';
        else if (kg <= 1) record.Weight_Category_Billed = '1kg';
        else if (kg <= 2) record.Weight_Category_Billed = '2kg';
        else if (kg <= 5) record.Weight_Category_Billed = '5kg';
        else record.Weight_Category_Billed = '10kg';
        
        updated.push(record);
    }
    
    return updated;
}
```

---

## ✅ Summary: What You Actually Do

### **Setup (One Time):**
1. ✅ Install Bulk Data Processor extension
2. ✅ Configure API credentials
3. ✅ Create cron job with module/field parameters
4. ✅ Add your custom processing logic
5. ✅ Deploy

### **Usage (Ongoing):**
1. ✅ Cron runs automatically (or trigger manually)
2. ✅ Extension does everything:
   - Fetches data from Zoho
   - Runs your logic
   - Writes back to Zoho
3. ✅ You monitor results in Datastore tables

**NO CUSTOM FUNCTIONS TO WRITE!** Just configure and use! 🎉

---

## 🔍 Monitoring & Debugging

### **Check Processing Status:**

1. Catalyst → **Datastore** → **BulkRead** table
2. Look for latest row:
   ```json
   {
     "module_api_name": "Parent_MTP_SKU",
     "status": "COMPLETED", // or IN_PROGRESS, FAILED
     "record_count": 319,
     "download_url": "https://...",
     "updated_at": "2026-02-03T14:00:00Z"
   }
   ```

### **Check Logs:**

1. Catalyst → **Functions** → **"BulkDataProcessor"**
2. Click **"Logs"** tab
3. See execution history and errors

---

## 🚀 Next Steps

**For the deployment walkthrough, update it to:**

1. Install extension ✅
2. Configure credentials ✅
3. Set up cron with product fields ✅
4. Add weight calculation logic ✅
5. Test with manual trigger ✅
6. Schedule for daily sync ✅

**NO custom function deployment needed!** 🎯

---

Should I update the `DEPLOYMENT_WALKTHROUGH.md` with this correct approach?
