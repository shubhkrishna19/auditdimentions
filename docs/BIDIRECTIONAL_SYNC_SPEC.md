# 🔄 BIDIRECTIONAL SYNC SPECIFICATION

**Requirement:** Zoho CRM is the Single Source of Truth (SSOT)  
**Goal:** Display synced "Billed Weight" from Zoho database in app UI

---

## 🎯 Current State vs Required State

### **❌ Current (One-Way Sync):**
```
App → Calculate weights → Send to Zoho → Done
                                  ↓
                           (Data stored, but not shown back)
```

### **✅ Required (Bidirectional Sync):**
```
App → Calculate weights → Send to Zoho
                               ↓
                         Data stored in Zoho
                               ↓
                    Fetch back from Zoho (SSOT)
                               ↓
                   Display in UI as "Billed Weight"
```

---

## 📋 What Needs to Display

### **For Each Product Card:**

**Show these fields FROM Zoho (after sync):**

| Field Label | Zoho API Name | Display As | Unit |
|-------------|---------------|------------|------|
| Billed Physical Weight | `Billed_Physical_Weight` | "Billed Physical: X kg" | kg (convert from grams) |
| Billed Volumetric Weight | `Billed_Volumetric_Weight` | "Billed Volumetric: X kg" | kg |
| Billed Chargeable Weight | `Billed_Chargeable_Weight` | "**Billed Weight: X kg**" | kg (highlighted) |
| BOM Weight | `BOM_Weight` | "BOM Weight: X kg" | kg |
| Weight Category | `Weight_Category_Billed` | "Category: Xkg" | - |
| Total Weight | `Total_Weight` | "Total: X kg" | kg |

**Box Dimensions (from subform):**
| Box | Length | Width | Height | Weight |
|-----|--------|-------|--------|--------|
| Box 1 | X cm | X cm | X cm | X kg |

---

## 🔧 Implementation Plan

### **Step 1: Add Fetch Function to ZohoSyncService**

```javascript
/**
 * Fetch product data from Zoho (for display)
 */
async fetchProduct(sku, module = 'Parent_MTP_SKU') {
    try {
        const result = await ZOHO.CRM.API.searchRecord({
            Entity: module,
            Type: "criteria",
            Query: `(Product_Code:equals:${sku})`
        });

        if (!result.data || result.data.length === 0) {
            return null;
        }

        const product = result.data[0];
        
        // Convert grams to kg for display
        return {
            sku: product.Product_Code,
            productName: product.Product_MTP_Name,
            
            // Weights (convert from grams to kg)
            billedPhysicalWeight: product.Billed_Physical_Weight ? 
                (product.Billed_Physical_Weight / 1000).toFixed(3) : null,
            billedVolumetricWeight: product.Billed_Volumetric_Weight ? 
                (product.Billed_Volumetric_Weight / 1000).toFixed(3) : null,
            billedChargeableWeight: product.Billed_Chargeable_Weight ? 
                (product.Billed_Chargeable_Weight / 1000).toFixed(3) : null,
            bomWeight: product.BOM_Weight ? 
                (product.BOM_Weight / 1000).toFixed(3) : null,
            totalWeight: product.Total_Weight ? 
                (product.Total_Weight / 1000).toFixed(3) : null,
            
            weightCategory: product.Weight_Category_Billed,
            processingStatus: product.Processing_Status,
            
            // Box dimensions
            boxes: product.Bill_Dimension_Weight || [],
            
            // Raw data (if needed)
            _raw: product
        };
    } catch (error) {
        console.error('[ZohoSync] Fetch error:', error);
        throw error;
    }
}

/**
 * Fetch multiple products
 */
async fetchProducts(skus, module = 'Parent_MTP_SKU') {
    const products = [];
    
    for (const sku of skus) {
        try {
            const product = await this.fetchProduct(sku, module);
            if (product) {
                products.push(product);
            }
        } catch (error) {
            console.error(`[ZohoSync] Failed to fetch ${sku}:`, error);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return products;
}
```

