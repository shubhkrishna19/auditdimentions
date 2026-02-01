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
            // Return mock data for development
            return this.getMockProducts();
        }

        try {
            const response = await ZOHO.CRM.API.getAllRecords({
                Entity: "Products",
                sort_order: "asc",
                per_page: 200
            });

            if (response.data) {
                return response.data.map(product => ({
                    id: product.id,
                    productCode: product.Product_Code,
                    productName: product.Product_Name,

                    // Box Dimensions subform data
                    boxes: (product.Bill_Dimension_Weight || []).map(box => ({
                        boxNumber: box.Box_Number,
                        measurement: box.Box_Measurement,
                        length: box.Length || 0,
                        width: box.Width || 0,
                        height: box.Height || 0,
                        weightMeasurement: box.Weight_Measurement,
                        weight: box.Weight || 0
                    })),

                    // Total weight (formula field)
                    billedTotalWeight: product.Total_Weight || 0,

                    // Audit tracking fields
                    lastAuditedWeight: product.Last_Audited_Total_Weight || 0,
                    weightVariance: product.Weight_Variance || 0,
                    weightCategoryBilled: product.Weight_Category_Billed || '',
                    weightCategoryAudited: product.Weight_Category_Audited || '',
                    categoryMismatch: product.Category_Mismatch || false,
                    lastAuditDate: product.Last_Audit_Date || null
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    // Update product with audit results
    async updateProduct(productId, auditData) {
        if (!this.isInitialized) {
            console.log('Mock update:', productId, auditData);
            return { success: true };
        }

        try {
            const response = await ZOHO.CRM.API.updateRecord({
                Entity: "Products",
                APIData: {
                    id: productId,
                    Last_Audited_Weight: auditData.auditedWeight,
                    Weight_Variance: auditData.variance,
                    Last_Audit_Date: new Date().toISOString().split('T')[0]
                }
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
