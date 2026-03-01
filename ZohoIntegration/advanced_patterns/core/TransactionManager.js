/**
 * Transaction Manager - Checkpoint & Restore System
 * Creates backups before updates, enables rollback on error
 */

class TransactionManager {
    constructor() {
        this.checkpoints = new Map();
        this.transactionLog = [];
    }

    /**
     * Initialize with Zoho SDK
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
     * Create checkpoint - Save current state BEFORE update
     */
    async createCheckpoint(module, recordId, productCode) {
        try {
            console.log(`[Checkpoint] Creating backup for ${productCode}...`);

            // Fetch current record data
            const response = await ZOHO.CRM.API.getRecord({
                Entity: module,
                RecordID: recordId
            });

            if (!response.data || response.data.length === 0) {
                throw new Error(`Record ${recordId} not found`);
            }

            const currentData = response.data[0];

            // Create checkpoint entry
            const checkpoint = {
                id: `CHK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                module: module,
                recordId: recordId,
                productCode: productCode,

                // Store original values
                originalData: {
                    Billed_Physical_Weight: currentData.Billed_Physical_Weight,
                    Billed_Volumetric_Weight: currentData.Billed_Volumetric_Weight,
                    Billed_Chargeable_Weight: currentData.Billed_Chargeable_Weight,
                    BOM_Weight: currentData.BOM_Weight,
                    Total_Weight: currentData.Total_Weight,
                    Weight_Category_Billed: currentData.Weight_Category_Billed,
                    Processing_Status: currentData.Processing_Status,
                    Bill_Dimension_Weight: currentData.Bill_Dimension_Weight || []
                }
            };

            // Store in memory
            this.checkpoints.set(checkpoint.id, checkpoint);

            // Log transaction
            this.transactionLog.push({
                type: 'CHECKPOINT_CREATED',
                checkpointId: checkpoint.id,
                timestamp: checkpoint.timestamp,
                productCode: productCode
            });

            console.log(`[Checkpoint] ✅ Created: ${checkpoint.id}`);
            return checkpoint;

        } catch (error) {
            console.error(`[Checkpoint] ❌ Failed for ${productCode}:`, error);
            throw error;
        }
    }

    /**
     * Restore from checkpoint - Rollback to previous state
     */
    async restoreCheckpoint(checkpointId) {
        try {
            const checkpoint = this.checkpoints.get(checkpointId);

            if (!checkpoint) {
                throw new Error(`Checkpoint ${checkpointId} not found`);
            }

            console.log(`[Restore] Rolling back ${checkpoint.productCode}...`);

            // Restore original data
            const response = await ZOHO.CRM.API.updateRecord({
                Entity: checkpoint.module,
                APIData: {
                    id: checkpoint.recordId,
                    ...checkpoint.originalData
                }
            });

            if (response.data && response.data[0].code === 'SUCCESS') {
                console.log(`[Restore] ✅ ${checkpoint.productCode} restored`);

                // Log transaction
                this.transactionLog.push({
                    type: 'CHECKPOINT_RESTORED',
                    checkpointId: checkpointId,
                    timestamp: new Date().toISOString(),
                    productCode: checkpoint.productCode
                });

                return { success: true, productCode: checkpoint.productCode };
            } else {
                throw new Error('Restore API call failed');
            }

        } catch (error) {
            console.error(`[Restore] ❌ Failed:`, error);
            throw error;
        }
    }

    /**
     * Restore ALL checkpoints (mass rollback)
     */
    async restoreAll(checkpointIds = null) {
        const idsToRestore = checkpointIds || Array.from(this.checkpoints.keys());

        console.log(`[Restore] Starting mass rollback for ${idsToRestore.length} products...`);

        const results = {
            total: idsToRestore.length,
            restored: 0,
            failed: 0,
            errors: []
        };

        for (const checkpointId of idsToRestore) {
            try {
                await this.restoreCheckpoint(checkpointId);
                results.restored++;

                // Small delay between restores
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                results.failed++;
                results.errors.push({
                    checkpointId,
                    error: error.message
                });
            }
        }

        console.log(`[Restore] Complete: ${results.restored}/${results.total} restored`);
        return results;
    }

    /**
     * Get checkpoint by ID
     */
    getCheckpoint(checkpointId) {
        return this.checkpoints.get(checkpointId);
    }

    /**
     * Get all checkpoints
     */
    getAllCheckpoints() {
        return Array.from(this.checkpoints.values());
    }

    /**
     * Export checkpoints to JSON (for backup)
     */
    exportCheckpoints() {
        const checkpointsArray = this.getAllCheckpoints();
        const exportData = {
            exportDate: new Date().toISOString(),
            totalCheckpoints: checkpointsArray.length,
            checkpoints: checkpointsArray,
            transactionLog: this.transactionLog
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Save checkpoints to localStorage (browser backup)
     */
    saveToLocalStorage(key = 'zoho_sync_checkpoints') {
        try {
            const data = this.exportCheckpoints();
            localStorage.setItem(key, data);
            console.log(`[Checkpoint] Saved ${this.checkpoints.size} checkpoints to localStorage`);
            return true;
        } catch (error) {
            console.error('[Checkpoint] Failed to save to localStorage:', error);
            return false;
        }
    }

    /**
     * Load checkpoints from localStorage
     */
    loadFromLocalStorage(key = 'zoho_sync_checkpoints') {
        try {
            const data = localStorage.getItem(key);
            if (!data) {
                console.log('[Checkpoint] No saved checkpoints found');
                return false;
            }

            const parsed = JSON.parse(data);

            // Restore checkpoints
            parsed.checkpoints.forEach(checkpoint => {
                this.checkpoints.set(checkpoint.id, checkpoint);
            });

            this.transactionLog = parsed.transactionLog || [];

            console.log(`[Checkpoint] Loaded ${this.checkpoints.size} checkpoints from localStorage`);
            return true;

        } catch (error) {
            console.error('[Checkpoint] Failed to load from localStorage:', error);
            return false;
        }
    }

    /**
     * Clear all checkpoints
     */
    clearAll() {
        const count = this.checkpoints.size;
        this.checkpoints.clear();
        this.transactionLog = [];
        console.log(`[Checkpoint] Cleared ${count} checkpoints`);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalCheckpoints: this.checkpoints.size,
            oldestCheckpoint: this.getAllCheckpoints()[0]?.timestamp,
            newestCheckpoint: this.getAllCheckpoints()[this.checkpoints.size - 1]?.timestamp,
            transactionCount: this.transactionLog.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionManager;
}
