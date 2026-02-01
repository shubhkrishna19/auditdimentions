// Sidebar Component for Filters
import { useData } from '../context/DataContext';

const Sidebar = () => {
    const { filter, setFilter, summary } = useData();

    return (
        <div className="sidebar">
            {/* Search */}
            <div className="form-group">
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search SKU..."
                    value={filter.search}
                    onChange={(e) => setFilter({ search: e.target.value })}
                />
            </div>

            {/* System Defined Filters */}
            <div className="filter-section">
                <div className="filter-title">System Defined Filters</div>
                <ul className="filter-list">
                    <li className="filter-item">
                        <input
                            type="checkbox"
                            checked={filter.hasVariance}
                            onChange={(e) => setFilter({ hasVariance: e.target.checked })}
                        />
                        <span>With Variance</span>
                    </li>
                </ul>
            </div>

            {/* Filter By Status */}
            <div className="filter-section">
                <div className="filter-title">Filter By Status</div>
                <ul className="filter-list">
                    <li
                        className="filter-item"
                        onClick={() => setFilter({ status: 'all' })}
                        style={{ fontWeight: filter.status === 'all' ? 600 : 400 }}
                    >
                        <span>All ({summary.total})</span>
                    </li>
                    <li
                        className="filter-item"
                        onClick={() => setFilter({ status: 'pending' })}
                        style={{ fontWeight: filter.status === 'pending' ? 600 : 400 }}
                    >
                        <span>Pending ({summary.pending})</span>
                    </li>
                    <li
                        className="filter-item"
                        onClick={() => setFilter({ status: 'audited' })}
                        style={{ fontWeight: filter.status === 'audited' ? 600 : 400 }}
                    >
                        <span>Audited ({summary.audited})</span>
                    </li>
                    <li
                        className="filter-item"
                        onClick={() => setFilter({ status: 'disputed' })}
                        style={{ fontWeight: filter.status === 'disputed' ? 600 : 400 }}
                    >
                        <span>Disputed ({summary.disputed || 0})</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;
