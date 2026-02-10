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
            return MOCK_PRODUCTS;
        }

        try {
            await this.sdkReady;

            // 1. Fetch ALL Parent SKUs (with pagination)
            const parentsRaw = await this.fetchAllRecords("Parent_MTP_SKU");

            // 2. Fetch ALL Child Products (with pagination)
            const childrenRaw = await this.fetchAllRecords("Products");

            // DATA LINKER LOGIC
            const parentMap = new Map();
            const allProducts = [];
            const processedParents = [];

            // A. Process Parents
            // Parent weights stored in KG in CRM
            parentsRaw.forEach(p => {
                const parentObj = {
                    id: p.id,
                    skuCode: p.Name,
                    productName: p.Product_MTP_Name || p.Name,
                    productType: 'parent',
                    billedTotalWeight: Number(p.Billed_Physical_Weight) || 0,
                    hasAudit: false,
                    boxes: (p.MTP_Box_Dimensions || []).map(b => ({
                        boxNumber: b.Box,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: Number(b.Weight) || 0
                    })),
                    children: [],
                    childIds: []
                };
                parentMap.set(p.id, parentObj);
                processedParents.push(parentObj);
            });

            // B. Process Children & Link to Parents
            // Child weights stored in KG in CRM
            const processedChildren = [];
            childrenRaw.forEach(c => {
                const parentId = c.MTP_SKU ? c.MTP_SKU.id : null;

                const childObj = {
                    id: c.id,
                    skuCode: c.Product_Code,
                    productName: c.Product_Name,
                    productType: 'child',
                    billedTotalWeight: Number(c.Total_Weight) || 0,
                    auditedWeight: Number(c.Last_Audited_Total_Weight_kg) || 0,
                    hasAudit: !!c.Last_Audited_Total_Weight_kg,
                    parentId: parentId,
                    boxes: (c.Bill_Dimension_Weight || []).map(b => ({
                        boxNumber: b.BL,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: b.Weight
                    }))
                };

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
            return { success: true };
        }

        try {
            await this.sdkReady;

            const sku = auditData.skuCode;
            const weightKG = Number(auditData.auditedWeight || auditData.weights.chargeable) || 0;
            const category = auditData.auditedCategory || auditData.weights.category;

            // 1. Try search in Parent Module
            const parentSearch = await window.ZOHO.CRM.API.searchRecord({
                Entity: "Parent_MTP_SKU", Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

            if (parentSearch.data && parentSearch.data.length > 0) {
                const parent = parentSearch.data[0];
                const updateData = {
                    id: parent.id,
                    Billed_Physical_Weight: weightKG,
                    Billed_Chargeable_Weight: weightKG,
                    Weight_Category_Billed: category
                };

                if (auditData.boxes && auditData.boxes.length > 0) {
                    updateData.MTP_Box_Dimensions = auditData.boxes.map((b, idx) => ({
                        Box: String(idx + 1),
                        Length: Number(b.length), Width: Number(b.width), Height: Number(b.height),
                        Weight: Number(b.weight),
                        Box_Measurement: 'cm', Weight_Measurement: 'kg'
                    }));
                }

                await window.ZOHO.CRM.API.updateRecord({ Entity: "Parent_MTP_SKU", APIData: updateData });
                return { success: true, message: 'Parent Updated' };
            }

            // 2. Try search in Products Module
            const childSearch = await window.ZOHO.CRM.API.searchRecord({
                Entity: "Products", Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

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
