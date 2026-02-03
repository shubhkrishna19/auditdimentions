# 📖 ZOHO CRM API v5 - COMPLETE REFERENCE GUIDE

**Based on:** Official Zoho CRM Developer Documentation  
**Version:** API v5 (Latest)  
**Purpose:** Complete API reference so AIs don't need to visit dev docs  
**Last Updated:** 2026-02-03

---

## 🎯 IMPORTANT: Base Principles

### **1. ALWAYS Use API Names, Not Field Labels**
```
❌ WRONG: "Product Code" (this is a label)
✅ CORRECT: "Product_Code" (this is the API name)
```

**Why:** Label changes won't break integrations if you use API names.

### **2. Check Field Permissions**
Fields with "Don't Show" permission will still be fetched but may not be editable.

### **3. Use Correct Endpoints**
- US: `https://www.zohoapis.com`
- EU: `https://www.zohoapis.eu`
- IN: `https://www.zohoapis.in`
- AU: `https://www.zohoapis.com.au`
- CN: `https://www.zohoapis.com.cn`

---

## 📚 TABLE OF CONTENTS

1. [Metadata APIs](#metadata-apis)
2. [Bulk Write API](#bulk-write-api)
3. [Bulk Read API](#bulk-read-api)
4. [Standard CRUD APIs](#standard-crud-apis)
5. [Field Types & Validation](#field-types--validation)
6. [Error Codes & Handling](#error-codes--handling)
7. [Rate Limits & Best Practices](#rate-limits--best-practices)

---

## 1️⃣ METADATA APIs

### **1.1 Get Field Metadata**

**Purpose:** Get detailed field information for a module (field types, API names, validations)

**Endpoint:**
```
GET {api-domain}/crm/v5/settings/fields?module={module_api_name}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module` | string | ✅ Yes | Module API name (e.g., `Parent_MTP_SKU`, `Products`) |
| `type` | string | ❌ No | `unused` = unused fields, `all` = all fields. Default = used fields only |
| `include` | string | ❌ No | `allowed_permissions_to_update` = returns permission details |

**Scope Required:**
```
ZohoCRM.settings.fields.READ
OR ZohoCRM.settings.fields.ALL
OR ZohoCRM.settings.ALL
```

**Request Example:**
```bash
curl "https://www.zohoapis.com/crm/v5/settings/fields?module=Parent_MTP_SKU&include=allowed_permissions_to_update" \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN"
```

**Response Example:**
```json
{
  "fields": [
    {
      "system_mandatory": false,
      "private": null,
      "webhook": false,
      "json_type": "string",
      "field_label": "Product Code",
      "tooltip": null,
      "created_source": "default",
      "field_read_only": false,
      "ui_type": 1,
      "read_only": false,
      "association_details": null,
      "quick_sequence_number": null,
      "businesscard_supported": false,
      "currency": {},
      "id": "4150868000000002564",
      "custom_field": false,
      "lookup": {},
      "hipaa_compliance": null,
      "visible": true,
      "length": 100,
      "column_name": "PRODUCTCODE",
      "type": "text",
      "view_type": {
        "view": true,
        "edit": true,
        "quick_create": false,
        "create": true
      },
      "transition_sequence": null,
      "api_name": "Product_Code",
      "unique": {},
      "data_type": "text",
      "formula": {},
      "decimal_place": null,
      "multiselectlookup": {},
      "pick_list_values": [],
      "auto_number": {}
    },
    {
      "system_mandatory": false,
      "json_type": "double",
      "field_label": "Billed Physical Weight",
      "api_name": "Billed_Physical_Weight",
      "data_type": "double",
      "length": 16,
      "decimal_place": 2,
      "custom_field": true,
      "type": "decimal"
    }
  ]
}
```

**Key Response Fields:**

| Field | Description | Use Case |
|-------|-------------|----------|
| `api_name` | Field API name | **USE THIS in all API calls** |
| `field_label` | Display label | For UI only |
| `data_type` | Field data type | Validation |
| `type` | Field type | `text`, `decimal`, `picklist`, `lookup`, etc. |
| `system_mandatory` | If true, cannot be null | Required field validation |
| `custom_field` | true = custom, false = system | Identify custom vs standard |
| `length` | Max characters/digits | Input validation |
| `decimal_place` | Decimal precision | For decimal/currency fields |
| `pick_list_values` | Valid picklist options | Dropdown validation |
| `view_type` | View/edit permissions | Check if field is editable |

**Use in Integration:**
```javascript
// Fetch field metadata to auto-discover API names
const getFieldMeta = async (module) => {
    const response = await fetch(
        `https://www.zohoapis.com/crm/v5/settings/fields?module=${module}`,
        {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`
            }
        }
    );
    
    const data = await response.json();
    
    // Create mapping
    const fieldMap = {};
    data.fields.forEach(field => {
        fieldMap[field.field_label] = {
            apiName: field.api_name,
            type: field.data_type,
            required: field.system_mandatory,
            maxLength: field.length
        };
    });
    
    return fieldMap;
};

// Use it
const fields = await getFieldMeta('Parent_MTP_SKU');
console.log(fields['Product Code'].apiName); // "Product_Code"
```

---

### **1.2 Get Specific Field Details**

**Endpoint:**
```
GET {api-domain}/crm/v5/settings/fields/{field_id}?module={module_api_name}
```

**Use Case:** Get details for a single field by its ID

---

### **1.3 Get Module Metadata**

**Endpoint:**
```
GET {api-domain}/crm/v5/settings/modules
```

**Response:** List of all modules with their API names

**Use Case:** Discover module API names before fetching fields

---

## 2️⃣ BULK WRITE API

**Purpose:** Insert, update, or upsert up to **25,000 records** in a single call

### **2.1 Workflow**

```
1. Prepare CSV file
   ↓
2. Compress to ZIP
   ↓
3. Upload ZIP file → Get file_id
   ↓
4. Create bulk write job → Get job_id
   ↓
5. Poll job status
   ↓
6. Download result CSV
```

---

### **2.2 Step 1: Prepare CSV File**

**CSV Format Rules:**

1. **First row** = Field API names (NOT labels!)
2. **Subsequent rows** = Data
3. **All records** must belong to same module
4. **Encoding:** UTF-8
5. **Delimiters:** Comma (,)
6. **Quotes:** Use double quotes for text with commas

**Example CSV:**
```csv
Product_Code,Billed_Physical_Weight,Billed_Chargeable_Weight
WA-PYS-N,1890,1890
WA-PYT-N,1890,1890
KH-RMT,340,340
```

**For Subforms:**
```csv
Product_Code,Bill_Dimension_Weight
WA-PYS-N,"[{""Box_Number"":1,""Length"":70,""Width"":23,""Height"":5,""Weight"":1890}]"
```

**Picklist Fields:**
```csv
Product_Code,Weight_Category_Billed
WA-PYS-N,5kg
```

**Date Fields:**
```csv
Product_Code,Created_Date
WA-PYS-N,2026-02-03T12:00:00+05:30
```

---

### **2.3 Step 2: Upload ZIP File**

**Endpoint:**
```
POST {api-domain}/crm/bulk/v2.1/write/upload
```

**Request:**
```bash
curl "https://www.zohoapis.com/crm/bulk/v2.1/write/upload" \
  -X POST \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN" \
  -F "file=@products.zip"
```

**Response:**
```json
{
  "status": "success",
  "code": "FILE_UPLOAD_SUCCESS",
  "message": "File uploaded successfully",
  "details": {
    "file_id": "4150868000004395001"
  }
}
```

---

### **2.4 Step 3: Create Bulk Write Job**

**Endpoint:**
```
POST {api-domain}/crm/bulk/v2.1/write
```

**Request Body:**
```json
{
  "operation": "update",
  "callback": {
    "url": "https://your-callback-url.com/bulk-write-callback",
    "method": "post"
  },
  "resource": [
    {
      "type": "data",
      "module": {
        "api_name": "Parent_MTP_SKU"
      },
      "file_id": "4150868000004395001",
      "find_by": "Product_Code",
      "field_mappings": [
        {
          "api_name": "Product_Code",
          "index": 0
        },
        {
          "api_name": "Billed_Physical_Weight",
          "index": 1
        },
        {
          "api_name": "Billed_Chargeable_Weight",
          "index": 2
        }
      ]
    }
  ]
}
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `operation` | string | `insert`, `update`, or `upsert` |
| `resource.module.api_name` | string | Module API name |
| `file_id` | string | From upload response |
| `find_by` | string | **Required for update/upsert**. Unique field to match records |
| `field_mappings` | array | Map CSV columns to fields |
| `callback.url` | string | Optional. URL to receive completion notification |

**find_by Rules:**
- For **update**: Must be a unique field (e.g., `Product_Code`, `id`)
- For **upsert**: Checks if record exists, updates if yes, inserts if no
- For **insert**: Optional. Use to skip duplicates

**Response:**
```json
{
  "status": "success",
  "code": "SUCCESS",
  "message": "Bulk write job scheduled successfully.",
  "details": {
    "id": "4150868000004423001",
    "created_by": {
      "id": "4150868000000000001",
      "name": "Your Name"
    },
    "operation": "update",
    "state": "ADDED",
    "created_time": "2026-02-03T12:00:00+05:30"
  }
}
```

---

### **2.5 Step 4: Check Job Status**

**Endpoint:**
```
GET {api-domain}/crm/bulk/v2.1/write/{job_id}
```

**Request:**
```bash
curl "https://www.zohoapis.com/crm/bulk/v2.1/write/4150868000004423001" \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "4150868000004423001",
      "operation": "update",
      "state": "COMPLETED",
      "result": {
        "page": 1,
        "per_page": 25000,
        "count": 319,
        "download_url": "/crm/bulk/v2.1/write/41508680000044230001/result",
        "total_count": 319
      },
      "file": {
        "status": "COMPLETED",
        "name": "products.zip",
        "added_count": 0,
        "skipped_count": 0,
        "updated_count": 319,
        "total_count": 319
      },
      "created_by": {...},
      "created_time": "2026-02-03T12:00:00+05:30",
      "completed_time": "2026-02-03T12:00:15+05:30"
    }
  ]
}
```

**Job States:**

| State | Description |
|-------|-------------|
| `ADDED` | Job queued |
| `IN PROGRESS` | Processing |
| `COMPLETED` | Successfully completed |
| `FAILED` | Job failed |

---

### **2.6 Step 5: Download Result**

**Endpoint:**
```
GET {api-domain}/crm/bulk/v2.1/write/{job_id}/result
```

**Response:** ZIP file containing result CSV

**Result CSV Format:**
```csv
Product_Code,Billed_Physical_Weight,ROWID,STATUS,ERROR
WA-PYS-N,1890,4150868000002564,success,
WA-PYT-N,1890,4150868000002565,success,
KH-INVALID,340,,error,"Record not found"
```

---

## 3️⃣ BULK READ API

**Purpose:** Fetch up to **200,000 records** in a single call

### **3.1 Create Bulk Read Job**

**Endpoint:**
```
POST {api-domain}/crm/bulk/v2.1/read
```

**Request:**
```json
{
  "callback": {
    "url": "https://your-callback-url.com/bulk-read-callback",
    "method": "post"
  },
  "query": {
    "module": {
      "api_name": "Parent_MTP_SKU"
    },
    "fields": [
      "Product_Code",
      "Billed_Physical_Weight",
      "Billed_Chargeable_Weight"
    ],
    "criteria": "(Product_Code:starts_with:WA)",
    "page": 1
  }
}
```

**Criteria Syntax:**
```
Single condition: (Field_Name:operator:value)
AND: ((Field1:equals:Value1) and (Field2:equals:Value2))
OR: ((Field1:equals:Value1) or (Field2:equals:Value2))
```

**Operators:**
- `equals`
- `not_equal`
- `in`
- `not_in`
- `less_than`
- `less_equal`
- `greater_than`
- `greater_equal`
- `contains`
- `starts_with`
- `ends_with`

**Response:**
```json
{
  "status": "success",
  "data": [{
    "id": "4150868000004443001",
    "operation": "read",
    "state": "ADDED",
    "created_by": {...},
    "created_time": "2026-02-03T12:30:00+05:30"
  }]
}
```

### **3.2 Check Status & Download**

Same as Bulk Write (GET with job_id, then download from  `download_url`)

---

## 4️⃣ STANDARD CRUD APIs

### **4.1 Search Records**

**Endpoint:**
```
GET {api-domain}/crm/v5/{module_api_name}/search?criteria={criteria}
```

**Example:**
```bash
curl "https://www.zohoapis.com/crm/v5/Parent_MTP_SKU/search?criteria=(Product_Code:equals:WA-PYS-N)" \
  -H "Authorization: Zoho-oauthtoken YOUR_ACCESS_TOKEN"
```

**Limits:** Max 200 records per call

---

### **4.2 Get Record by ID**

**Endpoint:**
```
GET {api-domain}/crm/v5/{module_api_name}/{record_id}
```

---

### **4.3 Update Record**

**Endpoint:**
```
PUT {api-domain}/crm/v5/{module_api_name}
```

**Body:**
```json
{
  "data": [{
    "id": "4150868000002564",
    "Product_Code": "WA-PYS-N",
    "Billed_Physical_Weight": 1890
  }]
}
```

**Limits:** Max 100 records per call

---

## 5️⃣ FIELD TYPES & VALIDATION

### **5.1 Common Field Types**

| Type | data_type | Example | Notes |
|------|-----------|---------|-------|
| Single Line | `text` | "Product Name" | Max length in `length` field |
| Multi Line | `textarea` | "Long description..." | |
| Number | `integer` | 42 | Whole numbers only |
| Decimal | `double` | 1890.50 | Check `decimal_place` for precision |
| Currency | `currency` | 1000.00 | Requires currency code |
| Picklist | `picklist` | "5kg" | **Must match exact value** from `pick_list_values` |
| Multi-Select | `multiselectpicklist` | "Option1;Option2" | Semicolon-separated |
| Date | `date` | "2026-02-03" | Format: YYYY-MM-DD |
| DateTime | `datetime` | "2026-02-03T12:00:00+05:30" | ISO 8601 |
| Lookup | `lookup` | { "id": "123" } | Reference to another record |
| Subform | `subform` | [{...}] | Array of objects |

### **5.2 Subform Structure**

**In CSV (Bulk Write):**
```csv
Product_Code,Bill_Dimension_Weight
WA-PYS-N,"[{""Box_Number"":1,""Length"":70}]"
```

**In JSON (Standard API):**
```json
{
  "Product_Code": "WA-PYS-N",
  "Bill_Dimension_Weight": [
    {
      "Box_Number": 1,
      "Length": 70,
      "Width": 23,
      "Height": 5,
      "Weight": 1890
    }
  ]
}
```

---

## 6️⃣ ERROR CODES & HANDLING

### **6.1 Common Error Codes**

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `INVALID_TOKEN` | Invalid access token | Token expired | Refresh token |
| `INVALID_MODULE` | Module not found | Wrong module API name | Check module name |
| `MANDATORY_NOT_FOUND` | Required field missing | Mandatory field not provided | Add required field |
| `INVALID_DATA` | Invalid data | Wrong data type | Check field type |
| `DUPLICATE_DATA` | Duplicate record | Unique field violation | Use upsert or check existing |
| `FIELD_NOT_FOUND` | Field not found | Wrong field API name | Use metadata API |
| `NO_PERMISSION` | No permission | Lack of access | Check scopes/permissions |
| `LIMIT_EXCEEDED` | API limit exceeded | Too many calls | Implement rate limiting |

### **6.2 Error Response Format**

```json
{
  "data": [{
    "code": "INVALID_DATA",
    "details": {
      "expected_data_type": "decimal",
      "api_name": "Billed_Physical_Weight"
    },
    "message": "invalid data",
    "status": "error"
  }]
}
```

---

## 7️⃣ RATE LIMITS & BEST PRACTICES

### **7.1 API Rate Limits**

| Plan | API Calls/Day | API Calls/Minute |
|------|---------------|------------------|
| Free | 5,000 | 10 |
| Standard | 10,000 | 20 |
| Professional | 50,000 | 30 |
| Enterprise | 100,000 | 60 |
| Ultimate | 200,000 | 120 |

### **7.2 Best Practices**

**✅ DO:**
1. Use Bulk APIs for >100 records
2. Cache field metadata (doesn't change often)
3. Implement exponential backoff for retries
4. Use `find_by` with unique fields
5. Batch operations (10 records per batch for standard API)
6. Add delays between batches (500ms)
7. Use webhooks instead of polling when possible
8. Store API names in config files
9. Validate data before sending
10. Log all API responses

**❌ DON'T:**
1. Hardcode field labels
2. Loop without delays
3. Send >25,000 records in bulk write
4. Use search API for large datasets
5. Skip error handling
6. Ignore rate limits
7. Store access tokens in code
8. Use GET for data mutations
9. Send unchanged data on update
10. Mix modules in same CSV

---

## 📋 QUICK REFERENCE CHEATSHEET

```javascript
// Get field metadata
GET /crm/v5/settings/fields?module=Parent_MTP_SKU

// Upload file for bulk write
POST /crm/bulk/v2.1/write/upload

// Create bulk write job
POST /crm/bulk/v2.1/write

// Check bulk job status
GET /crm/bulk/v2.1/write/{job_id}

// Download bulk result
GET /crm/bulk/v2.1/write/{job_id}/result

// Create bulk read job
POST /crm/bulk/v2.1/read

// Search records
GET /crm/v5/{module}/search?criteria=(Field:equals:Value)

// Get record
GET /crm/v5/{module}/{record_id}

// Update record
PUT /crm/v5/{module}

// Insert record
POST /crm/v5/{module}
```

---

**REMEMBER:** This guide is based on official Zoho documentation. When in doubt, API names > Labels, Bulk APIs > Standard APIs for large datasets, and always validate before syncing! 🎯
