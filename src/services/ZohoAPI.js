import { MOCK_PRODUCTS } from './mockData';

class ZohoAPI {
    constructor() {
        this.baseURL = 'https://www.zohoapis.com/crm/v2';
        this.isInitialized = false;
        this.mode = import.meta.env.VITE_API_MODE || 'mock';
        this.sdkReady = null;

        // Setup initialization promise
        if (this.mode === 'live') {
            this.sdkReady = new Promise((resolve, reject) => {
                const checkZoho = setInterval(() => {
                    if (window.ZOHO && window.ZOHO.embeddedApp) {
                        clearInterval(checkZoho);
                        window.ZOHO.embeddedApp.init().then(() => {
                            this.isInitialized = true;
                            resolve();
                        }).catch(err => {
                            reject(err);
                        });
                    }
                }, 100);

                setTimeout(() => {
                    clearInterval(checkZoho);
                    if (!this.isInitialized) {
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
            return false;
        }
    }

    // Helper: Fetch ALL records with pagination
    async fetchAllRecords(module) {
        let allRecords = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await window.ZOHO.CRM.API.getAllRecords({
                Entity: module,
                sort_order: "asc",
                per_page: 200,
                page: page
            });

            if (response.data && response.data.length > 0) {
                allRecords = allRecords.concat(response.data);
                page++;
                // Zoho returns less than per_page when it's the last page
                if (response.data.length < 200) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return allRecords;
    }

    // Fetch products
    async fetchProducts() {
        if (this.mode === 'mock') {
            await new Promise(r => setTimeout(r, 800));

            // Helper to clean swapped category data (Data Quality Fix)
            const cleanData = (item) => {
                const productCat = item.productCategory?.toString().trim() || '';
                const weightCat = item.weightCategory?.toString().trim() || '';

                // Pattern 1: productCategory looks like a weight (e.g., "50kg", "20kg")
                const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);

                // Pattern 2: weightCategory looks like a product category (not a weight pattern)
                const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat) && weightCat !== '-';

                // Swap if needed
                if (productCatIsWeight && !weightCat) {
                    item.weightCategory = item.productCategory;
                    item.productCategory = null;
                } else if (weightCatIsProduct && !productCat) {
                    item.productCategory = item.weightCategory;
                    item.weightCategory = null;
                } else if (productCatIsWeight && weightCatIsProduct) {
                    const temp = item.productCategory;
                    item.productCategory = item.weightCategory;
                    item.weightCategory = temp;
                }

                return item;
            };

            // Process mock data same as live data
            const processedMock = MOCK_PRODUCTS.map(p => cleanData({
                id: p.id,
                skuCode: p.Name,
                productName: p.Product_MTP_Name || p.Name,
                productType: 'parent', // Mock data is all parents
                billedTotalWeight: Number(p.Billed_Physical_Weight) || Number(p.Total_Weight) || 0,
                productCategory: p.Product_Category || null,
                weightCategory: p.Weight_Category_Billed || null,
                liveStatus: p.Live_Status || null,
                mtpSkuName: p.Product_MTP_Name || p.Name,
                hasAudit: false, // No audit data until Excel uploaded
                boxes: [],
                children: [],
                childIds: []
            }));
            return processedMock;
        }

        try {
            await this.sdkReady;

            // 1. Fetch ALL Parent SKUs (with pagination)
            const parentsRaw = await this.fetchAllRecords("Parent_MTP_SKU");
            console.log(`[ZohoAPI] Fetched ${parentsRaw.length} Parents`);
            if (parentsRaw.length > 0) {
                console.log('[ZohoAPI] First Parent Record Keys:', Object.keys(parentsRaw[0]));
                console.log('[ZohoAPI] First Parent Sample:', parentsRaw[0]);
            }

            // 2. Fetch ALL Child Products (with pagination)
            const childrenRaw = await this.fetchAllRecords("Products");
            console.log(`[ZohoAPI] Fetched ${childrenRaw.length} Children`);
            if (childrenRaw.length > 0) {
                console.log('[ZohoAPI] First Child Record Keys:', Object.keys(childrenRaw[0]));
            }

            // DATA LINKER LOGIC
            const parentMap = new Map();
            const allProducts = [];
            const processedParents = [];

            // Helper to clean swapped category data (Data Quality Fix)
            const cleanData = (item) => {
                const productCat = item.productCategory?.toString().trim() || '';
                const weightCat = item.weightCategory?.toString().trim() || '';

                // Pattern 1: productCategory looks like a weight (e.g., "50kg", "20kg")
                const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);

                // Pattern 2: weightCategory looks like a product category (not a weight pattern)
                const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat) && weightCat !== '-';

                // Swap if needed
                if (productCatIsWeight && !weightCat) {
                    item.weightCategory = item.productCategory;
                    item.productCategory = null;
                } else if (weightCatIsProduct && !productCat) {
                    item.productCategory = item.weightCategory;
                    item.weightCategory = null;
                } else if (productCatIsWeight && weightCatIsProduct) {
                    const temp = item.productCategory;
                    item.productCategory = item.weightCategory;
                    item.weightCategory = temp;
                }

                return item;
            };

            // A. Process Parents
            // Parent weights stored in KG in CRM
            parentsRaw.forEach(p => {
                const parentObj = cleanData({
                    id: p.id,
                    skuCode: p.Name,
                    productName: p.Product_MTP_Name || p.Name,
                    productType: 'parent',
                    billedTotalWeight: Number(p.Billed_Physical_Weight) || Number(p.Total_Weight) || 0,
                    auditedWeight: 0, // Don't pre-populate from CRM history
                    hasAudit: false,  // Only set to true when user uploads Excel in current session
                    lastAuditedWeightInCRM: Number(p.Last_Audited_Total_Weight_kg) || 0, // Keep for reference
                    productCategory: p.Product_Category || null,
                    weightCategory: p.Weight_Category_Billed || null,
                    liveStatus: p.Live_Status || null,
                    mtpSkuName: p.Product_MTP_Name || p.Name,
                    boxes: (p.MTP_Box_Dimensions || []).map(b => ({
                        boxNumber: b.Box,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: Number(b.Weight) || 0
                    })),
                    children: [],
                    childIds: []
                });
                parentMap.set(p.id, parentObj);
                processedParents.push(parentObj);
            });

            // B. Process Children & Link to Parents
            // Child weights stored in KG in CRM
            const processedChildren = [];
            childrenRaw.forEach(c => {
                const parentId = c.MTP_SKU ? c.MTP_SKU.id : null;

                const childObj = cleanData({
                    id: c.id,
                    skuCode: c.Product_Code,
                    productName: c.Product_Name,
                    productType: 'child',
                    billedTotalWeight: Number(c.Total_Weight) || 0,
                    auditedWeight: 0, // Don't pre-populate from CRM history
                    hasAudit: false,  // Only set to true when user uploads Excel in current session
                    lastAuditedWeightInCRM: Number(c.Last_Audited_Total_Weight_kg) || 0, // Keep for reference
                    productCategory: c.Product_Category || null,
                    weightCategory: c.Weight_Category_Billed || null,
                    liveStatus: c.Live_Status || null,
                    parentId: parentId,
                    mtpSku: c.MTP_SKU ? { id: c.MTP_SKU.id, name: c.MTP_SKU.name } : null,
                    boxes: (c.Bill_Dimension_Weight || []).map(b => ({
                        boxNumber: b.BL,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: b.Weight
                    }))
                });

                processedChildren.push(childObj);

                // Link child to parent
                if (parentId && parentMap.has(parentId)) {
                    const parent = parentMap.get(parentId);
                    parent.children.push(childObj.skuCode);
                    parent.childIds.push(childObj.id);
                }
            });

            allProducts.push(...processedParents, ...processedChildren);
            return allProducts;

        } catch (error) {
            return [];
        }
    }

    // Update product with audit results
    async updateProduct(productId, auditData) {
        if (this.mode === 'mock') {
            console.log('[ZohoAPI Mock] Would update:', productId, auditData);
            // Simulate delay
            await new Promise(r => setTimeout(r, 300));
            return { success: true, mock: true, message: 'Mock update successful' };
        }

        try {
            await this.sdkReady;

            // Extract data from auditData (flexible format support)
            const weightKG = Number(auditData.auditedWeight || auditData.weights?.chargeable || 0);
            const boxes = auditData.auditedBoxes || auditData.boxes || [];

            // Auto-calculate weight category from audited weight
            const weightCategory = weightKG < 5 ? '<5kg' :
                                  weightKG < 20 ? '5-20kg' :
                                  weightKG < 50 ? '20-50kg' : '>50kg';

            // Determine module (use productId to find in cached products)
            let module = 'Products'; // Default to child
            let recordId = productId;

            // Try to find in cached products to determine type
            const cachedProducts = await this.fetchProducts();
            const product = cachedProducts.find(p => p.id === productId);

            if (product) {
                module = product.productType === 'parent' ? 'Parent_MTP_SKU' : 'Products';
                console.log(`[ZohoAPI] Updating ${module} record: ${product.skuCode}`);
            } else {
                console.warn(`[ZohoAPI] Product ${productId} not in cache, assuming Products module`);
            }

            // Build update payload based on module
            const updateData = {
                id: recordId
            };

            if (module === 'Parent_MTP_SKU') {
                // Parent update
                updateData.Last_Audited_Total_Weight_kg = weightKG;
                updateData.Weight_Category_Audited = weightCategory;
                updateData.Last_Audit_Date = new Date().toISOString().split('T')[0];

                // Update box dimensions subform if provided
                if (boxes.length > 0) {
                    updateData.MTP_Box_Dimensions = boxes.map((b, idx) => ({
                        Box: String(idx + 1),
                        L_cm: Number(b.length || b.L_cm),
                        W_cm: Number(b.width || b.W_cm),
                        H_cm: Number(b.height || b.H_cm),
                        Weight_kg: Number(b.weight || b.Weight_kg)
                    }));
                }
            } else {
                // Child update
                updateData.Last_Audited_Total_Weight_kg = weightKG;
                updateData.Weight_Category_Audited = weightCategory;
                updateData.Last_Audit_Date = new Date().toISOString().split('T')[0];

                // Update box dimensions subform if provided
                if (boxes.length > 0) {
                    updateData.Bill_Dimension_Weight = boxes.map((b, idx) => ({
                        BL: String(idx + 1),
                        L_cm: Number(b.length || b.L_cm),
                        W_cm: Number(b.width || b.W_cm),
                        H_cm: Number(b.height || b.H_cm),
                        Weight_kg: Number(b.weight || b.Weight_kg)
                    }));
                }
            }

            console.log(`[ZohoAPI] Sending update to ${module}:`, updateData);

            // Execute update
            const response = await window.ZOHO.CRM.API.updateRecord({
                Entity: module,
                APIData: { data: [updateData] },
                Trigger: ["workflow"] // Enable workflows for alerts
            });

            console.log(`[ZohoAPI] Update response:`, response);

            // Check response status
            if (response.data && response.data[0]?.code === 'SUCCESS') {
                return {
                    success: true,
                    message: `${module} updated successfully`,
                    recordId: response.data[0].details.id
                };
            } else {
                throw new Error(response.data?.[0]?.message || 'Update failed');
            }

        } catch (error) {
            console.error('[ZohoAPI] Update error:', error);
            return { success: false, error: error.message || 'Unknown error' };
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
