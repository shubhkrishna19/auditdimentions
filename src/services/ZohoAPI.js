// Zoho CRM API Service
// Handles fetching product data from Zoho CRM

class ZohoAPI {
    constructor() {
        this.baseURL = 'https://www.zohoapis.com/crm/v2';
        this.isInitialized = false;
    }

    // Initialize Zoho SDK
    async init() {
        if (typeof ZOHO !== 'undefined') {
            await ZOHO.embeddedApp.on("PageLoad", (data) => {
                this.isInitialized = true;
            });
            await ZOHO.embeddedApp.init();
        } else {
            console.warn('Zoho SDK not loaded - using mock data for development');
            this.isInitialized = false;
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
            console.log('🔍 Fetching records from Zoho CRM...');

            const allProducts = [];

            // 1. Fetch Parent MTP SKUs with pagination
            let parentProducts = [];
            try {
                console.log('📥 Fetching Parent MTP SKUs...');
                const allParents = await this.fetchAllRecords("Parent_MTP_SKU");

                parentProducts = allParents.map(parent => ({
                    id: parent.id,
                    productCode: parent.Name || parent.MTP_SKU_Code || `MTP-${parent.id}`,
                    productName: parent.MTP_SKU_Name || parent.Name || 'Unnamed Parent SKU',
                    productType: 'parent',
                    mtpSkuName: parent.Name || 'N/A',
                    mtpSkuId: parent.id,
                    parentId: null,

                    boxes: [],
                    billedTotalWeight: parseFloat(parent.Total_Weight) || 0,

                    lastAuditedWeight: parseFloat(parent.Last_Audited_Total_Weight) || 0,
                    weightVariance: parseFloat(parent.Weight_Variance) || 0,
                    weightCategoryBilled: parent.Weight_Category_Billed || '',
                    weightCategoryAudited: parent.Weight_Category_Audited || '',
                    categoryMismatch: parent.Category_Mismatch || false,
                    lastAuditDate: parent.Last_Audit_Date || null,

                    auditedWeight: null,
                    auditedBoxes: [],
                    variations: null,
                    hasAudit: false,

                    raw: parent
                }));

                allProducts.push(...parentProducts);
                console.log(`✅ Fetched ${parentProducts.length} parent MTP SKUs`);
            } catch (e) {
                console.warn('Could not fetch Parent_MTP_SKU module:', e);
            }

            // 2. Fetch Child Products with pagination
            console.log('📥 Fetching Child Products...');
            const allChildRecords = await this.fetchAllRecords("Products");

            const childProducts = allChildRecords.map(product => {
                const mtpLookup = product.MTP_SKU;

                return {
                    id: product.id,
                    productCode: product.Product_Code,
                    productName: product.Product_Name,
                    productType: 'child',
                    mtpSkuName: mtpLookup?.name || '',
                    mtpSkuId: mtpLookup?.id || '',
                    parentId: mtpLookup?.id || null,

                    boxes: (product.Bill_Dimension_Weight || []).map(box => ({
                        boxNumber: box.Box_Number,
                        measurement: box.Box_Measurement,
                        length: parseFloat(box.Length) || 0,
                        width: parseFloat(box.Width) || 0,
                        height: parseFloat(box.Height) || 0,
                        weightMeasurement: box.Weight_Measurement,
                        weight: parseFloat(box.Weight) || 0
                    })),

                    billedTotalWeight: parseFloat(product.Total_Weight) || 0,

                    lastAuditedWeight: parseFloat(product.Last_Audited_Total_Weight) || 0,
                    weightVariance: parseFloat(product.Weight_Variance) || 0,
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
            console.log(`✅ Fetched ${childProducts.length} child products`);

            console.log(`📦 Total products loaded: ${allProducts.length} (${parentProducts.length} parents, ${childProducts.length} children)`);
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
                console.log(`  📄 Page ${page}: ${response.data.length} records (Total: ${allRecords.length})`);

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
        if (!this.isInitialized) {
            console.log('Mock update:', productId, auditData);
            return { success: true };
        }

        try {
            const apiData = {
                id: productId,
                Last_Audited_Total_Weight: auditData.auditedWeight,
                Weight_Variance: auditData.variance,
                Weight_Category_Billed: auditData.billedCategory,
                Weight_Category_Audited: auditData.auditedCategory,
                Category_Mismatch: auditData.categoryMismatch,
                Last_Audit_Date: new Date().toISOString().split('T')[0]
            };

            const response = await ZOHO.CRM.API.updateRecord({
                Entity: "Products",
                APIData: apiData
            });
            return response;
        } catch (error) {
            console.error('Error updating product:', error);
            return { success: false, error };
        }
    }

    // Batch update multiple products
    async batchUpdateProducts(updates) {
        if (!this.isInitialized) {
            console.log('Mock batch update:', updates.length, 'products');
            return { success: true };
        }

        try {
            const apiData = updates.map(update => ({
                id: update.productId,
                Last_Audited_Total_Weight: update.auditedWeight,
                Weight_Variance: update.variance,
                Weight_Category_Billed: update.billedCategory,
                Weight_Category_Audited: update.auditedCategory,
                Category_Mismatch: update.categoryMismatch,
                Last_Audit_Date: new Date().toISOString().split('T')[0]
            }));

            const response = await ZOHO.CRM.API.updateRecord({
                Entity: "Products",
                APIData: { data: apiData }
            });
            return response;
        } catch (error) {
            console.error('Error batch updating products:', error);
            return { success: false, error };
        }
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
