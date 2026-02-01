// Navbar Component - Zoho Style
import { useData } from '../context/DataContext';

const Navbar = () => {
    const { products } = useData();

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="navbar-logo">DA</div>
                <span>Dimensions Audit</span>
            </div>

            <div className="navbar-actions">
                {products.length > 0 && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            if (confirm('Clear all data?')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                    >
                        Clear Data
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
