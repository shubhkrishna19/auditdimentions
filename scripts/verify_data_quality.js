import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    const res = await axios.post(BASE_URL, payload);
    if (res.data.error) throw new Error(res.data.error.message);
    return JSON.parse(res.data.result.content[0].text);
}

async function fetchAllRecords(module) {
    let all = [];
    let page = 1;
    let hasMore = true;
    console.log(`📡 Fetching ${module}...`);
    while (hasMore) {
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module },
            query_params: {
                fields: 'Name,Product_Code,Product_Category,Weight_Category_Billed,Billed_Physical_Weight,Live_Status,ProductActive,Total_Weight,Last_Audited_Total_Weight_kg',
                per_page: 200,
                page
            }
        });
        if (res.data) {
            all = all.concat(res.data);
            if (res.info.more_records) { page++; await sleep(200); } else hasMore = false;
        } else hasMore = false;
    }
    return all;
}

async function runDataQualityAudit() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL DATA QUALITY AUDIT - POST PRODUCTION SYNC');
    console.log('='.repeat(80));

    const parents = await fetchAllRecords('Parent_MTP_SKU');
    const children = await fetchAllRecords('Products');

    console.log(`\n✅ Loaded ${parents.length} Parents, ${children.length} Children\n`);

    // Calculate Data Quality Score
    const metrics = {
        parents: {
            total: parents.length,
            hasCategory: parents.filter(p => p.Product_Category).length,
            hasWeight: parents.filter(p => p.Billed_Physical_Weight && p.Billed_Physical_Weight > 0).length,
            hasWeightCategory: parents.filter(p => p.Weight_Category_Billed).length,
            hasLiveStatus: parents.filter(p => p.ProductActive).length,
            live: parents.filter(p => p.ProductActive === 'Live').length,
            notLive: parents.filter(p => p.ProductActive === 'Not Live').length
        },
        children: {
            total: children.length,
            hasCategory: children.filter(c => c.Product_Category).length,
            hasWeight: children.filter(c => c.Total_Weight && c.Total_Weight > 0).length,
            hasAuditWeight: children.filter(c => c.Last_Audited_Total_Weight_kg && c.Last_Audited_Total_Weight_kg > 0).length,
            hasWeightCategory: children.filter(c => c.Weight_Category_Billed).length,
            hasLiveStatus: children.filter(c => c.Live_Status).length,
            live: children.filter(c => c.Live_Status === 'Live').length,
            notLive: children.filter(c => c.Live_Status === 'Not Live').length
        }
    };

    // Calculate Overall Score
    const totalFields =
        (metrics.parents.total * 4) + // Category, Weight, WeightCat, LiveStatus
        (metrics.children.total * 4);  // Category, Weight, WeightCat, LiveStatus

    const populatedFields =
        metrics.parents.hasCategory + metrics.parents.hasWeight +
        metrics.parents.hasWeightCategory + metrics.parents.hasLiveStatus +
        metrics.children.hasCategory + metrics.children.hasWeight +
        metrics.children.hasWeightCategory + metrics.children.hasLiveStatus;

    const score = ((populatedFields / totalFields) * 100).toFixed(1);

    console.log('='.repeat(80));
    console.log('📦 PARENT_MTP_SKU MODULE');
    console.log('='.repeat(80));
    console.log(`Total Records: ${metrics.parents.total}`);
    console.log(`Product Category: ${metrics.parents.hasCategory} (${((metrics.parents.hasCategory / metrics.parents.total) * 100).toFixed(1)}%)`);
    console.log(`Billed Weight: ${metrics.parents.hasWeight} (${((metrics.parents.hasWeight / metrics.parents.total) * 100).toFixed(1)}%)`);
    console.log(`Weight Category: ${metrics.parents.hasWeightCategory} (${((metrics.parents.hasWeightCategory / metrics.parents.total) * 100).toFixed(1)}%)`);
    console.log(`Live Status: ${metrics.parents.hasLiveStatus} (${((metrics.parents.hasLiveStatus / metrics.parents.total) * 100).toFixed(1)}%)`);
    console.log(`  ├─ Live: ${metrics.parents.live}`);
    console.log(`  └─ Not Live: ${metrics.parents.notLive}`);

    console.log('\n' + '='.repeat(80));
    console.log('🎨 PRODUCTS MODULE');
    console.log('='.repeat(80));
    console.log(`Total Records: ${metrics.children.total}`);
    console.log(`Product Category: ${metrics.children.hasCategory} (${((metrics.children.hasCategory / metrics.children.total) * 100).toFixed(1)}%)`);
    console.log(`Total Weight: ${metrics.children.hasWeight} (${((metrics.children.hasWeight / metrics.children.total) * 100).toFixed(1)}%)`);
    console.log(`Audited Weight: ${metrics.children.hasAuditWeight} (${((metrics.children.hasAuditWeight / metrics.children.total) * 100).toFixed(1)}%)`);
    console.log(`Weight Category: ${metrics.children.hasWeightCategory} (${((metrics.children.hasWeightCategory / metrics.children.total) * 100).toFixed(1)}%)`);
    console.log(`Live Status: ${metrics.children.hasLiveStatus} (${((metrics.children.hasLiveStatus / metrics.children.total) * 100).toFixed(1)}%)`);
    console.log(`  ├─ Live: ${metrics.children.live}`);
    console.log(`  └─ Not Live: ${metrics.children.notLive}`);

    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL DATA QUALITY SCORE');
    console.log('='.repeat(80));
    console.log(`Score: ${score}%`);
    console.log(`Populated Fields: ${populatedFields} / ${totalFields}`);

    const improvement = score - 0; // Previous score was 0%
    console.log(`\n✨ Improvement: +${improvement.toFixed(1)}% (from 0% baseline)`);

    if (score >= 95) {
        console.log('\n🎉 EXCELLENT! Data quality is production-ready!');
    } else if (score >= 80) {
        console.log('\n✅ GOOD! Data quality is acceptable for production.');
    } else {
        console.log('\n⚠️ WARNING: Data quality needs improvement.');
    }

    // Save Report
    const report = {
        timestamp: new Date().toISOString(),
        score: parseFloat(score),
        metrics,
        totalRecords: parents.length + children.length,
        improvement: parseFloat(improvement.toFixed(1))
    };

    fs.writeFileSync('data_quality_report_FINAL.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: data_quality_report_FINAL.json');
}

runDataQualityAudit();
