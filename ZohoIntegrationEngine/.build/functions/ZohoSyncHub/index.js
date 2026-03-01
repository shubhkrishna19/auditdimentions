const express = require('express');
// const catalyst = require('zcatalyst-sdk-node'); // Lazy load instead

const app = express();
app.use(express.json());

// health check endpoint (SDK-free)
app.get('/health', (req, res) => {
    res.status(200).send({
        status: 'success',
        message: 'ZohoSyncHub is running!',
        timestamp: new Date().toISOString()
    });
});

app.post('/', async (req, res) => {
    try {
        console.log('[SyncHub] Request received');

        let catalyst;
        try {
            catalyst = require('zcatalyst-sdk-node');
        } catch (e) {
            console.error('SDK Load Failed:', e);
            return res.status(500).send({ status: 'error', message: 'SDK Module Missing/Incompatible', details: e.message });
        }

        // Initialize Catalyst
        const catalystApp = catalyst.initialize(req);

        const { action, sku, data } = req.body;
        console.log(`[SyncHub] Action: ${action} | SKU: ${sku}`);

        if (action === 'test_connection') {
            // Test SDK Initialization only
            const connName = 'zoho_crm'; // connection name
            try {
                const conn = catalystApp.connection(connName);
                res.status(200).send({
                    status: 'success',
                    message: `Connection object for '${connName}' created (not tested yet)`
                });
            } catch (e) {
                res.status(500).send({ status: 'error', message: `SDK Connection init failed: ${e.message}` });
            }
            return;
        }

        if (action === 'list_products') {
            await handleListProducts(catalystApp, res);
        } else if (action === 'update_single') {
            await handleUpdateSingle(catalystApp, sku, data, res);
        } else {
            res.status(400).send({ status: 'error', message: 'Invalid action' });
        }

    } catch (error) {
        console.error('[SyncHub] Global Error:', error);
        res.status(500).send({ status: 'error', message: error.message, stack: error.stack });
    }
});

async function handleListProducts(catalystApp, res) {
    try {
        console.log('[SyncHub] Fetching products from Zoho CRM...');

        // Get Zoho CRM connector
        const crm = catalystApp.connection('zoho_crm').getConnector('crm');

        const allProducts = [];

        // 1. Fetch Parent MTP SKUs
        console.log('[SyncHub] Fetching Parent MTP SKUs...');
        try {
            const parentsResp = await crm.module('Parent_MTP_SKU').get();
            const parents = parentsResp.data || [];

            console.log(`[SyncHub] Found ${parents.length} parents`);

            parents.forEach(p => {
                allProducts.push({
                    id: p.id,
                    skuCode: p.Name, // Using Name as SKU for Parent
                    productName: p.Product_MTP_Name || p.Name,
                    productType: 'parent',
                    billedTotalWeight: (Number(p.Billed_Physical_Weight) || 0) / 1000,
                    hasAudit: false,
                    boxes: (p.MTP_Box_Dimensions || []).map(b => ({
                        boxNumber: b.Box,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: (Number(b.Weight) || 0) / 1000
                    }))
                });
            });
        } catch (e) {
            console.warn('[SyncHub] Parent fetch failed:', e.message);
        }

        // 2. Fetch Child Products
        console.log('[SyncHub] Fetching Child Products...');
        try {
            const childrenResp = await crm.module('Products').get();
            const children = childrenResp.data || [];

            console.log(`[SyncHub] Found ${children.length} children`);

            children.forEach(p => {
                allProducts.push({
                    id: p.id,
                    skuCode: p.Product_Code,
                    productName: p.Product_Name,
                    productType: 'child',
                    billedTotalWeight: (Number(p.Total_Weight) || 0) / 1000,
                    auditedWeight: (Number(p.Last_Audited_Total_Weight_kg) || 0) / 1000,
                    hasAudit: !!p.Last_Audited_Total_Weight_kg,
                    parentId: p.MTP_SKU?.id,
                    boxes: (p.Bill_Dimension_Weight || []).map(b => ({
                        boxNumber: b.BL,
                        length: b.Length, width: b.Width, height: b.Height,
                        weight: b.Weight
                    }))
                });
            });
        } catch (e) {
            console.warn('[SyncHub] Child fetch failed:', e.message);
        }

        console.log(`[SyncHub] Total: ${allProducts.length} products`);

        return res.status(200).send({
            status: 'success',
            products: allProducts,
            count: allProducts.length
        });

    } catch (e) {
        console.error('[SyncHub] List Error:', e);
        return res.status(500).send({
            status: 'error',
            message: e.message,
            stack: e.stack
        });
    }
}

