
import fs from 'fs';

const layout = JSON.parse(fs.readFileSync('layout_dump.json', 'utf8'));

console.log('🔍 Analyzing Layout Dump...');

const sections = layout.sections;
sections.forEach(section => {
    console.log(`\n[Section: ${section.display_label}]`);
    section.fields.forEach(field => {
        if (field.data_type === 'subform') {
            console.log(`   📦 SUBFORM: ${field.display_label} (API: ${field.api_name}, ID: ${field.id})`);
            // field.subform does not contain fields definition in the layout usually?
            // Actually, in Zoho v2/v3 layout, the subfield definitions are often inside 'subform' property or separate?
            // Let's check field properties
            if (field.subform) {
                console.log('      Has subform definition.');
            }
        } else {
            // Check if it looks like what we want
            if (field.display_label.includes('Identifier') || field.display_label.includes('Channel')) {
                console.log(`   🔸 Field: ${field.display_label} (API: ${field.api_name})`);
            }
        }
    });
});
