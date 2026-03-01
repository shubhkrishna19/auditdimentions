# 📦 Zoho Data Integration Module

**Version:** 1.0.0  
**Last Updated:** 2026-02-03  
**Purpose:** Portable, self-contained module for Zoho CRM integration with checkpoint/restore capability

---

## ⚠️ MANDATORY: READ THIS FIRST

**🎯 FOR ALL AI AGENTS & DEVELOPERS:**

**This is a collaborative knowledge base. When you use this module, you MUST:**

1. ✅ **Document new patterns** in `knowledge_base/BEST_PRACTICES.md`
2. ✅ **Document errors solved** in `knowledge_base/ERROR_CATALOG.md`
3. ✅ **Update** `knowledge_base/CHANGELOG.md` with your changes
4. ✅ **Add module mappings** to `config/field_mappings.json`

**📖 Read CONTRIBUTING.md before using this module!**

This is **NOT optional**. Your learnings help future developers and AI agents work faster and avoid mistakes. This module is the **single source of truth** for Zoho integration across all company projects.

**By using this module, you agree to share your knowledge!** 🤝

---

## 🎯 What This Module Does

This is a **copy-paste ready** module that provides:

✅ **Zoho CRM Integration** - Pre-configured for Parent_MTP_SKU and Products modules  
✅ **Checkpoint System** - Automatic backups before every update  
✅ **Restore Capability** - One-click rollback of all changes  
✅ **Unit Handling** - Documented rules for grams/kg conversions  
✅ **Field Mappings** - Central config for Zoho API field names  
✅ **Best Practices** - 7 proven integration patterns  
✅ **Error Catalog** - Common issues and solutions  
✅ **Self-Documenting** - Everything an AI agent needs to know

---

## 📁 Module Structure

```
ZohoDataIntegrationModule/
├── README.md                          ← You are here
├── INTEGRATION_QUICKSTART.md          ← 5-minute setup guide
├── config/
│   ├── field_mappings.json            ← ⭐ Field API names & unit rules
│   └── validation_rules.js            ← Data validation logic (TODO)
├── core/
│   ├── TransactionManager.js          ← ⭐ Checkpoint/restore system
│   ├── ZohoProvider.js                ← Main integration class (TODO)
│   ├── DataValidator.js               ← Pre-sync validation (TODO)
│   └── ErrorHandler.js                ← Error management (TODO)
├── knowledge_base/
│   ├── INTEGRATION_GUIDE.md           ← ⭐ Complete guide for AI agents
│   ├── BEST_PRACTICES.md              ← ⭐ 7 integration patterns
│   ├── ERROR_CATALOG.md               ← ⭐ Troubleshooting guide
│   └── CHANGELOG.md                   ← Module evolution log
└── logs/
    └── .gitkeep                       ← Transaction logs go here
```

---

## 🚀 Quick Start (Copy to New Project)

### **Step 1: Copy the Module**
```bash
# Copy entire folder to your project
cp -r ZohoDataIntegrationModule <your-project>/src/modules/

# Or on Windows:
xcopy ZohoDataIntegrationModule <your-project>\src\modules\ZohoDataIntegrationModule /E /I
```

### **Step 2: Install in Your App**

**Option A: Use with existing ZohoSyncService**
```javascript
// In your ZohoSyncService.js
import TransactionManager from '../modules/ZohoDataIntegrationModule/core/TransactionManager.js';

class ZohoSyncService {
    constructor() {
        this.transactionManager = new TransactionManager();
        this.enableCheckpoints = true;
    }
    
    async syncAll(products) {
        // Initialize Transaction Manager
        await this.transactionManager.init();
        
        for (const product of products) {
            // Create checkpoint before update
            const checkpoint = await this.transactionManager.createCheckpoint(
                'Parent_MTP_SKU',
                recordId,
                productCode
            );
            
            // Perform update...
        }
    }
    
    async restoreAll() {
        return await this.transactionManager.restoreAll();
    }
}
```

**Option B: Build new service from scratch**
```javascript
// See knowledge_base/INTEGRATION_GUIDE.md for complete examples
```

