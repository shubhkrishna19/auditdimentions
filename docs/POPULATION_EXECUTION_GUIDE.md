# CRM Database Population - Execution Guide

## 🎯 What This Script Does

This script populates ALL empty fields in your Zoho CRM with correct data from your Excel files:

### **Parent_MTP_SKU** (268 records):
- ✅ `Billed_Physical_Weight` ← from DimensionsMasterLatest.xlsx (Gms column ÷ 1000)
- ✅ `Weight_Category_Billed` ← auto-calculated from weight
- ✅ `Product_Category` ← inferred from product name
- ✅ `Live_Status` ← "Live" if ANY child is live, "Not Live" if all children not live

### **Products** (122 child records):
- ✅ `Live_Status` ← from SKU Aliases "Chck" column, mapped to "Live"/"Not Live"
- ✅ `Product_Category` ← inherited from parent
- ✅ `Weight_Category_Billed` ← inherited from parent dimensions

### **Live Status Mapping**:
```
Y, YB, YD, YH, YHRL → "Live"
RL, NL, AR, DI, MW  → "Not Live"
```

---

## ⚙️ Configuration

The script has a **DRY RUN mode** (safe preview) enabled by default.

### **DRY_RUN = true** (Default - SAFE)
- ✅ Previews what would be updated
- ✅ Shows all changes in console
- ✅ No actual CRM updates
- ✅ Safe to run anytime

### **DRY_RUN = false** (Live Mode - EXECUTES)
- ⚠️ Makes ACTUAL changes to CRM
- ⚠️ Updates production data
- ⚠️ 5-second countdown before execution

---

## 📋 Prerequisites

### 1. Required Files (Must be in project directory)
- [x] `unified_master_data.json` ✅ (already created)
- [x] `DimensionsMasterLatest.xlsx`
- [x] `SKU Aliases, Parent & Child Master Data LATEST .xlsx`
- [x] `.env.mcp` (MCP credentials)

### 2. Verify Files Exist
```bash
ls -la unified_master_data.json
ls -la "DimensionsMasterLatest.xlsx"
ls -la "SKU Aliases, Parent & Child Master Data LATEST .xlsx"
```

### 3. Install Dependencies (if not already)
```bash
npm install xlsx
```

---

## 🚀 Execution Steps

### **STEP 1: DRY RUN (Preview Mode)** - DO THIS FIRST!

1. **Open Terminal** in project directory:
   ```bash
   cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator"
   ```

2. **Run in preview mode**:
   ```bash
   node populate_crm_database.js
   ```

3. **Review Output**:
   - Check console for what would be updated
   - Verify field values look correct
   - Review the final statistics
   - Check `population_report.json` for details

4. **Expected Output**:
   ```
   🚀 ZOHO CRM DATABASE POPULATION SCRIPT
   ⚙️  Configuration:
      DRY RUN: ✅ YES (Safe preview mode)

   📦 POPULATING PARENT_MTP_SKU RECORDS
   🔍 Processing: B-POL-SN
      📝 Billed_Physical_Weight: 25.5 kg
      📝 Weight_Category_Billed: 20-50kg
      📝 Product_Category: Furniture
      📝 Live_Status: Live (based on 3 children)
      [DRY RUN] Would update Parent_MTP_SKU 123456789: {...}
      ✅ Updated successfully

   ... (continues for all records)

   📊 FINAL REPORT
   🎯 Parent_MTP_SKU Results:
      Total: 268
      Updated: 230
      Skipped (already complete): 30
      Failed: 0
      Not Found in CRM: 8

   ✅ DRY RUN COMPLETE - No actual changes made
   ```

5. **Validate Preview**:
   - [ ] Field values are correct (weights in KG, not grams)
   - [ ] Live statuses mapped correctly
   - [ ] Categories inferred properly
   - [ ] No unexpected errors

---

### **STEP 2: LIVE EXECUTION** - Only After Dry Run Success

1. **Edit Script Configuration**:
   - Open `populate_crm_database.js`
   - Find line 14: `DRY_RUN: true`
   - Change to: `DRY_RUN: false`
   - Save file

2. **Execute Live Update**:
   ```bash
   node populate_crm_database.js
   ```