async function handleUpdateSingle(catalystApp, sku, productData, res) {
    try {
        const crm = catalystApp.connection('zoho_crm').getConnector('crm');

        // 1. Search in Parent module first
        let parentSearch = await crm.module('Parent_MTP_SKU').searchByCriteria(`(Product_Code:equals:${sku})`);

        if (parentSearch && parentSearch.length > 0) {
            const parent = parentSearch[0];
            const weightKG = Number(productData.weights.chargeable) || 0;
            const weightGrams = Math.round(weightKG * 1000);

            const parentPayload = {
                id: parent.id,
                Billed_Physical_Weight: weightGrams,
                Billed_Chargeable_Weight: weightGrams,
                Weight_Category_Billed: productData.weights.category
            };

            // Only update boxes if provided
            if (productData.boxes?.length > 0) {
                parentPayload.MTP_Box_Dimensions = productData.boxes.map((b, idx) => ({
                    Box: String(idx + 1),
                    Length: Number(b.length),
                    Width: Number(b.width),
                    Height: Number(b.height),
                    Weight: Math.round(Number(b.weight) * 1000), // Grams
                    Box_Measurement: 'cm',
                    Weight_Measurement: 'Gram'
                }));
            }

            await crm.module('Parent_MTP_SKU').updateRecord(parentPayload);
            console.log(`[SyncHub] Parent ${sku} updated.`);

            // Propagate to children
            let childrenSearch = await crm.module('Products').searchByCriteria(`(MTP_SKU:equals:${parent.id})`);

            if (childrenSearch && childrenSearch.length > 0) {
                for (const child of childrenSearch) {
                    const childPayload = {
                        id: child.id,
                        Last_Audited_Total_Weight_kg: weightKG,
                        Total_Weight: weightKG,
                        Weight_Category_Billed: productData.weights.category
                    };
                    // Propagate dimensions too if needed (optional based on biz logic)
                    if (productData.boxes?.length > 0) {
                        childPayload.Bill_Dimension_Weight = productData.boxes.map((b, idx) => ({
                            BL: String(idx + 1),
                            Length: Number(b.length),
                            Width: Number(b.width),
                            Height: Number(b.height),
                            Weight: Number(b.weight),
                            Box_Measurement: 'cm',
                            Weight_Measurement: 'kg'
                        }));
                    }
                    await crm.module('Products').updateRecord(childPayload);
                }
            }

            return res.status(200).send({
                status: 'success',
                message: `Parent and ${childrenSearch.length} children synchronized.`
            });
        }

        // 2. Fallback: Search in Products
        let productSearch = await crm.module('Products').searchByCriteria(`(Product_Code:equals:${sku})`);

        if (productSearch && productSearch.length > 0) {
            const product = productSearch[0];
            const weightKG = Number(productData.weights.chargeable) || 0;

            const productPayload = {
                id: product.id,
                Last_Audited_Total_Weight_kg: weightKG,
                Total_Weight: weightKG,
                Weight_Category_Billed: productData.weights.category,
                Last_Audit_Date: new Date().toISOString().split('T')[0]
            };

            if (productData.boxes?.length > 0) {
                productPayload.Bill_Dimension_Weight = productData.boxes.map((b, idx) => ({
                    BL: String(idx + 1),
                    Length: Number(b.length),
                    Width: Number(b.width),
                    Height: Number(b.height),
                    Weight: Number(b.weight),
                    Box_Measurement: 'cm',
                    Weight_Measurement: 'kg'
                }));
            }

            await crm.module('Products').updateRecord(productPayload);
            return res.status(200).send({ status: 'success', message: 'Product updated successfully.' });
        }

        return res.status(404).send({ status: 'error', message: `Product ${sku} not found` });

    } catch (e) {
        console.error('[SyncHub] Update Error:', e);
        return res.status(500).send({ status: 'error', message: e.message });
    }
}

module.exports = app;
