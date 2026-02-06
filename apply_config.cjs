const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// YOUR GENERATED CREDENTIALS
const CONFIG = {
    CLIENT_ID: "1000.CGGK0M58LOXYJG9IR23UZ5G7XAZZBA",
    CLIENT_SECRET: "f60455449d30984ca1c026a872a2395cb5100dba36",
    REFRESH_TOKEN: "1000.76aa8f1ed777188556c05ffeca58d115.607b01cd7a8c1a3afcc88cf922cf9",
    SECRET_KEY: crypto.randomBytes(32).toString('hex')
};

console.log('🚀 Starting Automatic Configuration...');
console.log(`🔑 Generated Secret Key: ${CONFIG.SECRET_KEY.substring(0, 10)}...`);

const baseDir = path.join(__dirname, 'ZohoIntegrationEngine', 'functions');

const paths = {
    processor: path.join(baseDir, 'BulkDataProcessor', 'catalyst-config.json'),
    callback: path.join(baseDir, 'zohocrm_bulk_callback', 'catalyst-config.json')
};

function updateConfig(filePath, updates) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.log('⚠️  Make sure you ran "catalyst codelib:install" first!');
        return false;
    }

    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Merge updates into env_variables
        if (!content.env_variables) content.env_variables = {};
        Object.assign(content.env_variables, updates);

        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`✅ Updated: ${path.basename(filePath)}`);
        return true;
    } catch (e) {
        console.error(`❌ Error updating ${filePath}:`, e.message);
        return false;
    }
}

// Update BulkDataProcessor
const processorSuccess = updateConfig(paths.processor, {
    "CLIENT_ID": CONFIG.CLIENT_ID,
    "CLIENT_SECRET": CONFIG.CLIENT_SECRET,
    "REFRESH_TOKEN": CONFIG.REFRESH_TOKEN,
    "CODELIB_SECRET_KEY": CONFIG.SECRET_KEY
});

// Update Callback Function
const callbackSuccess = updateConfig(paths.callback, {
    "CODELIB_SECRET_KEY": CONFIG.SECRET_KEY
});

if (processorSuccess && callbackSuccess) {
    console.log('\n🎉 SUCCESS! All configurations applied.');
    console.log('👉 Next Step: Run "catalyst deploy"');
} else {
    console.log('\n⚠️  Could not update all files. Please check errors above.');
}
