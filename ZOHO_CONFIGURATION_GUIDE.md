# 🛠️ ZOHO CRM SETUP GUIDE: Making Data Visible

To ensure the audited weight data appears in the **Parent MTP SKU** product details page, you must manually create/add these custom fields in Zoho CRM. The API updates them, but they won't show up unless they exist in the Layout.

## 📋 Step 1: Create Custom Fields

1. Go to **Setup (Gear Icon)** ⚙️ → **Customization** → **Modules and Fields**.
2. Click on the **Parent_MTP_SKU** module (or whatever your MTP module is named).
3. Go to the **Fields** tab and click **Create & Edit Fields**.
4. Drag and drop the following field types to create these NEW fields:

| Field Label (Display Name) | Data Type | Section | Important Property |
|----------------------------|-----------|---------|--------------------|
| **Billed Physical Weight** | Decimal | Weight Details | Mark as integer/decimal |
| **Billed Volumetric Weight** | Decimal | Weight Details | |
| **Billed Chargeable Weight** | Decimal | Weight Details | **Highlight this field** if possible |
| **BOM Weight** | Decimal | Weight Details | |
| **Weight Category Billed** | Picklist | Weight Details | Options: `5kg`, `10kg`, `20kg`, `50kg`, `100kg`, `500kg`, `500kg+` |
| **Audit History Log** | Long Text | Audit Info | |
| **Processing Status** | Picklist | Audit Info | Options: `Y`, `N` (plus any others from your Excel Column T) |

> **💡 Pro Tip:** Create a new Section called **"Weight Audit Details"** and put all these fields there to keep it clean.

---

## 📋 Step 2: Add to Page Layout

Even if fields exist, they might be "Unused".

1. Still in **Modules and Fields** → **Parent_MTP_SKU**.
2. Click on **Layouts** → **Standard Layout** (or the visual layout you use).
3. Look at the **"Unused Fields"** panel on the left (or list of fields).
4. Drag the new fields (from Step 1) into the main layout area.
5. **Formulas/Calculated Fields:** If `Chargeable Weight` should be auto-calculated in Zoho (instead of just synced from app), you can make it a specific "Formula" field, but for now, **Decimal** is safer so our App can update it.
6. **Save the Layout.**

---

## 📋 Step 3: API Name Verification

Our Sync Script pushes data to specific "API Names". Zoho sometimes auto-names fields differently (e.g., `Billed_Physical_Weight1`).

1. In **Modules and Fields** → **Parent_MTP_SKU**.
2. Click the **API Names** tab (top right usually, or via "Field Grammar").
3. Ensure the API Names match EXACTLY what our script uses:
   - `Billed_Physical_Weight`
   - `Billed_Volumetric_Weight`
   - `Billed_Chargeable_Weight`
   - `BOM_Weight`
   - `Weight_Category_Billed`
   - `Audit_History_Log`
   - `Processing_Status`
   
**If they are different (e.g., `Decimal_1`), let me know so I can update the script!**

---

## 📋 Step 4: Verify Subform

1. Ensure the **Bill Dimension Weight** subform is on the layout.
2. Click it to verify its internal fields:
   - `Box_Number`
   - `Length`
   - `Width`
   - `Height`
   - `Weight`
   - `Box_Measurement` (cm)
   - `Weight_Measurement` (kg)

---

## ✅ Once this is done:
1. Come back to the App.
2. Run the **Bulk Upload / Sync**.
3. The data will finally **SHOW** on the Product Page!
