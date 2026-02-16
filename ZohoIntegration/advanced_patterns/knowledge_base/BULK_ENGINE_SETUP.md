# 🏗️ Zoho CRM Bulk Data Integrity Engine

**Component Type:** External Microservice (Sidecar)  
**Technology:** Zoho Catalyst (Java/Node.js)  
**Purpose:** Handle heavy bulk data operations (319+ products) without freezing the UI.

---

## 🧐 What is this?

Think of the **Integrity Engine** as a separate, powerful server that sits next to our React App.
- **React App:** "Hey Engine, sync all products!" (sends 1 signal)
- **Engine:** "On it." (Processes 319 records, talks to CRM, handles limits)
- **React App:** "Thanks!" (Updates UI when done)

This architecture ensures:
1.  **Zero Frontend Lag** (Heavy lifting is off-loaded)
2.  **Security** (Credentials stay on server)
3.  **Portability** (Any app can use this engine)

---

## 🛠️ How to Create the Engine (From Scratch)

If you are a new AI or Developer starting fresh, follow these exact steps to build the engine.

### **1. Prerequisites**
- Node.js & NPM installed
- Catalyst CLI: `npm install -g zoho-catalyst-cli`
- Authenticated: `catalyst login`

### **2. Initialization**
Create a new folder (separate from the main app code) to hold the engine.

```bash
mkdir ZohoIntegrationEngine
cd ZohoIntegrationEngine
catalyst init
```
*   **Project Name:** `zoho-crm-bulk-processor`
*   **Language:** Java (Recommended for this CodeLib)
*   **Template:** Basic I/O Function

### **3. Install the Core System (CodeLib)**
We use the official Zoho Integrity Architecture (CodeLib).

```bash
# Inside the project folder
catalyst codelib:install https://github.com/catalystbyzoho/codelib-zoho-crm-bulk-processor
```
*This installs: BulkJobScheduler (Cron), BulkDataProcessor (Event), and Datastore Tables.*

### **4. Configure Credentials**
You need 4 keys. Generate them in Zoho API Console (Self Client).
1.  `CLIENT_ID`
2.  `CLIENT_SECRET`
3.  `REFRESH_TOKEN` (Scope: `ZohoCRM.bulk.ALL,ZohoCRM.modules.ALL...`)
4.  `CODELIB_SECRET_KEY` (Generate a random 32-char string)

**Inject them into:**
- `functions/BulkDataProcessor/catalyst-config.json`
- `functions/zohocrm_bulk_callback/catalyst-config.json`

---

## 🚀 How to Use the Engine (Integration)

Once the engine is deployed (`catalyst deploy`), here is how your App uses it.

### **Method A: The "Save" Button (Real-Time)**
For single records, bypass the engine and go direct to CRM (faster).
*   **Action:** User clicks "Save".
*   **Code:** `ZOHO.CRM.API.updateRecord(...)`
*   **Result:** < 1 second update.

### **Method B: The "Daily Sync" (Bulk)**
For keeping 319+ products completely in sync.

1.  **Trigger:** Cron Job (Automatic) or Button Click.
2.  **Action:** Engine wakes up.
3.  **Process:**
    *   Fetches ALL data from Zoho CRM.
    *   Calculates `Chargeable Weight` vs `Volumetric Weight`.
    *   Determines `Weight Category` (e.g., "1kg", "5kg").
    *   Updates Zoho CRM with corrected data.
4.  **Result:** 100% Data Integrity.

---

## 📂 Project Structure
To keep things clean, your workspace should look like this:

```text
/Dimentions Audit Authenticator
│
├── /src                   # (Your React App Code)
│   ├── /components
│   └── /services
│       └── ZohoSyncService.js  <-- Talks to CRM & Engine
│
├── /ZohoDataIntegrationModule
│   ├── /knowledge_base
│   │   └── BULK_ENGINE_SETUP.md (You are here)
│   └── ZOHO_API_V5_REFERENCE.md
│
└── /ZohoIntegrationEngine # (The Catalyst Engine Code)
    ├── /functions
    │   ├── BulkDataProcessor (Java)
    │   └── ...
    └── catalyst.json
```

**✅ Rule of Thumb:** Never mix the "Engine" code with the "React App" code. Keep them in sibling folders!
