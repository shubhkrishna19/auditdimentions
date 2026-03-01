// Sidebar Component for Filters
import { useData } from '../context/DataContext';
import './Sidebar.css';

const Sidebar = ({ currentView, onViewChange }) => {
    const { filter, setFilter, summary } = useData();

    return (
        <div className="sidebar">
            {/* View Selection */}
            <div className="view-selector">
                <button
                    className={`view-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => onViewChange('dashboard')}
                >
                    📊 Dashboard (Admin)
                </button>
                <button
                    className={`view-btn ${currentView === 'warehouse' ? 'active' : ''}`}
                    onClick={() => onViewChange('warehouse')}
                >
                    📦 Warehouse Entry
                </button>
            </div>

            <div className="sidebar-divider"></div>

            {/* Filters - Only show in Dashboard mode */}
            {currentView === 'dashboard' && (
                <>
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
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filter.hasVariance}
                                        onChange={(e) => setFilter({ hasVariance: e.target.checked })}
                                    />
                                    <span>With Variance</span>
                                </label>
                            </li>
                        </ul>
                    </div>

                    {/* Filter By Status */}
                    <div className="filter-section">
                        <div className="filter-title">Filter By Status</div>
                        <ul className="filter-list">
                            <li
                                className={`filter-item ${filter.status === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter({ status: 'all' })}
                            >
                                <span>All ({summary.total})</span>
                            </li>
                            <li
                                className={`filter-item ${filter.status === 'pending' ? 'active' : ''}`}
                                onClick={() => setFilter({ status: 'pending' })}
                            >
                                <span>Pending ({summary.pending})</span>
                            </li>
                            <li
                                className={`filter-item ${filter.status === 'audited' ? 'active' : ''}`}
                                onClick={() => setFilter({ status: 'audited' })}
                            >
                                <span>Audited ({summary.audited})</span>
                            </li>
                            <li
                                className={`filter-item ${filter.status === 'disputed' ? 'active' : ''}`}
                                onClick={() => setFilter({ status: 'disputed' })}
                            >
                                <span>Disputed ({summary.disputed || 0})</span>
                            </li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default Sidebar;
