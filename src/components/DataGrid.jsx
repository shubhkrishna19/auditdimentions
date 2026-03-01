// Data Grid Component - Zoho Style
import { useState, useMemo } from 'react';
import { formatWeight, formatPercentage } from '../models/Product';

const DataGrid = ({
    products,
    onRowClick,
    sortable = true,
    pageSize = 100
}) => {
    const [sortConfig, setSortConfig] = useState({ key: 'skuCode', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    const sortedProducts = useMemo(() => {
        if (!sortable || !sortConfig.key) return products;

        return [...products].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle nested values
            if (sortConfig.key === 'billingWeight') {
                aValue = a.billing?.totalWeight || 0;
                bValue = b.billing?.totalWeight || 0;
            } else if (sortConfig.key === 'auditWeight') {
                aValue = a.audit?.totalWeight || 0;
                bValue = b.audit?.totalWeight || 0;
            } else if (sortConfig.key === 'variancePercent') {
                aValue = a.variance?.percentageDiff || 0;
                bValue = b.variance?.percentageDiff || 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [products, sortConfig, sortable]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return sortedProducts.slice(startIndex, startIndex + pageSize);
    }, [sortedProducts, currentPage, pageSize]);

    const totalPages = Math.ceil(products.length / pageSize);

    const handleSort = (key) => {
        if (!sortable) return;
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            audited: 'badge-success',
            disputed: 'badge-danger',
            resolved: 'badge-primary'
        };
        return badges[status] || 'badge-neutral';
    };

    const getVarianceClass = (percentage) => {
        if (!percentage || percentage === 0) return 'variance-neutral';
        return percentage > 0 ? 'variance-positive' : 'variance-negative';
    };

    if (products.length === 0) {
        return (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <p className="text-muted">No products found</p>
            </div>
        );
    }

    return (
        <div>
            <table className="table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <input type="checkbox" />
                        </th>
                        <th className="sortable" onClick={() => handleSort('skuCode')}>
                            SKU CODE{getSortIcon('skuCode')}
                        </th>
                        <th>TYPE</th>
                        <th className="sortable" onClick={() => handleSort('billingWeight')}>
                            BILLING WEIGHT{getSortIcon('billingWeight')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('auditWeight')}>
                            AUDIT WEIGHT{getSortIcon('auditWeight')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('variancePercent')}>
                            VARIANCE %{getSortIcon('variancePercent')}
                        </th>
                        <th>STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedProducts.map((product) => (
                        <tr
                            key={product.id || product.skuCode}
                            onClick={() => onRowClick?.(product)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                        >
                            <td>
                                <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td>
                                <span className="font-mono">{product.skuCode}</span>
                            </td>
                            <td>
                                <span className="badge badge-neutral">{product.boxType}</span>
                            </td>
                            <td>{formatWeight(product.billing?.totalWeight || 0)}</td>
                            <td>{formatWeight(product.audit?.totalWeight || 0)}</td>
                            <td className={getVarianceClass(product.variance?.percentageDiff)}>
                                {formatPercentage(product.variance?.percentageDiff || 0)}
                            </td>
                            <td>
                                {product.status === 'audited' ? (
                                    <span className="checkmark">OK</span>
                                ) : (
                                    <span className={`badge ${getStatusBadge(product.status)}`}>
                                        {product.status}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="pagination">
                    <span className="pagination-info">
                        {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, products.length)} of {products.length}
                    </span>
                    <div className="pagination-controls">
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            ‹ Previous
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataGrid;
