const express = require('express');
const app = express();
app.use(express.json());

// Health Check - always works if express starts
app.get('/health', (req, res) => {
    res.status(200).send({
        status: 'ok',
        engine: 'ZohoSyncHub',
        timestamp: new Date().toISOString()
    });
});

// Main Handler
app.post('/', async (req, res) => {
    try {
        console.log('[SyncHub] POST received');
        let catalyst;

        // Dynamic Loading to prevent cold start crash
        try {
            catalyst = require('zcatalyst-sdk-node');
        } catch (e) {
            console.error('[SyncHub] SDK Load Error:', e);
            throw new Error(`SDK Missing: ${e.message}`);
        }

        const app = catalyst.initialize(req);
        const { action, sku, data } = req.body;

        console.log(`[SyncHub] Action: ${action}`);

        if (action === 'test_connection') {
            const zcrm = app.connection('zoho_crm').getConnector('crm'); // Use connector name
            const org = await zcrm.org().get();
            return res.status(200).send({ status: 'success', orgData: org });
        }

        if (action === 'fix_category_swap') {
            console.log('[SyncHub] Starting Category/Weight Fix...');

            const zcrm = app.connection('zoho_crm').getConnector('crm');

            // Helper: Fetch all records with pagination
            async function fetchAllRecords(module) {
                let allRecords = [];
                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    const response = await zcrm.module(module).records().get({
                        page: page,
                        per_page: 200
                    });

                    if (response.data && response.data.length > 0) {
                        allRecords = allRecords.concat(response.data);
                        page++;
                        if (response.data.length < 200) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }

                return allRecords;
            }

            // Fetch all records
            const parents = await fetchAllRecords('Parent_MTP_SKU');
            const children = await fetchAllRecords('Products');

            console.log(`[SyncHub] Fetched ${parents.length} parents, ${children.length} children`);

            // Identify and prepare fixes for affected records using bidirectional logic
            const prepareUpdates = (records) => {
                const updates = [];

                records.forEach(record => {
                    const productCat = record.Product_Category?.toString().trim() || '';
                    const weightCat = record.Weight_Category_Billed?.toString().trim() || '';

                    // Pattern 1: productCategory looks like a weight (e.g. "50kg")
                    const productCatIsWeight = /^\d+\s*kg$/i.test(productCat);

                    // Pattern 2: weightCategory looks like a product (not a weight pattern, not empty, not '-')
                    const weightCatIsProduct = weightCat && !/^\d+\s*kg$/i.test(weightCat) && weightCat !== '-';

                    let needsUpdate = false;
                    let update = { id: record.id };

                    // Case 1: Product Category has weight, Weight Category is empty -> Move
                    if (productCatIsWeight && (!weightCat || weightCat === '-')) {
                        update.Weight_Category_Billed = record.Product_Category;
                        update.Product_Category = null;
                        needsUpdate = true;
                    }
                    // Case 2: Weight Category has product, Product Category is empty -> Move
                    else if (weightCatIsProduct && (!productCat || productCat === '-')) {
                        update.Product_Category = record.Weight_Category_Billed;
                        update.Weight_Category_Billed = null;
                        needsUpdate = true;
                    }
                    // Case 3: Both are present but swapped -> Swap
                    else if (productCatIsWeight && weightCatIsProduct) {
                        update.Product_Category = record.Weight_Category_Billed;
                        update.Weight_Category_Billed = record.Product_Category;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        updates.push(update);
                    }
                });

                return updates;
            };

            const parentUpdates = prepareUpdates(parents);
            const childUpdates = prepareUpdates(children);

            console.log(`[SyncHub] Found ${parentUpdates.length} affected parents, ${childUpdates.length} affected children`);

            // Fix function to apply prepared updates
            async function applyFixes(module, updates) {
                let fixed = 0;
                const batchSize = 100;

                for (let i = 0; i < updates.length; i += batchSize) {
                    const batch = updates.slice(i, i + batchSize);

                    try {
                        await zcrm.module(module).records().update(batch);
                        fixed += batch.length;
                        console.log(`[SyncHub] Fixed batch in ${module}: ${batch.length} records`);
                    } catch (error) {
                        console.error(`[SyncHub] Batch update failed:`, error);
                    }
                }

                return fixed;
            }

            // Fix both modules
            const fixedParents = await applyFixes('Parent_MTP_SKU', parentUpdates);
            const fixedChildren = await applyFixes('Products', childUpdates);

            const result = {
                status: 'success',
                totalScanned: parents.length + children.length,
                issuesFound: parentUpdates.length + childUpdates.length,
                recordsFixed: fixedParents + fixedChildren,
                details: {
                    parents: { scanned: parents.length, affected: parentUpdates.length, fixed: fixedParents },
                    children: { scanned: children.length, affected: childUpdates.length, fixed: fixedChildren }
                }
            };

            console.log('[SyncHub] Fix complete:', result);
            return res.status(200).send(result);
        }

        // Add your heavy logic here (e.g. Bulk API, File Processing)

        res.status(200).send({ status: 'success', message: 'Function executed successfully' });

    } catch (e) {
        console.error('[SyncHub] Execution Error:', e);
        res.status(500).send({ status: 'error', message: e.message, stack: e.stack });
    }
});

module.exports = app;
