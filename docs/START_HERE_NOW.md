# 🎯 START HERE - Complete Installation Guide

**Based on:** Official Zoho Catalyst CodeLib Documentation  
**Time Required:** 45 minutes  
**Current Status:** Ready to start!

---

## ✅ STEP-BY-STEP INSTRUCTIONS

### **STEP 1: Install Catalyst CLI (5 min)**

**Open PowerShell as Administrator:**

```powershell
# Install Catalyst CLI globally
npm install -g zoho-catalyst-cli

# Verify installation
catalyst --version
```

**Expected Output:** `catalyst/3.x.x`

---

### **STEP 2: Login to Catalyst (3 min)**

```powershell
# Login to Catalyst
catalyst login
```

- Browser will open
- Login with your Zoho CRM credentials
- After success, close browser

**Expected Output:** `✓ Successfully logged in to Catalyst!`

---

### **STEP 3: Create Project Directory (2 min)**

```powershell
# Navigate to your workspace
cd "C:\Users\shubh\Downloads\Dimentions Audit Authenticator"

# Create new project folder
mkdir ZohoIntegrationEngine
cd ZohoIntegrationEngine
```

---

### **STEP 4: Initialize Catalyst Project (5 min)**

```powershell
# Initialize project
catalyst init
```

**Answer the prompts:**
```
? Project name: zoho-crm-bulk-processor
? Description: Zoho CRM bulk data processing for product weights
? Programming language: Java  ← IMPORTANT: Choose Java!
? Template: Basic I/O Function
```

**Expected Output:** `✓ Project initialized successfully!`

---

### **STEP 5: Install Bulk Processor CodeLib (5 min)**

```powershell
# Make sure you're in project root
cd zoho-crm-bulk-processor

# Install CodeLib
catalyst codelib:install https://github.com/catalystbyzoho/codelib-zoho-crm-bulk-processor
```

**This will:**
- Download and install pre-configured components
- Create BulkJobSchedule function
- Create BulkDataProcessor function
- Create zohocrm_bulk_callback function
- Create Datastore tables
- Create Event Listeners

**Expected Output:**
```
Downloading CodeLib...
Installing dependencies...
✓ CodeLib installed successfully!
```

**Wait 2-3 minutes for installation to complete.**

---

### **STEP 6: Generate API Credentials (10 min)**

#### **6A. Create Self-Client**

1. Open: https://api-console.zoho.com
2. Click **"Add Client"** → **"Self Client"**
3. **COPY AND SAVE:**
   - Client ID: `1000.XXXXX`
   - Client Secret: `YYYYY`

#### **6B. Generate Refresh Token**

1. In API Console → Scroll to **"Generate Code"**
2. **Scope - COPY EXACTLY:**
   ```
   ZohoFiles.files.ALL,ZohoCRM.bulk.ALL,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.org.ALL
   ```
3. **Time Duration:** 10 minutes
4. Click **"Create"**
5. **COPY the CODE** (looks like: `1000.xxxxx.yyyyy`)

#### **6C. Generate Access + Refresh Token**

