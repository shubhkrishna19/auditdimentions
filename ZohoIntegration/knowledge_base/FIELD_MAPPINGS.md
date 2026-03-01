# Zoho CRM Field Mappings Reference

Complete field reference for all Zoho CRM modules used in integrations.

---

## ⚠️ CRITICAL: Unit Conventions

### Weights
- **ALL weights in CRM are in KILOGRAMS (KG)**
- DO NOT divide by 1000 when reading from CRM
- Excel imports may be in grams → convert by dividing by 1000

### Dimensions
- **ALL dimensions in CRM are in CENTIMETERS (cm)**
- Length, Width, Height all in cm

### Volume
- Calculated as: `Length × Width × Height` (in cm³)
- To convert to m³: divide by 1,000,000

---

## Parent_MTP_SKU Module

**API Name**: `Parent_MTP_SKU`

**Purpose**: Master product definitions (parent SKUs)

### Standard Fields

| Field Label | API Name | Type | Unit | Description |
|------------|----------|------|------|-------------|
| SKU | `Name` | String | - | Parent SKU code (e.g., "TU-DSK") |
| Product Name | `Product_MTP_Name` | String | - | Display name |
| Category | `Product_Category` | Picklist | - | Bed, Mattress, Sofa, etc. |
| Weight Category | `Weight_Category_Billed` | Picklist | - | Shipment category (0.5kg, 1kg, etc.) |
| Billed Weight | `Billed_Physical_Weight` | Decimal | **KG** | Total billed weight in KG |
| Live Status | `Live_Status` | Picklist | - | Y, YB, YD, YH, RL, NL, AR, DI |

### Live Status Values

| Value | Meaning |
|-------|---------|
| Y | Live (standard) |
| YB | Live (B variant) |
| YD | Live (D variant) |
| YH | Live (H variant) |
| RL | Relaunching |
| NL | Not Live |
| AR | Archive |
| DI | Discontinued |

**Mapping for filters**:
- **Live**: Y, YB, YD, YH
- **Not Live**: RL, NL, AR, DI

### Subform: MTP_Box_Dimensions

**API Name**: `MTP_Box_Dimensions`

**Purpose**: Box dimensions for parent SKU

| Field Label | API Name | Type | Unit | Description |
|------------|----------|------|------|-------------|
| Box Number | `Box` | Number | - | Box 1, Box 2, etc. |
| Length | `Length` | Decimal | **cm** | Box length in centimeters |
| Width | `Width` | Decimal | **cm** | Box width in centimeters |
| Height | `Height` | Decimal | **cm** | Box height in centimeters |
| Weight | `Weight` | Decimal | **KG** | Box weight in kilograms |

**Example Data**:
```json
{
  "Box": 1,
  "Length": 85,
  "Width": 50,
  "Height": 16,
  "Weight": 37.5
}
```

---

## Products Module

**API Name**: `Products`

**Purpose**: Child SKUs (variants of parent products)

### Standard Fields

| Field Label | API Name | Type | Unit | Description |
|------------|----------|------|------|-------------|
| Product Code | `Product_Code` | String | - | Child SKU (e.g., "ABC-123") |
| Product Name | `Product_Name` | String | - | Display name |
| MTP SKU | `MTP_SKU` | Lookup | - | Link to Parent_MTP_SKU |
| Category | `Product_Category` | Picklist | - | Inherited from parent |
| Weight Category | `Weight_Category_Billed` | Picklist | - | Shipment category |
| Total Weight | `Total_Weight` | Decimal | **KG** | Billed weight in KG |
| Last Audited Weight | `Last_Audited_Total_Weight_kg` | Decimal | **KG** | Actual measured weight |
| Live Status | `Live_Status` | Picklist | - | Same as parent |

### Lookup Field: MTP_SKU

**Returns**: Object with `{ id, name }`

```javascript
// Example
{
  "MTP_SKU": {
    "id": "4876876000000123456",
    "name": "TU-DSK"
  }
}
```

### Subform: Bill_Dimension_Weight

**API Name**: `Bill_Dimension_Weight`

**Purpose**: Box dimensions for child SKU