### **Step 3: Read Field Mappings**
```javascript
import fieldMappings from '../modules/ZohoDataIntegrationModule/config/field_mappings.json';

// Get unit handling rules
const { CRITICAL_WEIGHT_UNITS } = fieldMappings.unitHandling;
console.log(CRITICAL_WEIGHT_UNITS.storageUnit); // "GRAMS"
console.log(CRITICAL_WEIGHT_UNITS.displayUnit); // "KILOGRAMS"

// Get field API names
const physicalWeightField = fieldMappings.modules.Parent_MTP_SKU.fields.physicalWeight;
console.log(physicalWeightField.zohoApiName); // "Billed_Physical_Weight"
```

### **Step 4: Use Best Practices**
Read `knowledge_base/BEST_PRACTICES.md` for:
- Parent-Child weight logic
- Unit conversion formulas
- Batch processing patterns
- Error handling strategies

---

## ⚙️ Configuration

### **Update for Your Module**

Edit `config/field_mappings.json`:

```json
{
  "modules": {
    "Your_Module_Name": {
      "description": "Your module description",
      "identifier": "Your_Unique_Field",
      "fields": {
        "yourField": {
          "zohoApiName": "Your_Zoho_Field_Name",
          "type": "decimal",
          "required": true,
          "validation": "positive_number"
        }
      }
    }
  }
}
```

### **Unit Handling Rules**

The module includes pre-configured rules for:
- **Weight Storage:** GRAMS
- **Weight Display:** KILOGRAMS  
- **Dimension Storage:** CENTIMETERS
- **Volumetric Formula:** (L×W×H)/5 for grams, /5000 for kg

**To change units for your app:**
Edit `unitHandling` section in `field_mappings.json`

---

## 🔒 Checkpoint/Restore System

### **How It Works**

```
1. Before Update:
   → TransactionManager.createCheckpoint()
   → Fetches current record from Zoho
   → Stores original data in memory
   → Returns checkpoint ID

2. Perform Update:
   → Your code updates the record
   → Checkpoint ID tracked

3. If Rollback Needed:
   → TransactionManager.restoreCheckpoint(id)
   → OR TransactionManager.restoreAll()
   → Restores original data
```

### **Example Usage**

```javascript
const tm = new TransactionManager();
await tm.init();

// Create checkpoint
const checkpoint = await tm.createCheckpoint(
    'Parent_MTP_SKU',  // module
    'abc123',          // record ID
    'WA-PYS-N'         // product code (for logging)
);

// Perform update...
await updateProduct({...});

// If something goes wrong:
await tm.restoreCheckpoint(checkpoint.id);

// Or restore all:
await tm.restoreAll();
```

---

## 📚 Documentation for AI Agents

### **For AI Working on This Project:**

1. **Read First:** `knowledge_base/INTEGRATION_GUIDE.md`
   - Complete module usage instructions
   - Code examples
   - Troubleshooting steps

2. **Follow Patterns:** `knowledge_base/BEST_PRACTICES.md`
   - 7 proven integration patterns
   - Unit conversion rules
   - Batch processing logic

3. **Debug Errors:** `knowledge_base/ERROR_CATALOG.md`
   - Common errors and fixes
   - Prevention tips

4. **Add Learnings:** `knowledge_base/CHANGELOG.md`
   - Document new patterns
   - Track changes

### **For AI Creating New Integration:**

```markdown
## Integration Checklist

1. [ ] Copy ZohoDataIntegrationModule to your project
2. [ ] Read knowledge_base/INTEGRATION_GUIDE.md
3. [ ] Update config/field_mappings.json with your fields
4. [ ] Check unitHandling rules match your requirements
5. [ ] Import TransactionManager for checkpoint capability
6. [ ] Test with 5 records first
7. [ ] Document new patterns in BEST_PRACTICES.md
```

---

## 🎓 Key Concepts

### **1. Unit Handling (CRITICAL)**

**Storage vs Display:**
- **Store in Zoho:** Weights in GRAMS, Dimensions in CM
- **Display in UI:** Weights in KG (divide by 1000)

**Why?**
- Zoho stores `Billed_Physical_Weight: 1890` (grams)
- UI shows "1.89 kg" to users
- **Never** convert before storing!

### **2. Field Mappings**

**App-Friendly Names → Zoho API Names:**
```javascript
// Your code uses friendly names
const data = {
    physicalWeight: 1890,
    volumetricWeight: 1610
};

// Module maps to Zoho API names
const zohoData = mapFields(data);
// {
//   Billed_Physical_Weight: 1890,
//   Billed_Volumetric_Weight: 1610
// }
```

### **3. Parent-Child Independence**