1. Scroll to **"Generate Access Token"**
2. Paste the CODE from above
3. Click **"Generate"**
4. **IMPORTANT: COPY AND SAVE:**
   - `access_token` (you won't need this for CodeLib)
   - **`refresh_token`** ← THIS IS WHAT YOU NEED!

#### **6D. Generate Secret Key**

```powershell
# Generate 32+ character secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**COPY the output** (looks like: `a1b2c3d4e5f6...`)

---

### **STEP 7: Configure BulkDataProcessor Function (5 min)**

```powershell
# Open the config file
code functions/BulkDataProcessor/catalyst-config.json
```

**Find the `env_variables` section and update:**

```json
{
  "env_variables": {
    "CLIENT_SECRET": "YOUR_CLIENT_SECRET_HERE",
    "CLIENT_ID": "YOUR_CLIENT_ID_HERE",
    "REFRESH_TOKEN": "YOUR_REFRESH_TOKEN_HERE",
    "CODELIB_SECRET_KEY": "YOUR_32_CHAR_SECRET_KEY_HERE"
  }
}
```

**Replace:**
- `CLIENT_SECRET` → Your actual Client Secret
- `CLIENT_ID` → Your actual Client ID
- `REFRESH_TOKEN` → Your actual Refresh Token
- `CODELIB_SECRET_KEY` → Your generated 32-char secret

**SAVE THE FILE!**

---

### **STEP 8: Configure zohocrm_bulk_callback Function (2 min)**

```powershell
# Open the callback config file
code functions/zohocrm_bulk_callback/catalyst-config.json
```

**Find the `env_variables` section and update:**

```json
{
  "env_variables": {
    "CODELIB_SECRET_KEY": "YOUR_32_CHAR_SECRET_KEY_HERE"
  }
}
```

**Use the SAME secret key from Step 7!**

**SAVE THE FILE!**

---

### **STEP 9: Add Your Processing Logic (5 min)**

```powershell
# Open the processor implementation file
code functions/BulkDataProcessor/src/main/java/com/processor/record/ZCRMRecordsProcessorImpl.java
```

**Find the `ZCRMRecordsProcessor` method and replace with:**

```java
@Override
public ArrayList<ZCRowObject> ZCRMRecordsProcessor(ArrayList<ZCRowObject> records) throws Exception {
    LOGGER.info("Processing " + records.size() + " product records...");
    
    ArrayList<ZCRowObject> processedRecords = new ArrayList<>();
    
    for (ZCRowObject record : records) {
        try {
            // Get product code
            String productCode = (String) record.get("Product_Code");
            
            // Get weights (in grams from Zoho)
            Double physicalWeight = getDoubleValue(record, "Billed_Physical_Weight");
            Double volumetricWeight = getDoubleValue(record, "Billed_Volumetric_Weight");
            
            // Calculate chargeable weight
            Double chargeableWeight = Math.max(physicalWeight, volumetricWeight);
            
            // Update fields
            record.put("Billed_Chargeable_Weight", chargeableWeight);
            record.put("BOM_Weight", physicalWeight);
            record.put("Total_Weight", chargeableWeight);
            
            // Calculate weight category
            Double chargeableKg = chargeableWeight / 1000.0;
            String category = "10kg";
            if (chargeableKg <= 0.5) category = "500gm";
            else if (chargeableKg <= 1.0) category = "1kg";
            else if (chargeableKg <= 2.0) category = "2kg";
            else if (chargeableKg <= 5.0) category = "5kg";
            
            record.put("Weight_Category_Billed", category);
            
            processedRecords.add(record);
            
        } catch (Exception e) {
            LOGGER.warning("Error processing record: " + e.getMessage());
        }
    }
    
    LOGGER.info("Processed " + processedRecords.size() + " records successfully");
    return processedRecords;
}

// Helper method
private Double getDoubleValue(ZCRowObject record, String fieldName) {
    Object value = record.get(fieldName);
    if (value == null) return 0.0;
    if (value instanceof Double) return (Double) value;
    if (value instanceof Integer) return ((Integer) value).doubleValue();
    if (value instanceof String) return Double.parseDouble((String) value);
    return 0.0;
}
```

**SAVE THE FILE!**

---

### **STEP 10: Deploy to Catalyst (3 min)**

```powershell
# From project root
cd C:\Users\shubh\Downloads\Dimentions Audit Authenticator\catalyst-zoho-integration\zoho-crm-bulk-processor

# Deploy everything
catalyst deploy
```

**This will:**
- Build Java functions
- Upload to Catalyst
- Configure datastores
- Set up event listeners

**Expected Output:** `✓ Deployment successful!`

**Deployment takes 2-3 minutes.**

---

### **STEP 11: Create Cron Job in Catalyst Console (5 min)**

1. **Open:** https://console.catalyst.zoho.com
2. **Select your project:** `zoho-crm-bulk-processor`
3. **Navigate:** CloudScale → Triggers → Cron
4. **Click:** "Create Cron"

**Fill the form:**

```
Cron Name: Process_Product_Weights
Description: Process product dimensions and weights

Schedule Point: Function
Target Function: BulkJobSchedule

Function Parameters:
{
  "MODULE": "Parent_MTP_SKU",
  "FIELDS_TO_BE_PROCESSED": "Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed,Total_Weight"
}

Schedule Type: One-Time (for testing)
Date: Today
Time: 5 minutes from now
```

**Click "Save"**

---

### **STEP 12: Test the Cron Job (5 min)**

**Wait for scheduled time, then:**

1. **Go to:** Catalyst Console → Datastore → BulkRead table
2. **Check latest row:**
   ```json
   {
     "module_api_name": "Parent_MTP_SKU",
     "status": "COMPLETED",  // Look for this!
     "record_count": 319
   }
   ```

3. **Check Logs:**
   - Catalyst Console → Functions → BulkDataProcessor → Logs
   - Look for: "Processing 319 product records..."

4. **Verify in Zoho CRM:**
   - Open any product record
   - Check if weights are updated

**If status = COMPLETED → SUCCESS!** ✅

---

## 🔍 TROUBLESHOOTING

### **Error: "Invalid token"**
- Regenerate refresh token (Step 6)
- Make sure you used the REFRESH token, not ACCESS token

### **Error: "Module not found"**
- Check module API name is exact: `Parent_MTP_SKU`
- Verify in CRM: Setup → APIs → API Names

### **Error: "Field not found"**
- Create fields in Zoho CRM first (see REALTIME_SYNC_SETUP.md)
- Use exact API names

### **Cron job not running**
- Check scheduled time is in future
- Verify function is deployed
- Check Catalyst Console logs

---

## ✅ VERIFICATION CHECKLIST

After completing all steps:

- [ ] Catalyst CLI installed and logged in
- [ ] Project initialized with Java
- [ ] CodeLib installed successfully
- [ ] API credentials generated (Client ID, Secret, Refresh Token)
- [ ] Secret key generated (32+ chars)
- [ ] BulkDataProcessor config updated
- [ ] zohocrm_bulk_callback config updated
- [ ] Processing logic added
- [ ] Deployed to Catalyst
- [ ] Cron job created
- [ ] Test run completed
- [ ] Data verified in Zoho CRM

---

## 📊 WHAT HAPPENS WHEN CRON RUNS

```
1. Cron triggers at scheduled time
   ↓
2. BulkJobSchedule function runs
   ↓
3. Updates BulkRead datastore table
   ↓
4. Event Listener detects change
   ↓
5. BulkDataProcessor function runs
   ↓
6. Calls Zoho Bulk Read API
   ↓
7. Fetches up to 200,000 product records
   ↓
8. Processes each with YOUR logic
   ↓
9. Calls Zoho Bulk Write API
   ↓
10. Updates all products in Zoho CRM
   ↓
11. Status = COMPLETED ✅
```

---

## 🎯 NEXT STEPS AFTER SUCCESS

### **For Automated Daily Syncs:**

1. Edit your Cron job
2. Change Schedule Type to **"Recurring"**
3. Select **"Daily"** at **2:00 AM**
4. Save

**Now it runs automatically every day!**

### **For Real-Time Saves:**

Follow `REALTIME_SYNC_SETUP.md` to add Save button functionality.

---

## 📞 NEED HELP?

**Check these files:**
- Installation issues → This file
- Field setup → `REALTIME_SYNC_SETUP.md`
- API reference → `ZOHO_API_V5_REFERENCE.md`
- Complete guide → `COMPLETE_DEPLOYMENT_GUIDE.md`

---

**TIME TO START:** Right now!  
**TOTAL TIME:** 45 minutes  
**DIFFICULTY:** Medium (follow steps exactly)

**Let's go!** 🚀

---

## 📝 QUICK COMMAND REFERENCE

```powershell
# Install CLI
npm install -g zoho-catalyst-cli

# Login
catalyst login

# Create project
mkdir catalyst-zoho-integration
cd catalyst-zoho-integration
catalyst init

# Install CodeLib
cd zoho-crm-bulk-processor
catalyst codelib:install https://github.com/catalystbyzoho/codelib-zoho-crm-bulk-processor

# Edit configs
code functions/BulkDataProcessor/catalyst-config.json
code functions/zohocrm_bulk_callback/catalyst-config.json

# Edit processing logic
code functions/BulkDataProcessor/src/main/java/com/processor/record/ZCRMRecordsProcessorImpl.java

# Deploy
catalyst deploy
```

**Then create Cron job in Catalyst Console and test!**
