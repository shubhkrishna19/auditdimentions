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

        // Add your heavy logic here (e.g. Bulk API, File Processing)

        res.status(200).send({ status: 'success', message: 'Function executred successfully' });

    } catch (e) {
        console.error('[SyncHub] Execution Error:', e);
        res.status(500).send({ status: 'error', message: e.message, stack: e.stack });
    }
});

module.exports = app;
