# Cleanup Duplicate Boxes Guide

## Problem

Running population scripts multiple times created duplicate box entries in CRM subforms.

**Example:**
```
Box 1: 85x50x16 cm, 37.5g
Box 1: 85x50x16 cm, 37.5g  ← DUPLICATE
Box 1: 85x50x16 cm, 37.5g  ← DUPLICATE
```

This causes:
- Incorrect total weight calculations (3x the actual weight)
- Confusing UI showing multiple identical boxes
- Data quality issues

## Solution

Run the cleanup script to deduplicate all box entries across both Parent_MTP_SKU and Products modules.

## How to Run

### Prerequisites
1. `.env.mcp` file with production Zoho credentials exists
2. MCP server is configured and working

### Steps

```bash
# Navigate to project directory
cd "c:\Users\shubh\Downloads\Dimentions Audit Authenticator"

# Run the cleanup script
node scripts/cleanup_duplicate_boxes.js
```

### What It Does

1. **Fetches all products** from both Parent_MTP_SKU and Products modules
2. **Deduplicates boxes** by comparing:
   - Box number (Box or BL field)
   - Length, Width, Height
   - Weight
3. **Keeps only unique entries** (first occurrence)
4. **Updates CRM** with cleaned data
5. **Shows progress** for each product cleaned

### Expected Output

```
🧹 Starting duplicate box cleanup...

✅ MCP Client connected

📦 Fetching Parent_MTP_SKU products...
   Found 230 parent products

   TU-DSK: 3 → 1 boxes (removed 2 duplicates)
   DC-CLV: 6 → 2 boxes (removed 4 duplicates)
   ...

✅ Parents cleaned: 45
   Total duplicate boxes removed from parents: 128

📦 Fetching Products (children)...
   Found 385 child products

   ...

✅ Children cleaned: 89
   Total duplicate boxes removed from children: 267

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CLEANUP SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Total products cleaned: 134
   - Parents: 45
   - Children: 89

📦 Total duplicate boxes removed: 395
   - From parents: 128
   - From children: 267
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Safety Features

- ✅ **Preserves data**: Only removes exact duplicates
- ✅ **Rate limited**: 500ms delay between updates (prevents API throttling)
- ✅ **Error handling**: Continues on failures, shows which products failed
- ✅ **Dry-run safe**: Can be modified to log changes without applying

### Verification

After running, verify in the app:

1. Go to **Audit Dimensions** dashboard
2. Expand any product row
3. Check **ZOHO CRM (CURRENT)** section
4. Boxes should show **only unique entries** (no more "Box 1, Box 1, Box 1")

### Troubleshooting

**Error: "MCP Client connection failed"**
- Check `.env.mcp` exists with valid credentials
- Verify MCP server is configured correctly

**Error: "Rate limit exceeded"**
- Increase delay in script from 500ms to 1000ms
- Run script again (it will skip already-cleaned products)

**Some products still show duplicates**
- Check if those specific products failed during update
- Re-run script (idempotent - safe to run multiple times)

## Prevention

To prevent duplicates in future:

1. **Check before running scripts**: Use `verify_data_quality.js` first
2. **Clear subforms**: Delete existing subform data before re-populating
3. **Use idempotent scripts**: Scripts should check if data exists before adding
4. **Single execution**: Run population scripts only once in production

## Related Files

- **Script**: `scripts/cleanup_duplicate_boxes.js`
- **Verification**: `scripts/verify_data_quality.js`
- **Population**: `scripts/populate_crm_database_FIXED.js`
