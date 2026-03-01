
import fs from 'fs';

function analyze(filePath, moduleName) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${filePath} not found.`);
        return;
    }

    const fields = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n🔍 Analyzing ${moduleName} Fields...`);

    let found = false;
    fields.forEach(field => {
        if (
            field.data_type === 'subform' ||
            field.display_label.toLowerCase().includes('identifier') ||
            field.api_name.toLowerCase().includes('identifier')
        ) {
            console.log(`   🔸 [${field.data_type}] ${field.display_label} (API: ${field.api_name}, ID: ${field.id})`);
            if (field.subform) {
                console.log(`     Subform Module: ${field.subform.module}`);
            }
            found = true;
        }
    });

    if (!found) {
        console.log('   ❌ No Identifier/Subform fields found.');
    }
}

analyze('product_fields.json', 'Products');
analyze('parent_fields.json', 'Parent_MTP_SKU');