| Field Label | API Name | Type | Unit | Description |
|------------|----------|------|------|-------------|
| BL (Box Line) | `BL` | Number | - | Box number (1, 2, 3...) |
| Length | `Length` | Decimal | **cm** | Box length |
| Width | `Width` | Decimal | **cm** | Box width |
| Height | `Height` | Decimal | **cm** | Box height |
| Weight | `Weight` | Decimal | **KG** | Box weight in kilograms |

**Example Data**:
```json
{
  "BL": 1,
  "Length": 202,
  "Width": 108,
  "Height": 27,
  "Weight": 34.4
}
```

### Subform: Product_Identifiers

**API Name**: `Product_Identifiers`

**Purpose**: Platform-specific product IDs

| Field Label | API Name | Type | Description |
|------------|----------|------|-------------|
| Channel | `Channel` | Picklist | Platform name |
| Identifier | `Identifier` | String | Platform product ID |

**Channel Values**:
- Amazon ASIN
- Flipkart FSN
- Urban Ladder
- Pepperfry
- Myntra

**Example Data**:
```json
[
  {
    "Channel": "Amazon ASIN",
    "Identifier": "B07XYZ123"
  },
  {
    "Channel": "Flipkart FSN",
    "Identifier": "MATFU1234567"
  }
]
```

---

## Common Field Patterns

### Reading Subform Data

```javascript
// Parent boxes
const parentBoxes = parentProduct.MTP_Box_Dimensions || [];
parentBoxes.forEach(box => {
  console.log(`Box ${box.Box}: ${box.Length}x${box.Width}x${box.Height} cm, ${box.Weight} kg`);
});

// Child boxes
const childBoxes = childProduct.Bill_Dimension_Weight || [];
childBoxes.forEach(box => {
  console.log(`Box ${box.BL}: ${box.Length}x${box.Width}x${box.Height} cm, ${box.Weight} kg`);
});
```

### Calculating Total Weight from Boxes

```javascript
function calculateTotalWeight(boxes) {
  if (!boxes || boxes.length === 0) return 0;

  return boxes.reduce((total, box) => {
    const weight = parseFloat(box.Weight) || 0;
    return total + weight;
  }, 0);
}

// Usage
const totalWeight = calculateTotalWeight(product.Bill_Dimension_Weight);
console.log(`Total: ${totalWeight} kg`);
```

### Calculating Volume

```javascript
function calculateVolume(box) {
  const length = parseFloat(box.Length) || 0;
  const width = parseFloat(box.Width) || 0;
  const height = parseFloat(box.Height) || 0;

  // Volume in cm³
  const volumeCm3 = length * width * height;

  // Volume in m³
  const volumeM3 = volumeCm3 / 1000000;

  return {
    cm3: volumeCm3,
    m3: volumeM3.toFixed(6)
  };
}

// Usage
const box = { Length: 85, Width: 50, Height: 16 };
const volume = calculateVolume(box);
console.log(`Volume: ${volume.cm3} cm³ = ${volume.m3} m³`);
```

### Determining Shipment Category

```javascript
function getShipmentCategory(weight) {
  // Weight in KG
  if (weight <= 0.5) return '0.5kg';
  if (weight <= 1) return '1kg';
  if (weight <= 2) return '2kg';
  if (weight <= 5) return '5kg';
  if (weight <= 10) return '10kg';
  return '10kg+';
}

// Usage
const category = getShipmentCategory(product.Total_Weight);
```

---

## Data Validation Rules

### Required Fields (Products)

```javascript
const requiredFields = [
  'Product_Code',     // SKU code
  'Product_Name',     // Display name
  'Total_Weight',     // Weight in KG
  'Product_Category', // Category picklist
  'MTP_SKU'          // Parent lookup
];

function validateProduct(product) {
  const missing = requiredFields.filter(field => !product[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Weight validation
  if (product.Total_Weight && product.Total_Weight < 0) {
    throw new Error('Weight cannot be negative');
  }

  // SKU format validation (optional)
  if (!/^[A-Z]{2}-[A-Z]{3}(-[0-9]+)?$/.test(product.Product_Code)) {
    console.warn(`Non-standard SKU format: ${product.Product_Code}`);
  }
}
```

### Box Dimensions Validation

