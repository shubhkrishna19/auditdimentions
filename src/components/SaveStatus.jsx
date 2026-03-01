// Save Status Indicator Component
import { useState, useEffect } from 'react';
import './SaveStatus.css';

const SaveStatus = () => {
    const [status, setStatus] = useState('idle'); // idle, saving, saved, error
    const [lastSaved, setLastSaved] = useState(null);

    useEffect(() => {
        const handleSaveStatus = (event) => {
            const { status: newStatus, timestamp } = event.detail;
            setStatus(newStatus);

            if (newStatus === 'saved') {
                setLastSaved(new Date(timestamp));
                // Auto-hide after 3 seconds
                setTimeout(() => setStatus('idle'), 3000);
            }
        };

        window.addEventListener('autosave-status', handleSaveStatus);
        return () => window.removeEventListener('autosave-status', handleSaveStatus);
    }, []);

    if (status === 'idle') return null;

    return (
        <div className={`save-status save-status--${status}`}>
            {status === 'saving' && (
                <>
                    <span className="save-status__spinner"></span>
                    <span>Saving...</span>
                </>
            )}
            {status === 'saved' && (
                <>
                    <span className="save-status__icon">OK</span>
                    <span>Saved to CRM</span>
                    {lastSaved && (
                        <span className="save-status__time">
                            {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                </>
            )}
            {status === 'error' && (
                <>
                    <span className="save-status__icon">!</span>
                    <span>Save failed - retry?</span>
                </>
            )}
        </div>
    );
};

export default SaveStatus;