3. **Confirm Execution**:
   ```
   ⚠️  WARNING: DRY_RUN is FALSE. This will make ACTUAL changes to CRM!
      Press Ctrl+C within 5 seconds to cancel...
   ```
   - Script will wait 5 seconds
   - Press **Ctrl+C** to abort
   - Or wait 5 seconds to continue

4. **Monitor Progress**:
   - Watch console for batch progress
   - Check for errors in real-time
   - Review updated counts

5. **Expected Duration**:
   - 268 parents + 122 children = 390 records
   - Batch size: 5 records
   - ~78 batches total
   - ~1 second per batch
   - **Total time: ~2-3 minutes**

---

### **STEP 3: VERIFY RESULTS**

1. **Check Final Report**:
   - Open `population_report.json`
   - Review statistics

2. **Verify in Zoho CRM UI**:
   - Go to **Parent_MTP_SKU** module
   - Open a few random records
   - Verify:
     - [ ] `Billed_Physical_Weight` is populated (in KG)
     - [ ] `Weight_Category_Billed` matches weight
     - [ ] `Product_Category` is filled
     - [ ] `Live_Status` is "Live" or "Not Live"

3. **Check Products Module**:
   - Go to **Products** module
   - Open a few child records
   - Verify:
     - [ ] `Live_Status` is populated
     - [ ] `Product_Category` matches parent
     - [ ] `Weight_Category_Billed` matches parent

4. **Run Data Quality Audit**:
   ```bash
   node comprehensive_audit.js
   ```
   - Check data quality score improved
   - Should be 75-90%+ after population

---

## 🛡️ Safety Features

### Built-in Protections:
1. **DRY RUN mode** - Preview before execution
2. **Batch processing** - Avoids rate limits
3. **Progress tracking** - Monitor in real-time
4. **Error handling** - Continues on individual failures
5. **Detailed logging** - Full audit trail
6. **Only updates empty fields** - Won't overwrite existing data
7. **5-second countdown** - Last chance to cancel

### What Won't Be Touched:
- ❌ Fields that already have values
- ❌ Records not in Excel files
- ❌ Any fields not explicitly targeted
- ❌ Related records outside scope

---

## 🔧 Troubleshooting

### Error: "Cannot find module 'xlsx'"
```bash
npm install xlsx
```

### Error: "File not found: unified_master_data.json"
- Ensure you're in the correct directory
- Run `ls` to verify files exist

### Error: "MCP Error: ..."
- Check `.env.mcp` credentials
- Verify MCP server is accessible
- Test with: `node test_zoho_mcp_direct.js`

### Script Hangs/Stalls
- Normal if processing large batches
- Wait 1-2 minutes before canceling
- Check console for last processed SKU

### High "Not Found in CRM" Count
- Some Excel SKUs may not exist in CRM yet
- This is normal for test/discontinued products
- Review list in output to identify missing SKUs

### Updates Failing
- Check CRM API permissions
- Verify field API names match
- Review error messages in console
- Check `population_report.json` for details

---

## 📊 Understanding The Output

### Console Output Symbols:
- 🔍 **Processing** - Currently working on this SKU
- 📝 **Field Update** - Preparing to update this field
- ✅ **Success** - Update completed
- ⚠️ **Warning** - Non-critical issue (e.g., not found)
- ❌ **Error** - Update failed
- ✨ **Skipped** - Already complete, no update needed
- ⏳ **Waiting** - Delay between batches

### Success Criteria:
- **Good**: Updated + Skipped = ~90%+ of total
- **Acceptable**: Failed < 5% of total
- **Issue**: Not Found > 20% (may indicate SKU mismatch)

---

## 🎯 After Population Complete

### Next Steps:
1. ✅ **Verify data quality** - Run comprehensive audit
2. ✅ **Implement validation rules** - Prevent future empty data
3. ✅ **Setup workflows** - Automate category assignment
4. ✅ **Test Dimensions Audit App** - Verify data displays correctly
5. ✅ **Train team** - Show them the updated CRM

### Clean Up:
- Review `population_report.json`
- Archive Excel files (don't delete, keep as backup)
- Document any SKUs that weren't found
- Set `DRY_RUN` back to `true` for safety

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review `population_report.json` for details
3. Share console output with me
4. I can help debug specific errors

---

**Ready to proceed?**
1. Run dry run first
2. Review output carefully
3. Execute live only after dry run success
4. Monitor progress
5. Verify results in CRM

🚀 Let's populate that database!