```javascript
function validateBox(box) {
  // Required fields
  if (!box.Length || !box.Width || !box.Height || !box.Weight) {
    throw new Error('All box dimensions are required');
  }

  // Positive values
  if (box.Length <= 0 || box.Width <= 0 || box.Height <= 0 || box.Weight <= 0) {
    throw new Error('Box dimensions must be positive');
  }

  // Reasonable limits (adjust as needed)
  if (box.Length > 500 || box.Width > 500 || box.Height > 500) {
    console.warn(`Unusually large box: ${box.Length}x${box.Width}x${box.Height}`);
  }

  if (box.Weight > 100) {
    console.warn(`Unusually heavy box: ${box.Weight} kg`);
  }
}
```

---

## Excel to CRM Mapping

### Column Name Variants

When parsing Excel files, map these column names to CRM fields:

```javascript
const columnMappings = {
  // SKU
  'Product_Code': ['Product Code', 'SKU', 'SKU Code', 'Child SKU', 'Product_Code'],
  'Name': ['Parent SKU', 'MTP SKU', 'Parent Code'],

  // Names
  'Product_Name': ['Product Name', 'Name', 'Product_Name'],
  'Product_MTP_Name': ['Parent Name', 'MTP Name'],

  // Category
  'Product_Category': ['Category', 'Product Category', 'Product_Category'],

  // Weights (convert grams → kg)
  'Total_Weight': ['Weight', 'Total Weight', 'Weight (kg)', 'Weight (g)'],
  'Weight': ['Box Weight', 'Weight (g)', 'Weight (kg)'],

  // Dimensions (all in cm)
  'Length': ['Length', 'Length (cm)', 'L'],
  'Width': ['Width', 'Width (cm)', 'W', 'Breadth'],
  'Height': ['Height', 'Height (cm)', 'H'],

  // Platform IDs
  'Amazon_ASIN': ['Amazon ASIN', 'ASIN', 'Amazon'],
  'Flipkart_FSN': ['Flipkart FSN', 'FSN', 'Flipkart'],
  'Urban_Ladder': ['Urban Ladder', 'Urban Ladder ID', 'UL ID']
};
```

### Unit Conversion During Import

```javascript
function parseExcelWeight(value, columnName) {
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  // Check column name for unit hint
  if (columnName.includes('(g)') || columnName.includes('grams')) {
    return num / 1000; // Convert to KG
  }

  // Heuristic: if > 1000, likely grams
  if (num > 1000) {
    return num / 1000;
  }

  // Already in KG
  return num;
}

// Usage
const weight = parseExcelWeight(row['Weight'], 'Weight (g)');
```

---

## API Response Structures

### Get Record Response

```json
{
  "data": [
    {
      "id": "4876876000000123456",
      "Product_Code": "ABC-123",
      "Product_Name": "Test Product",
      "Total_Weight": 34.4,
      "Product_Category": "Mattress",
      "MTP_SKU": {
        "id": "4876876000000789012",
        "name": "TU-DSK"
      },
      "Bill_Dimension_Weight": [
        {
          "BL": 1,
          "Length": 202,
          "Width": 108,
          "Height": 27,
          "Weight": 34.4
        }
      ]
    }
  ]
}
```

### Update Response

```json
{
  "data": [
    {
      "code": "SUCCESS",
      "details": {
        "id": "4876876000000123456"
      },
      "message": "record updated",
      "status": "success"
    }
  ]
}
```

### Error Response

```json
{
  "data": [
    {
      "code": "MANDATORY_NOT_FOUND",
      "details": {
        "api_name": "Product_Name"
      },
      "message": "required field not found",
      "status": "error"
    }
  ]
}
```

---

## Quick Reference

### Field Selection String

```javascript
// Minimal fields
const fields = 'Product_Code,Product_Name,Total_Weight';

// With subform
const fields = 'Product_Code,Product_Name,Total_Weight,Bill_Dimension_Weight';

// All fields
const fields = 'all';
```

### Weight Calculation

```javascript
// Sum all box weights
const totalWeight = boxes.reduce((sum, box) => sum + (box.Weight || 0), 0);
```

### Live Status Check

```javascript
const isLive = ['Y', 'YB', 'YD', 'YH'].includes(product.Live_Status);
```

---

**Last Updated**: February 15, 2026
