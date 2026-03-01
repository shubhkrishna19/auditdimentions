// Weight Category Calculator
// Determines which courier weight slab a product falls into

export const WEIGHT_SLABS = {
    STANDARD: [
        { min: 0, max: 5, label: '0-5 kg' },
        { min: 5, max: 10, label: '5-10 kg' },
        { min: 10, max: 20, label: '10-20 kg' },
        { min: 20, max: 50, label: '20-50 kg' },
        { min: 50, max: 100, label: '50-100 kg' },
        { min: 100, max: Infinity, label: '100+ kg' }
    ],
    // Add more courier-specific slabs as needed
    COURIER_A: [
        { min: 0, max: 10, label: '0-10 kg' },
        { min: 10, max: 25, label: '10-25 kg' },
        { min: 25, max: 50, label: '25-50 kg' },
        { min: 50, max: Infinity, label: '50+ kg' }
    ]
};

/**
 * Calculate weight category for a given weight
 * @param {number} weight - Weight in kg
 * @param {string} slabType - Type of slab (STANDARD, COURIER_A, etc.)
 * @returns {object} Category info
 */
export function calculateWeightCategory(weight, slabType = 'STANDARD') {
    const slabs = WEIGHT_SLABS[slabType] || WEIGHT_SLABS.STANDARD;

    for (const slab of slabs) {
        if (weight >= slab.min && weight < slab.max) {
            return {
                category: slab.label,
                min: slab.min,
                max: slab.max,
                billedAt: slab.max === Infinity ? weight : slab.max
            };
        }
    }

    // Fallback
    return {
        category: 'Unknown',
        min: 0,
        max: 0,
        billedAt: weight
    };
}

/**
 * Compare weight categories
 * @param {number} billedWeight 
 * @param {number} auditedWeight 
 * @param {string} slabType 
 * @returns {object} Comparison result
 */
export function compareWeightCategories(billedWeight, auditedWeight, slabType = 'STANDARD') {
    const billedCategory = calculateWeightCategory(billedWeight, slabType);
    const auditedCategory = calculateWeightCategory(auditedWeight, slabType);

    return {
        billedCategory: billedCategory.category,
        auditedCategory: auditedCategory.category,
        hasMismatch: billedCategory.category !== auditedCategory.category,
        billedAt: billedCategory.billedAt,
        auditedAt: auditedCategory.billedAt,
        potentialSavings: billedCategory.billedAt - auditedCategory.billedAt
    };
}

/**
 * Calculate all weight comparisons for audit results
 * @param {array} products - Products from CRM
 * @param {array} auditData - Audit data from Excel
 * @param {string} slabType - Courier slab type
 * @returns {array} Comparison results with categories
 */
export function calculateAuditWithCategories(products, auditData, slabType = 'STANDARD') {
    return products.map(product => {
        const audit = auditData.find(a => a.Product_Code === product.productCode);

        if (!audit) {
            return {
                ...product,
                auditedWeight: null,
                variance: null,
                categoryComparison: null
            };
        }

        const auditedWeight = audit.Audited_Weight || 0;
        const variance = auditedWeight - product.billedWeight;
        const categoryComparison = compareWeightCategories(
            product.billedWeight,
            auditedWeight,
            slabType
        );

        return {
            ...product,
            auditedWeight,
            variance,
            variancePercent: ((variance / product.billedWeight) * 100).toFixed(2),
            ...categoryComparison
        };
    });
}
