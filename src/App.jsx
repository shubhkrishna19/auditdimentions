import { useState } from 'react';
import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WeightAudit from './components/WeightAudit';
import WarehouseEntry from './components/WarehouseEntry'; // New Component
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/design-system.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'warehouse'

  return (
    <DataProvider>
      <div className="app-container">
        <Navbar />
        <div className="app-layout">
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="main-content">
            {currentView === 'dashboard' ? (
              <WeightAudit />
            ) : (
              <WarehouseEntry />
            )}
          </main>
        </div>
        {/* Toast Notifications */}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </DataProvider>
  );
}

export default App;
