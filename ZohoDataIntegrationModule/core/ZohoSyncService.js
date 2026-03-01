/**
 * Zoho Widget Sync Service
 * To be called from the React app to sync billing dimensions to Zoho CRM
 */

class ZohoSyncService {
    constructor() {
        this.BATCH_SIZE = 10;
        this.DELAY_BETWEEN_BATCHES = 500; // 500ms to avoid rate limits
        this.results = {
            total: 0,
            updated: 0,
            created: 0,
            errors: [],
            checkpoints: [],  // Track checkpoint IDs
            startTime: null,
            endTime: null
        };

        // Transaction Manager for checkpoints
        this.transactionManager = null;
        this.enableCheckpoints = true;  // Set to false to disable checkpointing
    }

    /**
     * Initialize Zoho SDK
     */
    async init() {
        return new Promise((resolve) => {
            ZOHO.embeddedApp.on("PageLoad", function () {
                resolve();
            });
            ZOHO.embeddedApp.init();
        });
    }

    /**
     * Search for a product by SKU
     */
    async searchProduct(sku, module = 'Parent_MTP_SKU') {
        try {
            const response = await ZOHO.CRM.API.searchRecord({
                Entity: module,
                Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

            return response.data || [];
        } catch (error) {
            console.error(`[ZohoSync] Search error for ${sku}:`, error);
            return [];
        }
    }

    /**
     * Verify if required fields exist in the module
     */
    async verifySchema(module = 'Parent_MTP_SKU') {
        const REQUIRED_FIELDS = [
            'Billed_Physical_Weight',
            'Billed_Volumetric_Weight',
            'Billed_Chargeable_Weight',
            'BOM_Weight',
            'Weight_Category_Billed',
            'Processing_Status'
        ];

        try {
            const response = await ZOHO.CRM.METADATA.getFields({ Entity: module });
            const existingFields = response.fields.map(f => f.api_name);

            const missing = REQUIRED_FIELDS.filter(field => !existingFields.includes(field));

            return {
                valid: missing.length === 0,
                missingFields: missing,
                allFields: existingFields
            };
        } catch (error) {
            console.error('[ZohoSync] Schema check failed:', error);
            // Default to assume valid if we can't check (e.g. permission error)
            // or return error state
            return { valid: false, error: error.message, missingFields: [] };
        }
    }

    /**
     * Update existing product
     */
    async updateProduct(module, productData) {
        try {
            const response = await ZOHO.CRM.API.updateRecord({
                Entity: module,
                APIData: productData,
                Trigger: ["workflow"]
            });

            return response.data && response.data[0].code === 'SUCCESS';
        } catch (error) {
            console.error(`[ZohoSync] Update error:`, error);
            throw error;
        }
    }

    /**
     * Create new product
     */
    async createProduct(module, productData) {
        try {
            const response = await ZOHO.CRM.API.insertRecord({
                Entity: module,
                APIData: productData,
                Trigger: ["workflow"]
            });

            return response.data && response.data[0].code === 'SUCCESS';
        } catch (error) {
            console.error(`[ZohoSync] Create error:`, error);
            throw error;
        }
    }

    /**
     * Sync a single product (UPDATE ONLY - all MTP SKUs should already exist)
     */
    async syncProduct(productData, module = 'Parent_MTP_SKU', onProgress) {
        const sku = productData.Product_Code;

        try {
            // Search for existing product
            const existing = await this.searchProduct(sku, module);

            if (existing.length === 0) {
                // Product doesn't exist! This shouldn't happen for MTP SKUs
                throw new Error(`${sku} not found in CRM - ensure all MTP SKUs exist`);
            }

            const recordId = existing[0].id;

            // ✅ CREATE CHECKPOINT before update (for rollback capability)
            let checkpoint = null;
            if (this.enableCheckpoints && this.transactionManager) {
                try {
                    checkpoint = await this.transactionManager.createCheckpoint(
                        module,
                        recordId,
                        sku
                    );
                    this.results.checkpoints.push(checkpoint.id);
                } catch (checkpointError) {
                    console.warn(`[Checkpoint] Failed for ${sku}, continuing without backup:`, checkpointError);
                    // Continue anyway - checkpoint failure shouldn't block sync
                }
            }

            // UPDATE existing product with dimensions and weights
            const updateData = {
                id: recordId,
                // Update box dimensions subform
                Bill_Dimension_Weight: productData.Bill_Dimension_Weight,
                // Update weight fields (if they exist in the schema check)
                Total_Weight: productData.Total_Weight,
                Billed_Physical_Weight: productData.Billed_Physical_Weight,
                Billed_Volumetric_Weight: productData.Billed_Volumetric_Weight,
                Billed_Chargeable_Weight: productData.Billed_Chargeable_Weight,
                BOM_Weight: productData.BOM_Weight,
                Weight_Category_Billed: productData.Weight_Category_Billed,
                Processing_Status: productData.Processing_Status
            };

            const success = await this.updateProduct(module, updateData);

            if (success) {
                this.results.updated++;

                if (onProgress) {
                    onProgress({
                        sku,
                        action: 'updated',
                        success: true,
                        current: this.results.updated,
                        total: this.results.total
                    });
                }

                return { success: true, action: 'updated', sku };
            } else {
                throw new Error('Update API call failed');
            }

        } catch (error) {
            this.results.errors.push({
                sku,
                error: error.message
            });

            if (onProgress) {
                onProgress({
                    sku,
                    success: false,
                    error: error.message,
                    current: this.results.updated,
                    total: this.results.total
                });
            }

            return { success: false, sku, error: error.message };
        }
    }

    /**
     * Process a batch of products
     */
    async syncBatch(batch, onProgress) {
        const results = [];

        for (const product of batch) {
            const result = await this.syncProduct(product, 'Parent_MTP_SKU', onProgress);
            results.push(result);
        }

        return results;
    }

    /**
     * Main sync function
     */
    async syncAll(products, onProgress, onComplete) {
        try {
            console.log('[ZohoSync] Starting sync for', products.length, 'products');

            // Initialize Transaction Manager for checkpoints
            if (this.enableCheckpoints) {
                // Import TransactionManager from portable module
                const TransactionManager = (await import('../../ZohoDataIntegrationModule/core/TransactionManager.js')).default;
                this.transactionManager = new TransactionManager();
                await this.transactionManager.init();
                console.log('[ZohoSync] ✅ Transaction Manager initialized - Checkpoints enabled');
            }

            this.results = {
                total: products.length,
                updated: 0,
                created: 0,
                errors: [],
                checkpoints: [],
                startTime: new Date(),
                endTime: null
            };

            // Split into batches
            const batches = [];
            for (let i = 0; i < products.length; i += this.BATCH_SIZE) {
                batches.push(products.slice(i, i + this.BATCH_SIZE));
            }

            console.log(`[ZohoSync] Processing ${batches.length} batches...`);

            // Process each batch
            for (let i = 0; i < batches.length; i++) {
                await this.syncBatch(batches[i], onProgress);

                // Delay between batches
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_BATCHES));
                }
            }

            this.results.endTime = new Date();

            console.log('[ZohoSync] Sync complete!', this.results);

            if (onComplete) {
                onComplete(this.results);
            }

            return this.results;

        } catch (error) {
            console.error('[ZohoSync] Fatal error:', error);
            throw error;
        }
    }

    /**
     * Get current results
     */
    getResults() {
        return this.results;
    }

    /**
     * Restore ALL synced products to their pre-sync state
     */
    async restoreAll(onProgress) {
        if (!this.transactionManager || this.results.checkpoints.length === 0) {
            console.error('[Restore] No checkpoints available to restore');
            return { success: false, error: 'No checkpoints found' };
        }

        console.log(`[Restore] Starting rollback for ${this.results.checkpoints.length} products...`);

        const restoreResults = await this.transactionManager.restoreAll(
            this.results.checkpoints
        );

        if (onProgress) {
            onProgress({
                type: 'restore_complete',
                ...restoreResults
            });
        }

        return restoreResults;
    }

    /**
     * Export checkpoints for backup
     */
    exportCheckpoints() {
        if (!this.transactionManager) {
            return null;
        }
        return this.transactionManager.exportCheckpoints();
    }

    /**
     * Get checkpoint stats
     */
    getCheckpointStats() {
        if (!this.transactionManager) {
            return { checkpointsEnabled: false };
        }
        return {
            checkpointsEnabled: this.enableCheckpoints,
            ...this.transactionManager.getStats()
        };
    }

    /**
     * Fetch single product from Zoho (for display - Zoho as SSOT)
     */
    async fetchProduct(sku, module = 'Parent_MTP_SKU') {
        try {
            console.log(`[ZohoSync] Fetching ${sku} from Zoho...`);

            const result = await ZOHO.CRM.API.searchRecord({
                Entity: module,
                Type: "criteria",
                Query: `(Product_Code:equals:${sku})`
            });

            if (!result.data || result.data.length === 0) {
                console.log(`[ZohoSync] Product ${sku} not found in Zoho`);
                return null;
            }

            const product = result.data[0];

            console.log(`[ZohoSync] ✅ Fetched ${sku}:`, {
                billedWeight: product.Billed_Chargeable_Weight,
                boxes: product.Bill_Dimension_Weight?.length || 0
            });

            // Convert grams to kg for display
            return {
                sku: product.Product_Code,
                productName: product.Product_MTP_Name || product.Name,

                // Weights in KG for display (stored as GRAMS in Zoho)
                billedPhysicalWeight: product.Billed_Physical_Weight ?
                    (product.Billed_Physical_Weight / 1000) : null,
                billedVolumetricWeight: product.Billed_Volumetric_Weight ?
                    (product.Billed_Volumetric_Weight / 1000) : null,
                billedChargeableWeight: product.Billed_Chargeable_Weight ?
                    (product.Billed_Chargeable_Weight / 1000) : null,
                bomWeight: product.BOM_Weight ?
                    (product.BOM_Weight / 1000) : null,
                totalWeight: product.Total_Weight ?
                    (product.Total_Weight / 1000) : null,

                weightCategory: product.Weight_Category_Billed,
                processingStatus: product.Processing_Status,

                // Box dimensions (with weights in KG for display)
                boxes: (product.Bill_Dimension_Weight || []).map(box => ({
                    boxNumber: box.Box_Number,
                    length: box.Length,
                    width: box.Width,
                    height: box.Height,
                    weight: box.Weight ? (box.Weight / 1000) : null, // Convert to KG
                    measurement: box.Box_Measurement,
                    weightMeasurement: box.Weight_Measurement
                })),

                // Metadata
                lastSynced: new Date().toISOString(),
                zohoId: product.id,

                // Raw data (if needed for debugging)
                _raw: product
            };
        } catch (error) {
            console.error(`[ZohoSync] Fetch error for ${sku}:`, error);
            throw error;
        }
    }

    /**
     * Fetch multiple products from Zoho
     */
    async fetchProducts(skus, module = 'Parent_MTP_SKU', onProgress) {
        console.log(`[ZohoSync] Fetching ${skus.length} products from Zoho...`);

        const products = [];
        let fetched = 0;

        for (const sku of skus) {
            try {
                const product = await this.fetchProduct(sku, module);
                if (product) {
                    products.push(product);
                }

                fetched++;

                if (onProgress) {
                    onProgress({
                        current: fetched,
                        total: skus.length,
                        sku: sku,
                        success: !!product
                    });
                }
            } catch (error) {
                console.error(`[ZohoSync] Failed to fetch ${sku}:`, error);

                if (onProgress) {
                    onProgress({
                        current: fetched,
                        total: skus.length,
                        sku: sku,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`[ZohoSync] ✅ Fetched ${products.length}/${skus.length} products from Zoho`);
        return products;
    }

    /**
     * Fetch ALL products from a module (paginated)
     */
    async fetchAllProducts(module = 'Parent_MTP_SKU', maxRecords = 200) {
        try {
            console.log(`[ZohoSync] Fetching all products from ${module}...`);

            const result = await ZOHO.CRM.API.getAllRecords({
                Entity: module,
                sort_order: "asc",
                per_page: Math.min(maxRecords, 200), // Zoho max is 200 per page
                page: 1
            });

            if (!result.data || result.data.length === 0) {
                console.log(`[ZohoSync] No products found in ${module}`);
                return [];
            }

            console.log(`[ZohoSync] ✅ Fetched ${result.data.length} products`);

            // Convert each product
            return result.data.map(product => ({
                sku: product.Product_Code,
                productName: product.Product_MTP_Name || product.Name,
                billedChargeableWeight: product.Billed_Chargeable_Weight ?
                    (product.Billed_Chargeable_Weight / 1000) : null,
                weightCategory: product.Weight_Category_Billed,
                zohoId: product.id
            }));
        } catch (error) {
            console.error('[ZohoSync] Fetch all error:', error);
            throw error;
        }
    }
}

export default ZohoSyncService;
