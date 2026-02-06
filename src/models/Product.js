// Product Data Model for Dimensions Audit Authenticator

export const BoxType = {
  SINGLE: 'SB',
  MULTI: 'MB'
};

export const AuditStatus = {
  PENDING: 'pending',
  AUDITED: 'audited',
  DISPUTED: 'disputed',
  RESOLVED: 'resolved'
};

// Create an empty box structure
export const createEmptyBox = () => ({
  length: 0,
  breadth: 0,
  height: 0,
  weight: 0  // in kg
});

// Create a product from raw data
export const createProduct = (data = {}) => ({
  id: data.id || crypto.randomUUID(),
  skuCode: data.skuCode || '',
  boxType: data.boxType || BoxType.SINGLE,
  courierPartner: data.courierPartner || 'Default',

  // New Fields for Clean Data
  productCategory: data.productCategory || 'Uncategorized', // Real Category (e.g. Shoe Rack)
  shipmentCategory: data.shipmentCategory || '10kg', // Weight Slab (e.g. 50kg)
  manufacturer: data.manufacturer || 'Bluewud Concepts Pvt. Ltd.',
  liveStatus: data.liveStatus || 'NL', // Y, NL, etc.
  identifiers: data.identifiers || [], // Array of { Channel, Identifier }
  mtpSku: data.mtpSku || null, // { name: 'ParentName', id: 'ParentID' }

  billing: {
    boxes: data.billing?.boxes || [createEmptyBox(), createEmptyBox(), createEmptyBox()],
    volumetricWeight: data.billing?.volumetricWeight || 0,
    totalWeight: data.billing?.totalWeight || 0,
    chargeableWeight: data.billing?.chargeableWeight || 0
  },

  audit: {
    boxes: data.audit?.boxes || [createEmptyBox(), createEmptyBox(), createEmptyBox()],
    volumetricWeight: data.audit?.volumetricWeight || 0,
    totalWeight: data.audit?.totalWeight || 0,
    chargeableWeight: data.audit?.chargeableWeight || 0
  },

  variance: {
    dimensionDiff: data.variance?.dimensionDiff || {},
    weightDiff: data.variance?.weightDiff || 0,
    percentageDiff: data.variance?.percentageDiff || 0,
    costImpact: data.variance?.costImpact || 0
  },

  status: data.status || AuditStatus.PENDING,
  remark: data.remark || '',
  lastUpdated: data.lastUpdated || new Date().toISOString(),
  createdAt: data.createdAt || new Date().toISOString()
});

// Calculate volumetric weight for a box
export const calculateVolumetricWeight = (box, divisor = 5000) => {
  if (!box || !box.length || !box.breadth || !box.height) return 0;
  return (box.length * box.breadth * box.height) / divisor;
};

// Calculate total volumetric weight for all boxes
export const calculateTotalVolumetricWeight = (boxes, divisor = 5000) => {
  return boxes.reduce((total, box) => {
    return total + calculateVolumetricWeight(box, divisor);
  }, 0);
};

// Calculate total physical weight for all boxes
export const calculateTotalWeight = (boxes) => {
  return boxes.reduce((total, box) => total + (box.weight || 0), 0);
};

// Calculate chargeable weight (max of volumetric and actual)
export const calculateChargeableWeight = (boxes, divisor = 5000) => {
  const volumetric = calculateTotalVolumetricWeight(boxes, divisor);
  const actual = calculateTotalWeight(boxes); // Already in kg
  return Math.max(volumetric, actual);
};

// Calculate variance between billing and audit
export const calculateVariance = (billing, audit) => {
  const billingWeight = calculateTotalWeight(billing.boxes);
  const auditWeight = calculateTotalWeight(audit.boxes);

  const weightDiff = billingWeight - auditWeight;
  const percentageDiff = billingWeight > 0
    ? ((weightDiff / billingWeight) * 100)
    : 0;

  // Calculate dimension differences for each box
  const dimensionDiff = {};
  for (let i = 0; i < 3; i++) {
    const billingBox = billing.boxes[i] || createEmptyBox();
    const auditBox = audit.boxes[i] || createEmptyBox();

    dimensionDiff[`box${i + 1}`] = {
      length: billingBox.length - auditBox.length,
      breadth: billingBox.breadth - auditBox.breadth,
      height: billingBox.height - auditBox.height,
      weight: billingBox.weight - auditBox.weight
    };
  }

  return {
    dimensionDiff,
    weightDiff,
    percentageDiff,
    hasVariance: Math.abs(percentageDiff) > 0.1 // More than 0.1% is considered variance
  };
};

// Determine variance status based on percentage
export const getVarianceStatus = (percentageDiff, threshold = 5) => {
  const absPercent = Math.abs(percentageDiff);
  if (absPercent === 0) return 'neutral';
  if (absPercent < threshold) return 'minor';
  if (absPercent < threshold * 2) return 'moderate';
  return 'severe';
};

// Format weight for display - always in kg with 2 decimals
export const formatWeight = (kg) => {
  // Safeguard: if value is >= 1000, it wasn't normalized properly, so normalize it now
  const normalized = kg >= 1000 ? kg / 1000 : kg;
  return `${normalized.toFixed(2)} kg`;
};

// Format percentage for display - always 2 decimals
export const formatPercentage = (value) => {
  if (value === 0 || value === null || value === undefined) return '0.00%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
};

// Check if a box has data
export const hasBoxData = (box) => {
  return box && (box.length > 0 || box.breadth > 0 || box.height > 0 || box.weight > 0);
};

// Count active boxes in a product
export const countActiveBoxes = (boxes) => {
  return boxes.filter(hasBoxData).length;
};

export default {
  BoxType,
  AuditStatus,
  createProduct,
  createEmptyBox,
  calculateVolumetricWeight,
  calculateTotalVolumetricWeight,
  calculateTotalWeight,
  calculateChargeableWeight,
  calculateVariance,
  getVarianceStatus,
  formatWeight,
  formatPercentage,
  hasBoxData,
  countActiveBoxes
};
