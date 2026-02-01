// Auto-save service for real-time Zoho CRM sync
// Automatically saves changes to CRM as user makes edits

class AutoSaveService {
    constructor(zohoAPI) {
        this.zohoAPI = zohoAPI;
        this.saveQueue = new Map();
        this.saveTimeout = null;
        this.isSaving = false;
        this.DEBOUNCE_DELAY = 1000; // 1 second delay
    }

    /**
     * Queue a product for auto-save
     * @param {string} productId - Product ID
     * @param {object} changes - Changed fields
     */
    queueSave(productId, changes) {
        // Merge with existing queued changes
        const existing = this.saveQueue.get(productId) || {};
        this.saveQueue.set(productId, { ...existing, ...changes });

        // Debounce - wait for user to stop typing
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.processSaveQueue();
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Process all queued saves
     */
    async processSaveQueue() {
        if (this.isSaving || this.saveQueue.size === 0) {
            return;
        }

        this.isSaving = true;
        const updates = Array.from(this.saveQueue.entries()).map(([productId, changes]) => ({
            productId,
            ...changes
        }));

        try {
            // Batch update to CRM
            await this.zohoAPI.batchUpdateProducts(updates);

            // Clear queue on success
            this.saveQueue.clear();

            // Show success indicator
            this.showSaveStatus('saved');
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showSaveStatus('error');
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Force immediate save (bypass debounce)
     */
    async forceSave() {
        clearTimeout(this.saveTimeout);
        await this.processSaveQueue();
    }

    /**
     * Show save status indicator
     * @param {string} status - 'saving', 'saved', 'error'
     */
    showSaveStatus(status) {
        const event = new CustomEvent('autosave-status', {
            detail: { status, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Clear the save queue (e.g., on navigation)
     */
    clearQueue() {
        clearTimeout(this.saveTimeout);
        this.saveQueue.clear();
    }
}

export default AutoSaveService;
