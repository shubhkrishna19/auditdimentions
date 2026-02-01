import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import WeightAudit from './components/WeightAudit';
import './styles/design-system.css';

function App() {
  return (
    <DataProvider>
      <div className="app-container">
        <Navbar />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <WeightAudit />
          </main>
        </div>
      </div>
    </DataProvider>
  );
}

export default App;
