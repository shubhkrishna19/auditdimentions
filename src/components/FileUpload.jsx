// File Upload Component for Excel files
import { useState, useRef } from 'react';

const FileUpload = ({ onFileSelect, isLoading = false }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = (file) => {
        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            '.xlsx',
            '.xls',
            '.csv'
        ];

        const isValid = validTypes.some(type =>
            file.type === type || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
        );

        if (!isValid) {
            alert('Please upload an Excel file (.xlsx, .xls) or CSV file');
            return;
        }

        setSelectedFile(file);
        if (onFileSelect) {
            onFileSelect(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div
            className={`file-upload-zone ${isDragOver ? 'dragover' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                style={{ display: 'none' }}
            />

            {isLoading ? (
                <div className="file-upload-loading">
                    <div className="animate-spin" style={{
                        width: 48,
                        height: 48,
                        border: '3px solid var(--border-default)',
                        borderTopColor: 'var(--primary-500)',
                        borderRadius: '50%',
                        margin: '0 auto var(--space-4)'
                    }} />
                    <p className="file-upload-text">Processing file...</p>
                </div>
            ) : selectedFile ? (
                <div className="file-upload-success">
                    <svg className="file-upload-icon" style={{ color: 'var(--success-500)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                    <p className="file-upload-text">{selectedFile.name}</p>
                    <p className="file-upload-hint">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                    </p>
                    <button
                        className="btn btn-ghost btn-sm mt-4"
                        onClick={handleClear}
                    >
                        Clear Selection
                    </button>
                </div>
            ) : (
                <>
                    <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="file-upload-text">
                        Drop your Excel file here, or <span style={{ color: 'var(--primary-400)' }}>browse</span>
                    </p>
                    <p className="file-upload-hint">
                        Supports: .xlsx, .xls, .csv files
                    </p>
                </>
            )}
        </div>
    );
};

export default FileUpload;