### **Step 2: Add Display Component**

**Create:** `src/components/BilledWeightDisplay.jsx`

```javascript
const BilledWeightDisplay = ({ productData }) => {
    if (!productData) {
        return (
            <div className="billed-weight-display">
                <p className="no-data">No billed weight data from Zoho</p>
            </div>
        );
    }

    return (
        <div className="billed-weight-display">
            <h4>📊 Billed Weight (from Zoho SSOT)</h4>
            
            <div className="weight-card highlight">
                <span className="label">Billed Chargeable Weight:</span>
                <span className="value">{productData.billedChargeableWeight} kg</span>
            </div>
            
            <div className="weight-details">
                <div className="weight-row">
                    <span className="label">Physical Weight:</span>
                    <span className="value">{productData.billedPhysicalWeight} kg</span>
                </div>
                <div className="weight-row">
                    <span className="label">Volumetric Weight:</span>
                    <span className="value">{productData.billedVolumetricWeight} kg</span>
                </div>
                <div className="weight-row">
                    <span className="label">BOM Weight:</span>
                    <span className="value">{productData.bomWeight} kg</span>
                </div>
                <div className="weight-row">
                    <span className="label">Category:</span>
                    <span className="value">{productData.weightCategory}</span>
                </div>
            </div>
            
            {productData.boxes && productData.boxes.length > 0 && (
                <div className="box-dimensions">
                    <h5>Box Dimensions:</h5>
                    <table>
                        <thead>
                            <tr>
                                <th>Box</th>
                                <th>L×W×H (cm)</th>
                                <th>Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productData.boxes.map((box, idx) => (
                                <tr key={idx}>
                                    <td>Box {box.Box_Number}</td>
                                    <td>{box.Length} × {box.Width} × {box.Height}</td>
                                    <td>{(box.Weight / 1000).toFixed(3)} kg</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="sync-status">
                <span className="status-badge">✅ Synced from Zoho</span>
            </div>
        </div>
    );
};

export default BilledWeightDisplay;
```

### **Step 3: Update After Sync**

**In BulkUpload.jsx, after sync completes:**

```javascript
const handleSync = async () => {
    // ... existing sync code ...
    
    await service.syncAll(
        parsedData,
        (progressData) => {
            // Progress updates...
        },
        async (finalResults) => {
            setResults(finalResults);
            setSyncing(false);
            
            // ✅ NEW: Fetch back first 10 products to verify
            console.log('[BulkUpload] Fetching synced data from Zoho...');
            
            const sampleSkus = parsedData.slice(0, 10).map(p => p.Product_Code);
            const syncedData = await service.fetchProducts(sampleSkus);
            
            console.log('[BulkUpload] Fetched synced data:', syncedData);
            
            // Store for display
            setSyncedProducts(syncedData);
        }
    );
};
```

### **Step 4: Add to Product Cards**

**In WeightAudit.jsx or wherever products are shown:**

```javascript
import BilledWeightDisplay from './BilledWeightDisplay';

// ... in component ...

const [billedWeightData, setBilledWeightData] = useState(null);

// Load billed weight when product selected
useEffect(() => {
    if (currentProduct?.sku) {
        loadBilledWeight(currentProduct.sku);
    }
}, [currentProduct]);

const loadBilledWeight = async (sku) => {
    try {
        const service = new ZohoSyncService();
        await service.init();
        
        const data = await service.fetchProduct(sku);
        setBilledWeightData(data);
    } catch (error) {
        console.error('Failed to load billed weight:', error);
    }
};

// ... in JSX ...

<div className="product-details">
    <h3>{currentProduct.sku}</h3>
    
    {/* Calculated weights */}
    <div className="calculated-section">
        <h4>Calculated (Local):</h4>
        <p>Physical: {calculatedPhysical} kg</p>
        <p>Volumetric: {calculatedVolumetric} kg</p>
    </div>
    
    {/* Billed weight from Zoho (SSOT) */}
    <BilledWeightDisplay productData={billedWeightData} />
</div>
```

