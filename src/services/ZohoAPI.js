// Zoho CRM API Service
// Handles fetching product data from Zoho CRM

class ZohoAPI {
    constructor() {
        this.baseURL = 'https://www.zohoapis.com/crm/v2';
        this.isInitialized = false;
    }

    // Initialize Zoho SDK
    async init() {
        return new Promise((resolve) => {
            if (typeof ZOHO !== 'undefined') {
                ZOHO.embeddedApp.on("PageLoad", async (data) => {
                    console.info('[ZohoAPI] 🔍 Starting API Field Scan...');
                    this.isInitialized = true;

                    // Scan both modules to find correct field names
                    await this.scanModuleFields("Parent_MTP_SKU");
                    await this.scanModuleFields("Products");

                    resolve(true);
                });
                ZOHO.embeddedApp.init();
            } else {
                console.warn('[ZohoAPI] Zoho SDK not loaded - using mock data');
                this.isInitialized = false;
                resolve(false);
            }
        });
    }

    // Diagnostic tool to see EXACT API names in your CRM
    async scanModuleFields(moduleName) {
        try {
            const response = await ZOHO.CRM.META.getFields({ "Entity": moduleName });
            if (response.fields) {
                const map = response.fields.reduce((acc, f) => {
                    acc[f.field_label] = f.api_name + (f.data_type === 'subform' ? ' [SUBFORM]' : '');
                    return acc;
                }, {});

                console.group(`[ZohoAPI] 🗺️ Module: ${moduleName}`);
                console.table(map);

                // Highlight Subforms specifically
                const subforms = response.fields.filter(f => f.data_type === 'subform');
                if (subforms.length > 0) {
                    console.log(`[ZohoAPI] 📦 Subforms found in ${moduleName}:`, subforms.map(s => s.api_name));
                }

                console.groupEnd();
                return response.fields;
            }
        } catch (error) {
            console.error(`[ZohoAPI] Failed to scan ${moduleName}:`, error);
        }
    }

    // Fetch all products with dimensions and weights
    async fetchProducts() {
        if (!this.isInitialized) {
            console.warn('Zoho SDK not initialized - waiting or using mock');
            await this.init();
            if (!this.isInitialized) return this.getMockProducts();
        }

        try {
            console.log('[ZohoAPI] Fetching records from Zoho CRM...');

            const allProducts = [];

            // 1. Fetch Parent MTP SKUs
            let parentProducts = [];
            try {
                console.log('[ZohoAPI] Fetching Parent MTP SKUs...');
                const allParents = await this.fetchAllRecords("Parent_MTP_SKU");

                parentProducts = allParents.map(parent => {
                    // 📦 Subform: Weight and Audit Details (MTP_Box_Dimensions)
                    const mtpBoxes = (parent.MTP_Box_Dimensions || []).map(box => ({
                        boxNumber: box.Box || '1',
                        measurement: box.Box_Measurement || 'cm',
                        length: parseFloat(box.Length) || 0,
                        width: parseFloat(box.Width) || 0,
                        height: parseFloat(box.Height) || 0,
                        weightMeasurement: box.Weight_Measurement || 'Gram',
                        weight: (parseFloat(box.Weight) || 0) / 1000 // Convert Grams to KG
                    }));

                    const boxesSum = mtpBoxes.reduce((acc, b) => acc + b.weight, 0);
                    // For Parent, Total_Weight is Formula, so we use Billed_Physical_Weight
                    const billedWeight = (parseFloat(parent.Billed_Physical_Weight) || parseFloat(parent.Total_Weight) || 0) / 1000;

                    return {
                        id: parent.id,
                        skuCode: parent.Name || `MTP-${parent.id}`,
                        productName: parent.Product_MTP_Name || parent.Name || 'Unnamed Parent SKU',
                        productType: 'parent',
                        mtpSkuName: parent.Name || 'N/A',
                        mtpSkuId: parent.id,
                        parentId: null,

                        boxes: mtpBoxes,
                        billedTotalWeight: billedWeight || boxesSum,

                        // Fields specific to Parent MTP SKU
                        lastAuditedWeight: 0, // Parent doesn't seem to have last_audited_total_weight field in scan?
                        weightVariance: 0,
                        weightCategoryBilled: parent.Weight_Category_Billed || '',
                        weightCategoryAudited: '',
                        categoryMismatch: !!parent.Checkbox_1, // Mapping Product_Active to UI
                        lastAuditDate: null,

                        auditedWeight: null,
                        auditedBoxes: [],
                        variations: null,
                        hasAudit: false,
                        raw: parent
                    };
                });

                allProducts.push(...parentProducts);
            } catch (e) {
                console.warn('Parent Fetch Failed:', e);
            }

            // 2. Fetch Child Products
            console.log('[ZohoAPI] Fetching Child Products...');
            const allChildRecords = await this.fetchAllRecords("Products");

            const childProducts = allChildRecords.map(product => {
                const mtpLookup = product.MTP_SKU;

                // 📦 Subform: Box Dimensions (Bill_Dimension_Weight)
                const productBoxes = (product.Bill_Dimension_Weight || []).map(box => ({
                    boxNumber: box.BL || '1', // Subform field is BL for products!
                    measurement: box.Box_Measurement || 'cm',
                    length: parseFloat(box.Length) || 0,
                    width: parseFloat(box.Width) || 0,
                    height: parseFloat(box.Height) || 0,
                    weightMeasurement: box.Weight_Measurement || 'Gram',
                    weight: (parseFloat(box.Weight) || 0) / 1000
                }));

                const boxesSum = productBoxes.reduce((acc, b) => acc + b.weight, 0);

                return {
                    id: product.id,
                    skuCode: product.Product_Code || product.Name,
                    productName: product.Product_Name || product.Name,
                    productType: 'child',
                    mtpSkuName: mtpLookup?.name || '',
                    mtpSkuId: mtpLookup?.id || '',
                    parentId: mtpLookup?.id || null,

                    boxes: productBoxes,
                    billedTotalWeight: (parseFloat(product.Total_Weight) || 0) / 1000 || boxesSum,

                    // Fields specific to Products Module (note the _kg suffixes discovered in scan!)
                    lastAuditedWeight: (parseFloat(product.Last_Audited_Total_Weight_kg) || 0) / 1000,
                    weightVariance: (parseFloat(product.Weight_Variance_kg) || 0) / 1000,
                    weightCategoryBilled: product.Weight_Category_Billed || '',
                    weightCategoryAudited: product.Weight_Category_Audited || '',
                    categoryMismatch: product.Category_Mismatch || false,
                    lastAuditDate: product.Last_Audit_Date || null,

                    auditedWeight: null,
                    auditedBoxes: [],
                    variations: null,
                    hasAudit: false,
                    raw: product
                };
            });

            allProducts.push(...childProducts);
            console.log(`[ZohoAPI] Fetched ${childProducts.length} child products`);

            console.log(`[ZohoAPI] Total products loaded: ${allProducts.length} (${parentProducts.length} parents, ${childProducts.length} children)`);
            return allProducts;
        } catch (error) {
            console.error('Error fetching products:', error);
            return this.getMockProducts();
        }
    }

