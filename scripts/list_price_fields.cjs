const fs = require('fs');

const file = 'parent_fields.json';

if (fs.existsSync(file)) {
    const fields = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Found ${fields.length} fields. Filtering for Price/Number...`);

    const relevantFields = fields.filter(f =>
        ['currency', 'double', 'integer', 'bigint'].includes(f.data_type) ||
        f.display_label.toLowerCase().includes('price') ||
        f.display_label.toLowerCase().includes('mrp') ||
        f.display_label.toLowerCase().includes('cost') ||
        f.display_label.toLowerCase().includes('amount')
    );

    relevantFields.forEach(f => {
        console.log(`- ${f.display_label} (API: ${f.api_name}, Type: ${f.data_type})`);
    });
} else {
    console.log('File not found:', file);
}
