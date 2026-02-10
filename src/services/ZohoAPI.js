import { MOCK_PRODUCTS } from './mockData';

class ZohoAPI {
    constructor() {
        this.baseURL = 'https://www.zohoapis.com/crm/v2';
        this.isInitialized = false;
        this.mode = import.meta.env.VITE_API_MODE || 'mock';
        this.sdkReady = null;

        console.log(`[ZohoAPI] Initializing in ${this.mode.toUpperCase()} mode`);

        // Setup initialization promise
        if (this.mode === 'live') {
            this.sdkReady = new Promise((resolve, reject) => {
                // Wait for ZOHO object to be available
                const checkZoho = setInterval(() => {
                    if (window.ZOHO && window.ZOHO.embeddedApp) {
                        clearInterval(checkZoho);
                        console.log('[ZohoAPI] ZOHO SDK found, initializing...');
                        window.ZOHO.embeddedApp.init().then(() => {
                            console.log('[ZohoAPI] ZOHO SDK Initialized successfully');
                            this.isInitialized = true;
                            resolve();
                        }).catch(err => {
                            console.error('[ZohoAPI] ZOHO SDK Init Failed:', err);
                            reject(err);
                        });
                    }
                }, 100);

                // Timeout after 10s if not found (e.g. running outside CRM)
                setTimeout(() => {
                    clearInterval(checkZoho);
                    if (!this.isInitialized) {
                        console.warn('[ZohoAPI] ZOHO SDK not found (Timeout). Are you running inside CRM?');
                        reject(new Error('Zoho SDK Timeout'));
                    }
                }, 10000);
            });
        }
    }

    // Initialize
    async init() {
        if (this.mode === 'mock') {
            this.isInitialized = true;
            return true;
        }
        try {
            await this.sdkReady;
            return true;
        } catch (e) {
            console.error('[ZohoAPI] Init failed:', e);
            return false;
        }
    }

    // Fetch products
    async fetchProducts() {
        if (this.mode === 'mock') {
            console.log('[ZohoAPI] Returning MOCK_PRODUCTS');
            await new Promise(r => setTimeout(r, 800));
            return MOCK_PRODUCTS;
        }

        try {
            await this.sdkReady;
            console.log('[ZohoAPI] Fetching LIVE data via ZOHO SDK...');

            // 1. Fetch Parent SKUs
            const parentsParams = { Entity: "Parent_MTP_SKU", sort_order: "asc", per_page: 200 };
            const parentResp = await window.ZOHO.CRM.API.getAllRecords(parentsParams);
            const parentsRaw = parentResp.data || [];
            console.log(`[ZohoAPI] Raw: Fetched ${parentsRaw.length} Parents`);

            // 2. Fetch Child Products
            const childParams = { Entity: "Products", sort_order: "asc", per_page: 200 };
            const childResp = await window.ZOHO.CRM.API.getAllRecords(childParams);
            const childrenRaw = childResp.data || [];
            console.log(`[ZohoAPI] Raw: Fetched ${childrenRaw.length} Children`);

            // ---------------------------------------------------------
            // DATA LINKER LOGIC
            // ---------------------------------------------------------
            console.groupCollapsed('🔗 Data Relationship Linking');

            const parentMap = new Map();
            const allProducts = [];
            const processedParents = [];

            // A. Process Parents
            parentsRaw.forEach(p => {
                const parentObj = {
                    id: p.id,
                    skuCode: p.Name,
                    productName: p.Product_MTP_Name || p.Name,
                    productType: 'parent',
                    // WEIGHT FIX: Assume Zoho stores KG directly (e.g., 40 = 40kg). Do not divide by 1000.
                    billedTotalWeight: (Number(p.Billed_Physical_Weight) || 0),
                    hasAudit: false,
                    boxes: (p.MTP_Box_Dimensions || []).map(b => ({
                        boxNumber: b.Box,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: (Number(b.Weight) || 0) // Assume KG
                    })),
                    // Linking Metadata
                    children: [],
                    childIds: []
                };
                parentMap.set(p.id, parentObj);
                processedParents.push(parentObj);
            });

            // B. Process Children & Link to Parents
            const processedChildren = [];
            childrenRaw.forEach(c => {
                const parentId = c.MTP_SKU ? c.MTP_SKU.id : null;

                const childObj = {
                    id: c.id,
                    skuCode: c.Product_Code,
                    productName: c.Product_Name,
                    productType: 'child',
                    // WEIGHT FIX: Assume KG
                    billedTotalWeight: (Number(c.Total_Weight) || 0),
                    auditedWeight: (Number(c.Last_Audited_Total_Weight_kg) || 0),
                    hasAudit: !!c.Last_Audited_Total_Weight_kg,
                    parentId: parentId,
                    boxes: (c.Bill_Dimension_Weight || []).map(b => ({
                        boxNumber: b.BL,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: b.Weight // Assume KG
                    }))
                };

                processedChildren.push(childObj);

                // Perform Linking
                if (parentId && parentMap.has(parentId)) {
                    const parent = parentMap.get(parentId);
                    parent.children.push(childObj.skuCode); // Store SKU string relation
                    parent.childIds.push(childObj.id);      // Store ID relation
                } else if (parentId) {
                    console.warn(`⚠️ Child ${childObj.skuCode} has Parent ID ${parentId} but Parent not found in fetched set.`);
                }
            });

            // C. Visual Verification Log
            console.log('--- Relationship Report ---');
            let linkedParents = 0;
            processedParents.forEach(p => {
                if (p.children.length > 0) {
                    console.log(`✅ Parent [${p.skuCode}] -> Children: [${p.children.join(', ')}]`);
                    linkedParents++;
                }
            });
            console.log(`Summary: ${linkedParents}/${processedParents.length} Parents have linked Children.`);
            console.groupEnd();

            allProducts.push(...processedParents, ...processedChildren);

            console.log(`[ZohoAPI] returning ${allProducts.length} total items`);
            return allProducts;

        } catch (error) {
            console.error('[ZohoAPI] Live Fetch Failed:', error);
            return [];
        }
    }

