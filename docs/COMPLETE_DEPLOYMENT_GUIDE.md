# 🚀 COMPLETE DEPLOYMENT GUIDE - Zoho CRM Bulk Processor + Integration Module

**Authoritative Version:** Based on Official Catalyst CLI & CodeLib Installation  
**Purpose:** Central development infrastructure for ALL Zoho integrations  
**Audience:** New developers, AI agents, and team members

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Phase 1: Initial Setup (30 min)](#phase-1-initial-setup)
3. [Phase 2: Install Bulk Processor (15 min)](#phase-2-install-bulk-processor)
4. [Phase 3: Configure Integration (20 min)](#phase-3-configure-integration)
5. [Phase 4: Add Custom Logic (30 min)](#phase-4-add-custom-logic)
6. [Phase 5: Deploy & Test (15 min)](#phase-5-deploy--test)
7. [Integration with Our Module](#integration-with-our-module)
8. [For New Developers](#for-new-developers)

---

## ✅ PREREQUISITES

### **Software Required:**

- [ ] **Node.js** v18 or higher → [Download](https://nodejs.org)
- [ ] **Java JDK** 11+ (for Java processor) → [Download](https://adoptium.net/)
- [ ] **Git** → [Download](https://git-scm.com/)
- [ ] **Zoho CRM Account** with admin access
- [ ] **Zoho Catalyst Account** (same credentials as CRM)

### **Verify Installation:**

```powershell
# Check versions
node --version    # Should be v18+
java --version    # Should be 11+
git --version     # Any recent version
```

---

## 📋 PHASE 1: INITIAL SETUP (30 min)

### **Step 1.1: Access Bulk Processor from Zoho CRM (2 min)**

1. **Login to Zoho CRM:** https://crm.zoho.com
2. **Navigate to:**
   ```
   Setup → Developer Hub → Catalyst Solutions → CRM Bulk Processor
   ```
3. **Click:** "Go to Catalyst"
4. **Result:** Opens Catalyst Console with pre-configured project

---

### **Step 1.2: Install Catalyst CLI (5 min)**

**Open PowerShell as Administrator:**

```powershell
# Install Catalyst CLI globally
npm install -g zoho-catalyst-cli

# Verify installation
catalyst --version
# Should show: catalyst/3.x.x or higher
```

---

### **Step 1.3: Login to Catalyst (3 min)**

```powershell
# Login to your Catalyst account
catalyst login

# Browser will open for authentication
# Login with your Zoho credentials
# After success, close browser
```

**Expected Output:**
```
✓ Successfully logged in to Catalyst!
Organization ID: 60xxxxxxxxx
```

---

### **Step 1.4: Create Project Directory (2 min)**

```powershell
# Navigate to your workspace
cd "C:\Users\shubh\Downloads\Dimentions Audit Authenticator"

# Create Catalyst project folder
mkdir catalyst-bulk-integration
cd catalyst-bulk-integration
```

---

### **Step 1.5: Initialize Catalyst Project (5 min)**

```powershell
# Initialize new Catalyst project
catalyst init
```

**Follow the prompts:**
```
? Enter the project name: zoho-data-integration
? Enter the project description: Central Zoho CRM data integration infrastructure
? Choose your preferred programming language: Java ← IMPORTANT: Choose Java!
? Choose a project template: Basic I/O Function
```

**Expected Output:**
```
✓ Project initialized successfully!
Project ID: 60xxxxxxxxxxxx
```

---

### **Step 1.6: Verify Project Structure (2 min)**

```powershell
# List project files
dir

# You should see:
# - functions/
# - catalyst-config.json
# - catalyst.json
# - README.md
```

---

## 📋 PHASE 2: INSTALL BULK PROCESSOR (15 min)

### **Step 2.1: Install CodeLib via CLI (10 min)**

```powershell
# Install Bulk Processor CodeLib
catalyst codelib:install https://github.com/catalystbyzoho/codelib-zoho-crm-bulk-processor

# This will download and configure:
# - BulkJobSchedule function
# - BulkDataProcessor function  
# - zohocrm_bulk_callback function
# - Datastore tables
# - Event listeners
```

**Expected Output:**
```
Downloading CodeLib...
Installing dependencies...
Configuring Catalyst components...
✓ CodeLib installed successfully!

Components Created:
✓ Functions: BulkJobSchedule, BulkDataProcessor, zohocrm_bulk_callback
✓ Datastore: BulkRead, ReadQueue, WriteQueue
✓ Event Listeners: BulkReadListener
✓ File Store: BulkFiles folder
```

---

### **Step 2.2: Verify Installation (2 min)**

```powershell
# List all functions
catalyst list:functions

# Expected output:
# - BulkJobSchedule (Cron)
# - BulkDataProcessor (Event)
# - zohocrm_bulk_callback (Advanced I/O)
```

---

### **Step 2.3: Explore CodeLib Structure (3 min)**

```powershell
# Navigate to BulkDataProcessor function
cd functions/BulkDataProcessor

# List files
dir

# You should see:
# - catalyst-config.json ← We'll edit this
# - pom.xml (Java dependencies)
# - src/
#   └── main/
#       └── java/
#           └── com/
#               └── processor/
#                   └── record/
#                       └── ZCRMRecordsProcessorImpl.java ← Custom logic here
```

---

## 📋 PHASE 3: CONFIGURE INTEGRATION (20 min)

### **Step 3.1: Generate API Credentials (7 min)**

**3.1A: Create Self-Client**

1. Open: https://api-console.zoho.com
2. Click **"Add Client"** → **"Self Client"**
3. Note down:
   - **Client ID:** `1000.XXXXXXXXXXXXXXXXXXXXXXXXX`
   - **Client Secret:** `YYYYYYYYYYYYYYYYYYYYYYYYYYYYY`

**3.1B: Generate Refresh Token**

1. In API Console → **"Generate Code"**
2. **Scope (COPY THIS EXACTLY):**
   ```
   ZohoFiles.files.ALL,ZohoCRM.bulk.ALL,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.org.ALL
   ```
3. **Time Duration:** 10 minutes (for initial setup)
4. Click **"Create"** → Copy the **CODE**
5. Scroll to **"Generate Access Token"**
6. Paste the CODE → Click **"Generate"**
7. **IMPORTANT:** Copy the **`refresh_token`** (NOT just access_token)
   - refresh_token looks like: `1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

---

### **Step 3.2: Generate CODELIB_SECRET_KEY (2 min)**

```powershell
# Generate a random 32+ character secret key
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use online generator
# Visit: https://www.uuidgenerator.net/ and combine 2 UUIDs

# Copy the generated key (looks like):
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

### **Step 3.3: Edit catalyst-config.json (8 min)**

```powershell
# Open the config file
code functions/BulkDataProcessor/catalyst-config.json

# OR use any text editor
notepad functions/BulkDataProcessor/catalyst-config.json
```

**Replace the entire content with:**

```json
{
  "client_configuration": {
    "CLIENT_ID": "1000.XXXXXXXXXXXXXXXXXXXXXXXXX",
    "CLIENT_SECRET": "YYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "REFRESH_TOKEN": "1000.xxxxxxxxxx.yyyyyyyyyyyy",
    "CODELIB_SECRET_KEY": "YOUR_32+_CHAR_SECRET_KEY_HERE",
    "API_DOMAIN": "https://www.zohoapis.com",
    "ACCOUNTS_URL": "https://accounts.zoho.com",
    "FILE_STORE_ID": "<will_be_auto_filled_on_deploy>"
  },
  "processing_configuration": {
    "BATCH_SIZE": 200,
    "UNIT_STORAGE": "grams",
    "UNIT_DISPLAY": "kg",
    "FIELD_MAPPINGS": {
      "Product_Code": "text",
      "Billed_Physical_Weight": "decimal",
      "Billed_Volumetric_Weight": "decimal",
      "Billed_Chargeable_Weight": "decimal",
      "BOM_Weight": "decimal",
      "Weight_Category_Billed": "picklist",
      "Bill_Dimension_Weight": "subform"
    }
  }
}
```

**Replace:**
- `CLIENT_ID` → Your actual Client ID
- `CLIENT_SECRET` → Your actual Client Secret
- `REFRESH_TOKEN` → Your actual Refresh Token
- `CODELIB_SECRET_KEY` → Your generated secret key
- `API_DOMAIN` → Based on your data center:
  - US: `https://www.zohoapis.com`
  - EU: `https://www.zohoapis.eu`
  - IN: `https://www.zohoapis.in`
  - AU: `https://www.zohoapis.com.au`

**Save the file!**

---

### **Step 3.4: Create Cron Job Config (3 min)**

```powershell
# Create a cron configuration document
cd ..\..
New-Item -ItemType File -Name "cron-config.md"
code cron-config.md
```

**Add this content:**

```markdown
# Cron Job Configuration

**After deployment, create this cron job in Catalyst Console:**

## Settings:
- **Name:** Process_Product_Weights_Daily
- **Description:** Sync product dimensions and weights from/to Zoho CRM
- **Schedule:** Daily at 2:00 AM (or your preferred time)
- **Target Function:** BulkJobSchedule
- **Timezone:** Your local timezone

## Parameters:
```json
{
  "MODULES": "Parent_MTP_SKU",
  "FIELDS_TO_BE_PROCESSED": "Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed,Bill_Dimension_Weight"
}
```

## Important Notes:
- Use exact Module API name (not label)
- Use exact Field API names (get from Metadata API)
- Comma-separated, no spaces
```

**Save** and close.

---

## 📋 PHASE 4: ADD CUSTOM LOGIC (30 min)

### **Step 4.1: Locate Processor File (2 min)**

```powershell
cd functions/BulkDataProcessor/src/main/java/com/processor/record
code ZCRMRecordsProcessorImpl.java
```

---

### **Step 4.2: Understand the Structure (5 min)**

**The file looks like this:**

```java
package com.processor.record;

import com.zc.component.object.ZCObject;
import com.zc.component.object.ZCRowObject;
import java.util.ArrayList;
import java.util.logging.Logger;

public class ZCRMRecordsProcessorImpl extends ZCRMRecordsProcessor {
    
    private static final Logger LOGGER = Logger.getLogger(ZCRMRecordsProcessorImpl.class.getName());
    
    @Override
    public ArrayList<ZCRowObject> ZCRMRecordsProcessor(ArrayList<ZCRowObject> records) throws Exception {
        // YOUR CUSTOM LOGIC GOES HERE
        return records;
    }
}
```

**Key Points:**
- `records` = ArrayList of records fetched from Zoho CRM
- Each record is a `ZCRowObject` (like a HashMap)
- You process the records and return modified ArrayList
- Return value gets written back to Zoho via Bulk Write API

---

### **Step 4.3: Add Our Custom Processing Logic (20 min)**

**Replace the method with:**

```java
@Override
public ArrayList<ZCRowObject> ZCRMRecordsProcessor(ArrayList<ZCRowObject> records) throws Exception {
    LOGGER.info("Processing " + records.size() + " product records...");
    
    ArrayList<ZCRowObject> processedRecords = new ArrayList<>();
    
    for (ZCRowObject record : records) {
        try {
            // Extract product code
            String productCode = (String) record.get("Product_Code");
            LOGGER.fine("Processing product: " + productCode);
            
            // Get physical and volumetric weights (already in grams from Zoho)
            Double physicalWeight = getDoubleValue(record, "Billed_Physical_Weight");
            Double volumetricWeight = getDoubleValue(record, "Billed_Volumetric_Weight");
            
            // Calculate chargeable weight (max of physical and volumetric)
            Double chargeableWeight = Math.max(physicalWeight, volumetricWeight);
            
            // Update chargeable weight
            record.put("Billed_Chargeable_Weight", chargeableWeight);
            
            // Set BOM weight (same as physical for now)
            record.put("BOM_Weight", physicalWeight);
            
            // Determine weight category based on chargeable weight in KG
            Double chargeableKg = chargeableWeight / 1000.0;
            String category = determineWeightCategory(chargeableKg);
            record.put("Weight_Category_Billed", category);
            
            // Set total weight
            record.put("Total_Weight", chargeableWeight);
            
            LOGGER.fine("Product " + productCode + " processed: " + 
                       "Chargeable=" + chargeableWeight + "g, " +
                       "Category=" + category);
            
            processedRecords.add(record);
            
        } catch (Exception e) {
            LOGGER.warning("Error processing record: " + e.getMessage());
            // Continue processing other records
        }
    }
    
    LOGGER.info("Successfully processed " + processedRecords.size() + " records");
    return processedRecords;
}

// Helper method to safely get Double values
private Double getDoubleValue(ZCRowObject record, String fieldName) {
    Object value = record.get(fieldName);
    if (value == null) return 0.0;
    if (value instanceof Double) return (Double) value;
    if (value instanceof Integer) return ((Integer) value).doubleValue();
    if (value instanceof String) return Double.parseDouble((String) value);
    return 0.0;
}

// Helper method to determine weight category
private String determineWeightCategory(Double weightKg) {
    if (weightKg <= 0.5) return "500gm";
    else if (weightKg <= 1.0) return "1kg";
    else if (weightKg <= 2.0) return "2kg";
    else if (weightKg <= 5.0) return "5kg";
    else return "10kg";
}
```

**Save the file!**

---

### **Step 4.3: Add Validation & Error Handling (3 min)**

**At the top of the class, add constants:**

```java
public class ZCRMRecordsProcessorImpl extends ZCRMRecordsProcessor {
    
    private static final Logger LOGGER = Logger.getLogger(ZCRMRecordsProcessorImpl.class.getName());
    
    // Business rules
    private static final Double MIN_WEIGHT = 1.0; // 1 gram minimum
    private static final Double MAX_WEIGHT = 50000.0; // 50kg maximum
    
    // ... rest of code
```

**Add validation in the loop:**

```java
// Validate weights
if (physicalWeight < MIN_WEIGHT || physicalWeight > MAX_WEIGHT) {
    LOGGER.warning("Invalid physical weight for " + productCode + ": " + physicalWeight);
    continue; // Skip this record
}

if (volumetricWeight < MIN_WEIGHT || volumetricWeight > MAX_WEIGHT) {
    LOGGER.warning("Invalid volumetric weight for " + productCode + ": " + volumetricWeight);
    continue; // Skip this record
}
```

---

## 📋 PHASE 5: DEPLOY & TEST (15 min)

### **Step 5.1: Deploy to Catalyst (5 min)**

```powershell
# From project root directory
cd C:\Users\shubh\Downloads\Dimentions Audit Authenticator\catalyst-bulk-integration

# Deploy entire project
catalyst deploy
```

**Expected Output:**
```
Deploying project...
✓ Building Java functions...
✓ Uploading functions...
✓ Configuring datastores...
✓ Setting up event listeners...
✓ Deployment successful!

Project URL: https://zoho-data-integration-60xxxxx.catalyst.zoho.com
```

**Deployment Time:** ~2-3 minutes

---

### **Step 5.2: Create Cron Job in Console (5 min)**

1. **Open:** https://console.catalyst.zoho.com
2. **Select your project:** zoho-data-integration
3. **Navigate:** Cloud Scale → Triggers → Cron
4. **Click:** "Create Cron"
5. **Fill Details:**
   ```
   Name: Process_Product_Weights_Daily
   Description: Daily product weight sync
   Schedule: Daily at 2:00 AM
   Target Function: BulkJobSchedule
   ```
6. **Add Parameters (IMPORTANT!):**
   ```json
   {
     "MODULES": "Parent_MTP_SKU",
     "FIELDS_TO_BE_PROCESSED": "Product_Code,Billed_Physical_Weight,Billed_Volumetric_Weight,Billed_Chargeable_Weight,BOM_Weight,Weight_Category_Billed"
   }
   ```
7. **Click:** "Create"

---

### **Step 5.3: Manual Test Trigger (5 min)**

**Option A: Trigger Cron Manually**

1. In Catalyst Console → Cron list
2. Find your cron job
3. Click **"Run Now"** button
4. Wait ~30 seconds

**Option B: Insert into Datastore**

1. In Catalyst Console → Datastore → BulkRead table
2. Click **"Insert Row"**
3. Add:
   ```json
   {
     "module_api_name": "Parent_MTP_SKU",
     "status": "PENDING"
   }
   ```
4. Click **"Insert"**
5. Processing starts automatically!

---

### **Step 5.4: Monitor Execution (2 min)**

**Check Logs:**
```
Catalyst Console → Functions → BulkDataProcessor → Logs tab
```

**Check Status:**
```
Catalyst Console → Datastore → BulkRead → View latest row
```

**Expected Status Flow:**
```
PENDING → PROCESSING → COMPLETED
```

---

### **Step 5.5: Verify in Zoho CRM (3 min)**

1. Open Zoho CRM: https://crm.zoho.com
2. Go to Parent_MTP_SKU module
3. Open any product record
4. Check:
   - ✅ Billed Chargeable Weight = updated
   - ✅ Weight Category Billed = correct category
   - ✅ BOM Weight = set
   - ✅ Total Weight = set

**If values are updated → SUCCESS!** 🎉

---

## 🏗️ INTEGRATION WITH OUR MODULE

### **Folder Structure:**

```
catalyst-bulk-integration/               ← Catalyst project
├── functions/
│   ├── BulkJobSchedule/
│   ├── BulkDataProcessor/              ← Our custom logic here
│   └── zohocrm_bulk_callback/
├── catalyst-config.json
└── catalyst.json

ZohoDataIntegrationModule/              ← Our portable module
├── core/
│   ├── TransactionManager.js           ← Checkpoint logic
│   ├── ZohoProvider.js                 ← API wrapper
│   └── FieldMapper.js                  ← Field mappings
├── config/
│   └── field_mappings.json
├── knowledge_base/
│   ├── BEST_PRACTICES.md
│   └── ERROR_CATALOG.md
└── ZOHO_API_V5_REFERENCE.md            ← Complete API reference
```

**Integration Points:**

1. **Field Mappings:** Use `config/field_mappings.json` in Java processor
2. **Best Practices:** Follow patterns from `knowledge_base/BEST_PRACTICES.md`
3. **Error Handling:** Log errors as per `ERROR_CATALOG.md`
4. **Checkpoints:** (Future) Call TransactionManager before bulk write

---

## 👨‍💻 FOR NEW DEVELOPERS

### **Onboarding Checklist:**

**Day 1: Setup**
- [ ] Install prerequisites (Node.js, Java, Git)
- [ ] Clone repository
- [ ] Install Catalyst CLI
- [ ] Login to Catalyst

**Day 2: Understanding**
- [ ] Read `ZOHO_API_V5_REFERENCE.md`
- [ ] Read `BULK_PROCESSOR_USAGE_GUIDE.md`
- [ ] Explore Catalyst Console

**Day 3: Configuration**
- [ ] Get API credentials
- [ ] Update `catalyst-config.json`
- [ ] Create cron job

**Day 4: Customization**
- [ ] Review `ZCRMRecordsProcessorImpl.java`
- [ ] Understand processing logic
- [ ] Add custom business rules if needed

**Day 5: Deploy & Test**
- [ ] Deploy to Catalyst
- [ ] Trigger test run
- [ ] Verify results in CRM

### **Key Files to Know:**

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| `catalyst-config.json` | API credentials & settings | Once (setup) |
| `ZCRMRecordsProcessorImpl.java` | Custom processing logic | Often (as business rules change) |
| `cron-config.md` | Cron job parameters | Rarely (only if modules/fields change) |
| `field_mappings.json` | Field API name mappings | When new fields added |
| `ZOHO_API_V5_REFERENCE.md` | API documentation | Read-only reference |

### **Common Tasks:**

**Add a new field to processing:**
1. Add field API name to cron parameters
2. No code change needed! (unless custom logic required)
3. Redeploy

**Change processing logic:**
1. Edit `ZCRMRecordsProcessorImpl.java`
2. Run `catalyst deploy`
3. Test

**Add new module:**
1. Create new cron job with module name
2. Set field parameters
3. Same processor works!

---

## 🎯 SUCCESS CRITERIA

**You've successfully deployed when:**
- ✅ Cron job runs without errors
- ✅ BulkRead datastore shows "COMPLETED" status
- ✅ Product records in Zoho CRM are updated
- ✅ Weights and categories are correct
- ✅ Logs show successful processing

---

## 📚 REFERENCE DOCUMENTATION

**Read These:**
1. `ZOHO_API_V5_REFERENCE.md` - Complete API guide
2. `BULK_PROCESSOR_USAGE_GUIDE.md` - How CodeLib works
3. `PRIMARY_INTEGRATION_GUIDE.md` - Company standards
4. `BEST_PRACTICES.md` - Proven patterns

**For Help:**
- Catalyst Docs: https://www.zoho.com/catalyst/help/
- API Docs: https://www.zoho.com/crm/developer/docs/
- GitHub Issues: Report in project repository

---

**DEPLOYMENT COMPLETE!** Your central Zoho integration infrastructure is ready! 🚀

Every new developer can now follow this guide to set up, understand, and deploy Zoho integrations using industry best practices and our company standards.
