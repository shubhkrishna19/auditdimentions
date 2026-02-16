import fs from 'fs';
import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import dotenv from 'dotenv';
dotenv.config();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN;
const PARENT_MODULE = 'Parent_MTP_SKU';
const CHILD_MODULE = 'Products';

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
    params.append('client_id', process.env.ZOHO_CLIENT_ID);
    params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');

    try {
        const response = await axios.post(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, params);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching token:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Keyword Extractor for Product Categories
const keywords = ['Shoe Rack', 'TV Unit', 'Wardrobe', 'Table', 'Sofa', 'Chair', 'Bed', 'Shelf', 'Desk', 'Cabinet', 'Bookshelf'];
const extractCategory = (name) => {
    if (!name) return 'Furniture';
    return keywords.find(k => name.includes(k)) || 'Furniture';
};

// Load Master Data
console.log('📦 Loading Excel Data...');
const wb = XLSX.readFile('./SKU Aliases, Parent & Child Master Data (1).xlsx');
const sheet = wb.Sheets['Child SKUs - Alias Master'];
const childData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Helper to find row by SKU
const findRow = (sku) => childData.find(r => String(r[0]).trim() === sku);

// Helper to get identifiers
const getIdentifiers = (row) => {
    const ids = [];
    if (row[8]) ids.push({ Channel: 'Barcode', Identifier: String(row[8]) });
    if (row[10]) ids.push({ Channel: 'Amazon ASIN', Identifier: String(row[10]) }); // ASIN
    if (row[11]) ids.push({ Channel: 'FK FSN', Identifier: String(row[11]) });   // Flipkart FSN (L)
    if (row[12]) ids.push({ Channel: 'FK List ID', Identifier: String(row[12]) }); // List ID
    if (row[13]) ids.push({ Channel: 'ULSN', Identifier: String(row[13]) });      // ULSN
    if (row[14]) ids.push({ Channel: 'PFSN', Identifier: String(row[14]) });      // PFSN
    if (row[15]) ids.push({ Channel: 'Myntra', Identifier: String(row[15]) });    // Myntra
    return ids;
};

// Load Unified Data for Weight/Category info
const unifiedData = JSON.parse(fs.readFileSync('./unified_master_data.json', 'utf8'));
const getUnified = (sku) => unifiedData.find(u => u.sku === sku);

// Parent ID Cache
const parentIdCache = new Map();

async function getParentId(parentSku, headers) {
    if (parentIdCache.has(parentSku)) return parentIdCache.get(parentSku);

    try {
        const search = await axios.get(`${ZOHO_API_DOMAIN}/crm/v2/${PARENT_MODULE}/search?criteria=(Name:equals:${parentSku})`, { headers });
        const id = search.data.data?.[0]?.id;
        if (id) {
            parentIdCache.set(parentSku, id);
            return id;
        }
    } catch (e) {
        console.log(`⚠️ Failed to fetch Parent ${parentSku}`);
    }
    return null;
}

async function runCorrectiveUpdate() {
    const token = await getAccessToken();
    const headers = { Authorization: `Zoho-oauthtoken ${token}` };

    console.log('🚀 Starting Corrective Update...');
    console.log('Target: Deduplicate Subforms, Fix Categories, Identifiers, Prices, Manufacture, AND LINK PARENTS');

    // Process Unified List (Parents & Children)
    for (let i = 0; i < unifiedData.length; i++) {
        const item = unifiedData[i];
        const isParent = item.module === PARENT_MODULE;
        const module = isParent ? PARENT_MODULE : CHILD_MODULE;
        const sku = item.sku;

        process.stdout.write(`[${i + 1}/${unifiedData.length}] Checking ${sku}... `);

        try {
            // 1. Fetch Existing Record
            const search = await axios.get(`${ZOHO_API_DOMAIN}/crm/v2/${module}/search?criteria=(${isParent ? 'Name' : 'Product_Code'}:equals:${sku})`, { headers });
            const record = search.data.data?.[0];

            if (!record) {
                console.log('⚠️ Not Found in Zoho, skipping.');
                continue;
            }

            const excelRow = !isParent ? findRow(sku) : null;
            const payload = { id: record.id };
            let updatesNeeded = false;

            // --- A. Fix Manufacturer ---
            if (record.Manufacturer !== 'Bluewud Concepts Pvt. Ltd.') {
                payload.Manufacturer = 'Bluewud Concepts Pvt. Ltd.';
                updatesNeeded = true;
            }

            // --- B. Fix Product Category (Real Category) ---
            const realCategory = extractCategory(item.name);
            // Check if current category is a weight (e.g. contains 'kg') or empty
            const currentCat = record.Product_Category || '';
            const isWeight = currentCat.toLowerCase().includes('kg') || currentCat.toLowerCase().includes('volume');

            if (!currentCat || isWeight || currentCat !== realCategory) {
                payload.Product_Category = realCategory;
                updatesNeeded = true;
            }

            // --- C. Fix Subform Duplication (Box Dimensions) ---
            // If more rows than actual box count, or if rows have duplicate Box numbers
            const subformName = isParent ? 'MTP_Box_Dimensions' : 'Bill_Dimension_Weight';
            const currentBoxes = record[subformName] || [];
            const correctBoxes = item.dimensions.boxes || [];

            if (currentBoxes.length > correctBoxes.length || currentBoxes.length === 0) {
                // Replace with clean list
                payload[subformName] = correctBoxes.map((b, idx) => ({
                    Box: String(idx + 1), // Parent
                    BL: String(idx + 1),  // Child
                    Length: b.length,
                    Width: b.width,
                    Height: b.height,
                    Weight: parseFloat((b.weightGrams / 1000).toFixed(2)),
                    Box_Measurement: 'cm',
                    Weight_Measurement: 'kg' // Explicitly set kg
                }));
                updatesNeeded = true;
            }

            // --- D. Fix Identifiers (Child Only) ---
            if (!isParent && excelRow) {
                const ids = getIdentifiers(excelRow);
                if (ids.length > 0) {
                    payload.Product_Identifiers = ids;
                    updatesNeeded = true;
                }
            }

            // --- E. Fix Prices (Child Only) ---
            if (!isParent && excelRow) {
                // Update Unit Price if different (Column 7 is MRP)
                const excelMRP = parseFloat(excelRow[7]) || 0;
                if (excelMRP > 0 && record.Unit_Price !== excelMRP) {
                    payload.Unit_Price = excelMRP;
                    updatesNeeded = true;
                }
            }

            // --- F. Ensure Live Status ---
            if (!isParent && item.liveStatus && record.Live_Status !== item.liveStatus) {
                payload.Live_Status = item.liveStatus;
                updatesNeeded = true;
            }

            // --- G. Link to Parent (MTP_SKU) ---
            if (!isParent && item.parentSku) {
                // Check if already linked correctly
                // API returns { name: 'ParentSKU', id: '123' } or null
                const currentParentName = record.MTP_SKU?.name;

                if (currentParentName !== item.parentSku) {
                    process.stdout.write(`Linking to ${item.parentSku}... `);
                    const parentId = await getParentId(item.parentSku, headers);
                    if (parentId) {
                        payload.MTP_SKU = parentId; // Lookup expects ID
                        updatesNeeded = true;
                    }
                }
            }

            if (updatesNeeded) {
                process.stdout.write('Updating... ');
                await axios.put(`${ZOHO_API_DOMAIN}/crm/v2/${module}`, { data: [payload] }, { headers });
                console.log('✅ Done.');
            } else {
                console.log('✨ Already Clean.');
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (e) {
            console.log('❌ Error:', e.response?.data?.message || e.message);
        }
    }
}

runCorrectiveUpdate();