**Parent weights ≠ Sum of children:**
- Parent (MTP SKU) has its own weight
- Children (colored variants) have their own weights
- They SHOULD be similar but are independent

### **4. Volumetric Weight Formula**

**For storage (grams):**
```
volumetricWeight = (Length × Width × Height in cm³) / 5
```

**For display (kg):**
```
volumetricWeight = (Length × Width × Height in cm³) / 5000
```

### **5. Chargeable Weight Logic**

```javascript
// Both must be in SAME UNIT before MAX()
const chargeable = Math.max(
    physicalWeightGrams,
    volumetricWeightGrams
);
```

---

## 🔧 Customization

### **Adding New Modules**

Edit `config/field_mappings.json`:

```json
{
  "modules": {
    "Products": {
      "description": "Child product module (colored variants)",
      "identifier": "Product_Code",
      "fields": {
        "productCode": {
          "zohoApiName": "Product_Code",
          "type": "string",
          "required": true
        },
        "color": {
          "zohoApiName": "Color",
          "type": "picklist",
          "required": false
        }
      }
    }
  }
}
```

### **Adding New Validation Rules**

Create `config/validation_rules.js`:

```javascript
export const validationRules = {
    positiveNumber: (value) => {
        if (value < 0) throw new Error('Value must be positive');
        return true;
    },
    
    validWeightCategory: (value, chargeableKg) => {
        const expectedCategory = getWeightCategory(chargeableKg);
        if (value !== expectedCategory) {
            throw new Error(`Category ${value} doesn't match weight ${chargeableKg}kg`);
        }
        return true;
    }
};
```

### **Adding New Best Practices**

Edit `knowledge_base/BEST_PRACTICES.md`:

```markdown
### Pattern 8: Your New Pattern

**Context:** When does this apply?
**Problem:** What issue does this solve?
**Answer:** How to do it correctly

**Code Example:**
```javascript
// Your example code
```

**Gotcha:** What to watch out for
```

---

## 📊 Module Status

### **Implemented:**
- ✅ TransactionManager (checkpoint/restore)
- ✅ Field mappings (Parent_MTP_SKU complete)
- ✅ Unit handling documentation
- ✅ Best practices (7 patterns)
- ✅ Error catalog (8 errors)
- ✅ Integration guide
- ✅ Changelog

### **TODO (Future Enhancements):**
- ⏳ ZohoProvider.js (main integration class)
- ⏳ DataValidator.js (pre-sync validation)
- ⏳ ErrorHandler.js (centralized error management)
- ⏳ Products module field mappings
- ⏳ validation_rules.js implementation
- ⏳ Automated changelog generation
- ⏳ Schema auto-discovery tool

---

## 🆘 Support

### **For Developers:**
1. Read `INTEGRATION_QUICKSTART.md` (5-minute guide)
2. Check `knowledge_base/ERROR_CATALOG.md` for errors
3. Review `knowledge_base/BEST_PRACTICES.md` for patterns

### **For AI Agents:**
1. Read `knowledge_base/INTEGRATION_GUIDE.md` (complete guide)
2. Follow patterns in `BEST_PRACTICES.md`
3. Update docs when you discover new patterns

### **For Troubleshooting:**
1. Enable console logging: `console.log('[ModuleName]', ...)`
2. Check Zoho Setup → API Names match field mappings
3. Verify unit conversions (grams vs kg)
4. Test with 1 product first, then 5, then all

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial release with checkpoint system |

See `knowledge_base/CHANGELOG.md` for detailed history.

---

## 🚀 Next Steps

1. **Copy this module** to your new project
2. **Read** `INTEGRATION_QUICKSTART.md` for setup
3. **Update** `config/field_mappings.json` with your fields
4. **Import** TransactionManager for checkpoint capability
5. **Test** with small dataset first
6. **Document** your learnings in BEST_PRACTICES.md

---

## 📜 License

This module is designed for internal use across projects. Copy and modify as needed.

---

## 🤝 Contributing

When you use this module in a new project:

1. **Add new patterns** to `BEST_PRACTICES.md`
2. **Document errors** in `ERROR_CATALOG.md`
3. **Update** `CHANGELOG.md` with changes
4. **Merge learnings** back to this master module

**This module grows with every project!** 🌱

---

**Module created by:** Claude (Codex)  
**Source project:** Audit Dimensions App  
**Ready to copy-paste:** ✅  
**Self-contained:** ✅  
**AI-friendly:** ✅
