# Bulk Update Parent MTP SKU Statuses - Quick Guide

## 🎯 Purpose

This is a **one-time script** to populate the `ProductActive` field for ALL existing Parent MTP SKU records by looking at their children's `Live_Status`.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create the Function

1. **Go to Zoho CRM** → Setup → Developer Hub → **Functions**
2. **Click "New Function"**
3. **Configure:**
   - **Function Name:** `bulkUpdateAllParentStatuses`
   - **Display Name:** `Bulk Update All Parent Statuses`
   - **Category:** `Automation`

4. **Paste code** from: `generated/bulk_update_parent_statuses.deluge`

5. **No arguments needed** - leave empty

6. **Click "Save"**

---

### Step 2: Run the Function

1. **Click "Execute"** button in the function editor
2. **Wait** for it to complete (may take 1-2 minutes)
3. **Check the logs** - you'll see:
   ```
   Processing Parent: [Name] (ID: [ID])
   Children: X, New Status: Y or NA
   ✅ Updated successfully
   ```

4. **Result:** You'll see a summary like:
   ```
   Bulk update complete! Updated: 50, Skipped: 0
   ```

---

## ✅ What It Does

For **every** Parent MTP SKU record:
1. Searches all child Products
2. Checks if ANY child has `Live_Status = Y`
3. Sets parent `ProductActive`:
   - **Y** if at least one child is live
   - **NA** if no children or all inactive

---

## ⚠️ Important Notes

### Record Limits
- Script processes **200 records per run** (Zoho API limit)
- If you have more than 200 parents, you'll need to:
  - Run it multiple times, OR
  - Modify the script to use pagination

### Performance
- Takes ~1-2 seconds per parent record
- 100 parents = ~2-3 minutes total
- Check execution logs for progress

### After Running
- All existing Parent MTP SKU records will have `ProductActive` set
- Future updates will be handled by the workflow (from previous step)

---

## 🧪 Verify Results

After running:

1. **Go to Parent_MTP_SKU module**
2. **Open any record**
3. **Check `ProductActive` field** - should show Y or NA
4. **Verify it matches children's status**

---

## 🔄 When to Run Again

Run this script again if:
- You bulk import new Parent MTP SKU records
- ProductActive field gets cleared/corrupted
- You want to refresh all statuses at once

---

## 🆘 Troubleshooting

### "No records to update"
- Check if Parent_MTP_SKU module has records
- Verify module API name is correct

### Some records not updated
- Check execution logs for errors
- Verify you have edit permissions on Parent_MTP_SKU
- Check if records are locked

### Script times out
- Reduce the page size from 200 to 50
- Run multiple times to process all records

---

## ✅ Quick Checklist

- [ ] Function created with correct name
- [ ] Code pasted from generated file
- [ ] Function saved successfully
- [ ] Clicked "Execute" button
- [ ] Waited for completion
- [ ] Checked execution logs
- [ ] Verified a few Parent records manually
- [ ] Confirmed ProductActive field is populated

---

**After this one-time bulk update, use the workflow (from previous guide) to keep statuses updated automatically!** 🚀