    // Helper method to fetch all records with pagination
    async fetchAllRecords(moduleName, page = 1, allRecords = []) {
        try {
            const response = await ZOHO.CRM.API.getAllRecords({
                Entity: moduleName,
                sort_order: "asc",
                per_page: 200,
                page: page
            });

            if (response.data && response.data.length > 0) {
                allRecords.push(...response.data);
                console.log(`[ZohoAPI] Page ${page}: ${response.data.length} records (Total: ${allRecords.length})`);

                // Check if there are more records
                if (response.info && response.info.more_records) {
                    return this.fetchAllRecords(moduleName, page + 1, allRecords);
                }
            }

            return allRecords;
        } catch (error) {
            console.error(`Error fetching ${moduleName} page ${page}:`, error);
            return allRecords; // Return what we have so far
        }
    }

    // Update product with audit results
    async updateProduct(productId, auditData) {
        try {
            // 🚀 Use the Catalyst Hub for the smart 'Inheritance' logic (Parent -> Children)
            // This replicates the successful logic from our manual script
            return await this._updateViaCatalystHub(productId, auditData);
        } catch (error) {
            console.error('[ZohoAPI] Update failed:', error);
            // Fallback to widget if hub fails
            if (typeof ZOHO !== 'undefined' && this.isInitialized) {
                return await this._updateViaWidget(productId, auditData);
            }
            return { success: false, error: error.message };
        }
    }

