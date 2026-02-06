const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
    try {
        const catalystApp = catalyst.initialize(req);
        const { action, sku, data } = req.body;

        console.log(`[SyncHub] Action: ${action}, SKU: ${sku}`);

        if (action === 'update_single') {
            await handleUpdateSingle(catalystApp, sku, data, res);
        } else if (action === 'sync_all') {
            await handleSyncAll(catalystApp, res);
        } else {
            res.status(400).send({ status: 'error', message: 'Invalid action' });
        }

    } catch (error) {
        console.error('[SyncHub] Global Error:', error);
        res.status(500).send({ status: 'error', message: error.message });
    }
};

async function handleUpdateSingle(app, sku, productData, res) {
    try {
        const zcrm = app.zcrm();

        // 1. IDENTITY LOOKUP: Search in Parent module first
        let parentSearch = await zcrm.module('Parent_MTP_SKU').searchByCriteria(`(Product_Code:equals:${sku})`);

        if (parentSearch && parentSearch.length > 0) {
            const parent = parentSearch[0];
            const weightKG = Number(productData.weights.chargeable) || (Number(productData.weights.physical) / 1000) || 0;
            const weightGrams = Math.round(weightKG * 1000);

            // 🏗️ BUILD PARENT PAYLOAD
            const parentPayload = {
                id: parent.id,
                Billed_Physical_Weight: weightGrams,
                Billed_Chargeable_Weight: weightGrams,
                Billed_Volumetric_Weight: weightGrams,
                Weight_Category_Billed: productData.weights.category,
                Processing_Status: 'Y'
            };

            // Map boxes if provided
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

            const pResult = await zcrm.module('Parent_MTP_SKU').updateRecord(parentPayload);
            console.log(`[SyncHub] Parent ${sku} updated.`);

            // 👨‍👦‍👦 PROPAGATION: Find all children linked to this parent
            let childrenSearch = await zcrm.module('Products').searchByCriteria(`(MTP_SKU:equals:${parent.id})`);
            let childCount = 0;

            if (childrenSearch && childrenSearch.length > 0) {
                for (const child of childrenSearch) {
                    const childPayload = {
                        id: child.id,
                        Last_Audited_Total_Weight_kg: weightKG,
                        Total_Weight: weightKG,
                        Weight_Category_Billed: productData.weights.category
                    };

                    if (productData.boxes?.length > 0) {
                        childPayload.Bill_Dimension_Weight = productData.boxes.map((b, idx) => ({
                            BL: String(idx + 1),
                            Length: Number(b.length),
                            Width: Number(b.width),
                            Height: Number(b.height),
                            Weight: Number(b.weight), // KG for products
                            Box_Measurement: 'cm',
                            Weight_Measurement: 'kg'
                        }));
                    }
                    await zcrm.module('Products').updateRecord(childPayload);
                    childCount++;
                }
            }

            return res.status(200).send({
                status: 'success',
                message: `Parent and ${childCount} children synchronized.`,
                moduleId: 'Parent_MTP_SKU'
            });
        }

        // 2. FALLBACK: Search in Products module
        let productSearch = await zcrm.module('Products').searchByCriteria(`(Product_Code:equals:${sku})`);

        const weightKG = Number(productData.weights.chargeable) || (Number(productData.weights.physical) / 1000) || 0;

        if (productSearch && productSearch.length > 0) {
            const product = productSearch[0];

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

            await zcrm.module('Products').updateRecord(productPayload);
            return res.status(200).send({
                status: 'success',
                message: 'Product updated successfully.',
                moduleId: 'Products'
            });
        }

        // 3. AUTO-CREATE: If not found in Parent or Products, create new in Products
        console.log(`[SyncHub] SKU ${sku} not found. Creating new Product record...`);

        const newProductPayload = {
            Product_Code: sku,
            Product_Name: sku, // Default name to SKU if missing
            Last_Audited_Total_Weight_kg: weightKG,
            Total_Weight: weightKG,
            Weight_Category_Billed: productData.weights.category,
            Last_Audit_Date: new Date().toISOString().split('T')[0],
            Product_Active: true
        };

        if (productData.boxes?.length > 0) {
            newProductPayload.Bill_Dimension_Weight = productData.boxes.map((b, idx) => ({
                BL: String(idx + 1),
                Length: Number(b.length),
                Width: Number(b.width),
                Height: Number(b.height),
                Weight: Number(b.weight),
                Box_Measurement: 'cm',
                Weight_Measurement: 'kg'
            }));
        }

        const createResult = await zcrm.module('Products').insertRecord(newProductPayload);

        res.status(201).send({
            status: 'success',
            message: `New Product record created for ${sku}`,
            data: createResult
        });

    } catch (error) {
        console.error('[SyncHub] Single Update Error:', error);
        res.status(500).send({ status: 'error', message: error.message });
    }
}

async function handleSyncAll(app, res) {
    res.status(202).send({
        status: 'success',
        message: 'Master Sync logic is now embedded in the standard update flow.'
    });
}