    // Update product with audit results
    async updateProduct(productId, auditData) {
        if (this.mode === 'mock') {
            return { success: true };
        }

        try {
            await this.sdkReady;

            const sku = auditData.skuCode;
            const weightKG = Number(auditData.auditedWeight || auditData.weights.chargeable) || 0;
            // WEIGHT FIX: Send KG directly. No conversion to grams.
            const category = auditData.auditedCategory || auditData.weights.category;

            // 1. Try search in Parent Module
            const parentSearch = await window.ZOHO.CRM.API.searchRecord({ Entity: "Parent_MTP_SKU", Type: "criteria", Query: `(Product_Code:equals:${sku})` });

            if (parentSearch.data && parentSearch.data.length > 0) {
                const parent = parentSearch.data[0];
                const updateData = {
                    id: parent.id,
                    Billed_Physical_Weight: weightKG,
                    Billed_Chargeable_Weight: weightKG,
                    Weight_Category_Billed: category
                };

                // Boxes...
                if (auditData.boxes && auditData.boxes.length > 0) {
                    updateData.MTP_Box_Dimensions = auditData.boxes.map((b, idx) => ({
                        Box: String(idx + 1),
                        Length: Number(b.length), Width: Number(b.width), Height: Number(b.height),
                        Weight: Number(b.weight), // Keep as KG
                        Box_Measurement: 'cm', Weight_Measurement: 'kg'
                    }));
                }

                await window.ZOHO.CRM.API.updateRecord({ Entity: "Parent_MTP_SKU", APIData: updateData });
                return { success: true, message: 'Parent Updated' };
            }

            // 2. Try search in Products Module
            const childSearch = await window.ZOHO.CRM.API.searchRecord({ Entity: "Products", Type: "criteria", Query: `(Product_Code:equals:${sku})` });

            if (childSearch.data && childSearch.data.length > 0) {
                const child = childSearch.data[0];
                const updateData = {
                    id: child.id,
                    Last_Audited_Total_Weight_kg: weightKG,
                    Total_Weight: weightKG,
                    Weight_Category_Billed: category,
                    Last_Audit_Date: new Date().toISOString().split('T')[0]
                };

                if (auditData.boxes && auditData.boxes.length > 0) {
                    updateData.Bill_Dimension_Weight = auditData.boxes.map((b, idx) => ({
                        BL: String(idx + 1),
                        Length: Number(b.length), Width: Number(b.width), Height: Number(b.height),
                        Weight: Number(b.weight),
                        Box_Measurement: 'cm', Weight_Measurement: 'kg'
                    }));
                }

                await window.ZOHO.CRM.API.updateRecord({ Entity: "Products", APIData: updateData });
                return { success: true, message: 'Child Updated' };
            }

            return { success: false, error: 'Product not found in CRM' };

        } catch (error) {
            console.error('[ZohoAPI] Update failed:', error);
            return { success: false, error: error.message };
        }
    }

    async batchUpdateProducts(updates) {
        const results = [];
        for (const update of updates) {
            results.push(await this.updateProduct(update.productId, update));
        }
        return { success: true, results };
    }
}

export default new ZohoAPI();