    async _updateViaWidget(productId, auditData) {
        if (!productId) return { success: false, error: 'Missing ID' };

        const isParent = auditData.productType === 'parent';
        const entity = isParent ? 'Parent_MTP_SKU' : 'Products';

        console.group(`[ZohoAPI] 🚀 SYNC INITIATED: ${entity}`);
        console.log('Record ID:', productId);

        let apiData = { id: String(productId) };
        const weightKG = Number(auditData.auditedWeight) || 0;
        const weightGrams = Math.round(weightKG * 1000);

        if (isParent) {
            // 🏗️ PARENT MODULE: Only sending fields found in your scan
            apiData = {
                ...apiData,
                Billed_Physical_Weight: weightGrams,
                Billed_Chargeable_Weight: weightGrams,
                Billed_Volumetric_Weight: weightGrams,
                BOM_Weight: weightGrams,
                Weight_Category_Billed: String(auditData.auditedCategory || auditData.billedCategory || ''),
                Processing_Status: 'Y',
                Audit_History_Log: `Audited ${new Date().toLocaleDateString()}. Weight: ${weightKG}kg`,
                ProductActive: 'Y' // Found in your scan as a Picklist
            };

            if (auditData.auditedBoxes?.length > 0) {
                apiData.MTP_Box_Dimensions = auditData.auditedBoxes.map((box, idx) => ({
                    Box: String(idx + 1), // Exact field from scan
                    Length: Number(box.length) || 0,
                    Width: Number(box.width) || 0,
                    Height: Number(box.height) || 0,
                    Weight: Math.round((Number(box.weight) || 0) * 1000), // Grams for storage
                    Box_Measurement: "cm",
                    Weight_Measurement: "Gram"
                }));
            }
        } else {
            // 📦 PRODUCT MODULE: Using the "_kg" fields found in your scan
            apiData = {
                ...apiData,
                Total_Weight: weightKG, // Formula in scan, but often allowing writes
                Last_Audited_Total_Weight_kg: weightKG, // Explicit (kg) field from scan
                Weight_Variance_kg: Number(auditData.variance) || 0,
                Weight_Category_Billed: String(auditData.billedCategory || ''),
                Weight_Category_Audited: String(auditData.auditedCategory || ''),
                Category_Mismatch: !!auditData.categoryMismatch,
                Last_Audit_Date: new Date().toISOString().split('T')[0]
            };

            if (auditData.auditedBoxes?.length > 0) {
                apiData.Bill_Dimension_Weight = auditData.auditedBoxes.map((box, idx) => ({
                    BL: String(idx + 1), // Exact field from scan
                    Length: Number(box.length) || 0,
                    Width: Number(box.width) || 0,
                    Height: Number(box.height) || 0,
                    Weight: Number(box.weight) || 0, // Product subform weight looks like Decimal
                    Box_Measurement: "cm",
                    Weight_Measurement: "kg"
                }));
            }
        }

        console.log('Final API Payload:', apiData);
        console.groupEnd();

        try {
            const response = await ZOHO.CRM.API.updateRecord({
                Entity: entity,
                APIData: apiData
            });

            const result = response.data?.[0];
            console.log(`[ZohoAPI] CRM Response (${entity}):`, result);

            if (result?.code === 'SUCCESS') {
                return { success: true };
            } else {
                return { success: false, error: result?.message || 'Update rejected by Zoho' };
            }
        } catch (error) {
            console.error('[ZohoAPI] SDK CRASH:', error);
            return { success: false, error: error.message };
        }
    }

    async _updateViaCatalystHub(productId, auditData) {
        const HUB_URL = 'https://zohocrmbulkdataprocessingintegrityengine-913495338.development.catalystserverless.com/server/ZohoSyncHub/';

        const response = await fetch(HUB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_single',
                sku: auditData.skuCode,
                data: {
                    weights: {
                        physical: auditData.auditedWeight,
                        chargeable: auditData.auditedWeight,
                        category: auditData.auditedCategory || auditData.billedCategory
                    },
                    boxes: auditData.auditedBoxes || auditData.boxes || []
                }
            })
        });

        return await response.json();
    }

    // Batch update multiple products (Legacy support - usually mapped to single updates)
    async batchUpdateProducts(updates) {
        console.log(`[ZohoAPI] Processing batch of ${updates.length} updates...`);
        const results = [];
        for (const update of updates) {
            const res = await this.updateProduct(update.productId, update);
            results.push(res);
        }
        return { success: true, results };
    }

    // Mock data for development
    getMockProducts() {
        return [
            {
                id: '1',
                productCode: 'PROD001',
                productName: 'Sample Product 1',
                boxes: [
                    {
                        boxNumber: 1,
                        measurement: 'cm',
                        length: 10.5,
                        width: 5.2,
                        height: 3.1,
                        weightMeasurement: 'kg',
                        weight: 2.5
                    },
                    {
                        boxNumber: 2,
                        measurement: 'cm',
                        length: 8.0,
                        width: 4.0,
                        height: 2.0,
                        weightMeasurement: 'kg',
                        weight: 1.2
                    }
                ],
                billedTotalWeight: 3.7,
                lastAuditedWeight: 0,
                weightVariance: 0,
                weightCategoryBilled: '',
                weightCategoryAudited: '',
                categoryMismatch: false,
                lastAuditDate: null
            },
            {
                id: '2',
                productCode: 'PROD002',
                productName: 'Sample Product 2',
                boxes: [
                    {
                        boxNumber: 1,
                        measurement: 'cm',
                        length: 12.0,
                        width: 6.0,
                        height: 4.5,
                        weightMeasurement: 'kg',
                        weight: 5.2
                    }
                ],
                billedTotalWeight: 5.2,
                lastAuditedWeight: 0,
                weightVariance: 0,
                weightCategoryBilled: '',
                weightCategoryAudited: '',
                categoryMismatch: false,
                lastAuditDate: null
            }
        ];
    }
}

export default new ZohoAPI();
