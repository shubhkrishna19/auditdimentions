# Knowledge Transfer Answers

## 1. CRM DATA STRUCTURE

### 1.1 Field API Names & Data Types
**Parent_MTP_SKU Module:**
- **Name**: Text (SKU Code, e.g., "MTP-1001")
- **Product_MTP_Name**: Text (Descriptive Name)
- **Billed_Physical_Weight**: Number (KG) - *Crucial: stored as partial KG, meaning 40 = 40kg*
- **Billed_Chargeable_Weight**: Number (KG)
- **Weight_Category_Billed**: Picklist (Volumetric/Physical)
- **MTP_Box_Dimensions**: Subform
    - **Box**: Text (Box Number, e.g. "1")
    - **Length**: Number (cm)
    - **Width**: Number (cm)
    - **Height**: Number (cm)
    - **Weight**: Number (KG) - *Note: fetch logic treats this as KG*

**Products Module (Child):**
- **Product_Code**: Text (SKU Code, e.g. "MTP-1001-A")
- **Product_Name**: Text
- **Total_Weight**: Number (KG) - *Billed Weight*
- **Last_Audited_Total_Weight_kg**: Number (KG) - *The field we update*
- **MTP_SKU**: Lookup (Points to `Parent_MTP_SKU`)
- **Bill_Dimension_Weight**: Subform
    - **BL**: Text (Box Label/Number)
    - **Length**: Number (cm)
    - **Width**: Number (cm)
    - **Height**: Number (cm)
    - **Weight**: Number (KG)

### 1.2 Unit Standards
- **Billed_Physical_Weight**: **KILOGRAMS** (e.g. 1.5 = 1.5kg). *Correction: Previous logic divided by 1000, which was wrong. It is now read raw.*
- **Total_Weight**: **KILOGRAMS**.
- **Last_Audited_Total_Weight_kg**: **KILOGRAMS**.
- **Box Weights (Subforms)**: **KILOGRAMS**.

### 1.3 Parent-Child Relationship
- **Linkage**: The `Products` module has a Lookup field named `MTP_SKU` that points to the record ID in `Parent_MTP_SKU`.
- **Logic**:
    - **One Parent** can have **Many Children**.
    - **Child** must have **One Parent** (linked via `MTP_SKU` ID).
    - In `ZohoAPI.js`, we fetch both lists and manually link them in memory: `parent.children.push(child.skuCode)` if `child.MTP_SKU.id === parent.id`.

### 1.4 Custom Fields Created
- None created by AI in this session. We are using existing fields provided by the user.

---

## 2. EXCEL FILE FORMAT

### 2.1 Structure (Audit_Dimensions.csv / .xlsx)
- **Row 1-10**: Header Row (contains "SKU" or "Product Code").
- **Column 0**: SKU Code
- **Column 1**: Box Type (SB/MB)
- **Columns 2-5**: Box 1 (L, W, H, Weight)
- **Columns 6-9**: Box 2
- **Columns 10-13**: Box 3
- **Column 16**: **Total Weight** (This is the source of truth for "Audited Weight").

### 2.2 Units in Excel
- **Box Dimensions**: cm
- **Box Weights**: **GRAMS** (mostly). The parser divides by 1000 to convert to KG.
- **Total Weight (Col 16)**: **Mixed/Heuristic**.
    - If value > 1000 -> Treated as Grams (divides by 1000).
    - If value <= 1000 -> Treated as KG (keeps raw).

### 2.3 Formats
- Only `Audit_Dimensions.csv` / `.xlsx` template is supported.

---

## 3. ZOHO SDK & DEPLOYMENT

### 3.1 Deployment
- **Type**: **Zoho Web Tab** (Embedded Widget).
- **Hosting**: Zoho Catalyst (`audit-authenticator-client`).
- **URL**: `https://zohocrmbulkdataprocessingintegrityengine-913495338.development.catalystserverless.com/app/index.html`

