import React, { useState, useEffect } from 'react';
import './HistorySelector.css';

const HistorySelector = ({ onSelect }) => {
    const [historyFiles, setHistoryFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8888/history');
            const data = await response.json();
            if (data.success) {
                setHistoryFiles(data.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const handleSelect = async (filename) => {
        try {
            const response = await fetch(`http://localhost:8888/history/${filename}`);
            const data = await response.json();
            if (onSelect) {
                // Determine audio URL
                let audioUrl = null;
                if (data.audioFilename) {
                    audioUrl = `http://localhost:8888/uploads/${data.audioFilename}`;
                }

                onSelect({
                    text: { transcript: data.transcript },
                    audioUrl: audioUrl,
                    fileName: data.originalName
                });
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Failed to load history item:', error);
            alert('Failed to load history item');
        }
    };

    return (
        <div className="history-selector">
            <button className="history-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? 'Close History' : '📜 Load History'}
            </button>

            {isOpen && (
                <div className="history-dropdown">
                    {loading ? (
                        <div className="history-loading">Loading...</div>
                    ) : historyFiles.length === 0 ? (
                        <div className="history-empty">No history found</div>
                    ) : (
                        <ul className="history-list">
                            {historyFiles.map(file => (
                                <li key={file.filename} onClick={() => handleSelect(file.filename)}>
                                    <span className="history-name">{file.filename.replace('analysis_', '').replace('.json', '')}</span>
                                    <span className="history-date">{new Date(file.created).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistorySelector;