---

## 🎨 UI Design Spec

### **Visual Hierarchy:**

```
┌─────────────────────────────────────┐
│ Product: WA-PYS-N                   │
├─────────────────────────────────────┤
│ CALCULATED (Local):                 │
│   Physical: 1.89 kg                 │
│   Volumetric: 1.61 kg               │
│   Chargeable: 1.89 kg               │
├─────────────────────────────────────┤
│ BILLED WEIGHT (Zoho SSOT): ✅       │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Billed Chargeable: 1.890 kg   │ │ ← Highlighted
│  └───────────────────────────────┘ │
│                                     │
│  Physical:     1.890 kg             │
│  Volumetric:   1.610 kg             │
│  BOM:          1.890 kg             │
│  Category:     5kg                  │
│                                     │
│  Box Dimensions:                    │
│  Box 1: 70×23×5 cm | 1.890 kg      │
│                                     │
│  Status: ✅ Synced from Zoho        │
└─────────────────────────────────────┘
```

### **Color Coding:**

- **Calculated weights:** Blue text (local calculation)
- **Billed weight:** Green background (Zoho SSOT)
- **Mismatch indicator:** Red badge if calculated ≠ billed

---

## 🔄 Data Flow

```
1. User calculates weights
   ↓
2. Click "Sync to Zoho"
   ↓
3. Send data to Zoho CRM
   ↓
4. Zoho stores in GRAMS
   ↓
5. Fetch back from Zoho
   ↓
6. Convert to KG for display
   ↓
7. Show as "Billed Weight" in UI
   ↓
8. Compare with calculated (optional)
```

---

## ⚠️ Important Notes

### **Unit Conversion (CRITICAL):**

**Storage in Zoho:** GRAMS  
**Display in UI:** KG

```javascript
// When fetching FROM Zoho:
const displayKg = storedGrams / 1000;

// When sending TO Zoho:
const storedGrams = inputKg * 1000; // (but we already store in grams)
```

### **Cache Strategy:**

**Option 1: Fetch on demand**
- User opens product → Fetch from Zoho
- Always fresh, but slower

**Option 2: Fetch after sync**
- Sync completes → Fetch all synced products
- Cache in state/localStorage
- Fast display, but might be stale

**Recommended:** Option 2 with refresh button

---

## 📊 Validation & Comparison

### **Show Difference (Optional):**

```javascript
const difference = Math.abs(calculatedKg - billedKg);

if (difference > 0.01) { // 10 gram tolerance
    <div className="mismatch-warning">
        ⚠️ Calculated ({calculatedKg} kg) differs from billed ({billedKg} kg)
    </div>
}
```

This helps catch sync issues or calculation errors!

---

## ✅ Implementation Checklist

- [ ] Add `fetchProduct()` to ZohoSyncService.js
- [ ] Add `fetchProducts()` for batch fetch
- [ ] Create `BilledWeightDisplay.jsx` component
- [ ] Update `BulkUpload.jsx` to fetch after sync
- [ ] Add billed weight display to product cards
- [ ] Add unit conversion (grams → kg)
- [ ] Add sync status indicator
- [ ] Add refresh button to re-fetch
- [ ] Add mismatch warning (calculated vs billed)
- [ ] Test with real Zoho data

---

## 🎯 Expected Result

After implementation:

1. ✅ User syncs products to Zoho
2. ✅ Data stored in Zoho (GRAMS)
3. ✅ App fetches back synced data
4. ✅ Displays as "Billed Weight" (KG)
5. ✅ Shows in product cards
6. ✅ Box dimensions table visible
7. ✅ Compare with calculated weights
8. ✅ Zoho confirmed as SSOT

---

**This makes Zoho the true SSOT - app displays what Zoho has!** 🎯

Would you like me to implement this now?