### 3.2 SDK Version
- **Library**: `https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js`
- **Init**: `ZOHO.embeddedApp.init()` returns a Promise.
- **Usage**: direct `window.ZOHO.CRM.API` calls from the browser.

### 3.3 Permissions
- **Scopes**: Requires `ZohoCRM.modules.READ` and `ZohoCRM.modules.WRITE` for `Products` and `Parent_MTP_SKU`.

---

## 4. WEIGHT CONVERSION LOGIC (CORRECTED)

### 4.1 FROM Zoho CRM (Read)
- **Read Raw**: We do **NOT** divide by 1000 anymore.
    - Example: CRM `40` -> App `40.00 kg`.
- **Previous Bug**: We were dividing by 1000, displaying `0.04 kg`. This is fixed in `ZohoAPI.js`.

### 4.2 TO Zoho CRM (Write)
- **Write Raw**: We send **KG** directly.
    - Example: Audit `1.5 kg` -> CRM `1.5`.
- **Target Field**: `Last_Audited_Total_Weight_kg` (Products) or `Billed_Physical_Weight` (Parents).

### 4.3 FROM Excel (Parse)
- **Box Weights**: Divided by 1000 (Grams -> KG).
- **Total Weight**: Smart check (>1000 ? /1000 : raw).

---

## 5. FEATURES & FUNCTIONALITY

### 5.1 Fully Working
1.  **Live CRM Fetch**: Loads Parents & Children via Client SDK.
2.  **Parent-Child Linking**: Visualized in Console and Grid.
3.  **Excel Upload**: Parses audit file, matches SKUs (fixed `productCode` vs `skuCode` bug), calculates variances.
4.  **Grid Display**: Shows Billed vs Audited, standardizes units to KG.

### 5.2 Partially Implemented / To-Do
- **Bulk Apply**: The modal exists, logic exists, but hasn't been extensively tested with the new Unit logic.
- **Master Sync**: Logic exists to read `parsed_billing_dimensions.json`, but requires that JSON to be present.

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Catalyst Backend (ZohoSyncHub)
- **Status**: **Deployed & Healthy** (SDK v2.0.0, Node 18, Express).
- **Purpose**: Initially created to serve the app, but encountered 500 errors so we pivoted to **Client-Side SDK**.
- **Future Use**: **KEEP IT**. It is now fixed and serves as the scalable backend for future processing of >100k records (Bulk API).
- **Current App**: Does NOT use it. Current app is 100% Client-Side.

### 6.2 ZohoAPI.js
- **Role**: Single Source of Truth for frontend CRM interactions.
- **Current State**: Uses `window.ZOHO.CRM.API`. No longer calls `fetch('/server/...')`.

---

## 7. KNOWN ISSUES & GOTCHAS

### 7.1 Fixed Bugs
- **500 Internal Server Error**: Fixed by downgrading `zcatalyst-sdk-node` to `^2.0.0` and using Node 18 Express pattern.
- **Matching Failed**: `DimensionAuditParser` looked for `productCode`, `ZohoAPI` returned `skuCode`. Fixed parser to check both.
- **Unit Display Error**: "0.04 kg" -> Fixed by removing `/ 1000` divisor in `ZohoAPI.js`.

### 7.2 Remaining Risks
- **Excel Unit Ambiguity**: If Excel boxes are in KG (e.g. "2"), parser will treat as Grams ("0.002 kg").
- **Pagination**: `fetchProducts` sets `per_page: 200`. If > 200 records, we need to implement pagination loop (page 2, 3...). Currently it fetches only page 1.

---

## 10. CRITICAL CONTEXT FOR CLAUDE
- **The "Backend" `ZohoSyncHub` is functional but currently unused by the frontend.** Do not delete it; it's for the future.
- **The Frontend is "Embedded-First".** It expects to run inside Zoho. If running locally, it defaults to Mock Mode.
- **Data Linking**: The code explicitly links Children to Parents in `ZohoAPI.fetchProducts`.
