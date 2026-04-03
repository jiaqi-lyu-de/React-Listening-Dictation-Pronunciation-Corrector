import React, { useState, useEffect } from 'react';
import { buildApiUrl, fetchAPI } from '../../utils/fetch';
import './HistorySelector.css';

const HistorySelector = ({ onSelect }) => {
    const [historyFiles, setHistoryFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadHistory = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const data = await fetchAPI('history', 'GET');
            if (data.success) {
                setHistoryFiles(data.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            setErrorMessage('Unable to load history right now.');
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
        setErrorMessage('');
        try {
            const data = await fetchAPI(`history/${filename}`, 'GET');
            if (onSelect) {
                // Determine audio URL
                let audioUrl = null;
                if (data.audioFilename) {
                    audioUrl = buildApiUrl(`uploads/${data.audioFilename}`);
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
            setErrorMessage('Unable to restore this history item.');
        }
    };

    return (
        <div className="history-selector">
            <button className="history-btn ui-btn-secondary" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? 'Close History' : '📜 Load History'}
            </button>

            {isOpen && (
                <div className="history-dropdown">
                    {loading ? (
                        <div className="history-loading">⏳ Loading history...</div>
                    ) : errorMessage ? (
                        <div className="history-error ui-feedback ui-feedback--error">{errorMessage}</div>
                    ) : historyFiles.length === 0 ? (
                        <div className="history-empty">📭 No history found</div>
                    ) : (
                        <ul className="history-list">
                            {historyFiles.map(file => (
                                <li key={file.filename}>
                                    <button
                                        type="button"
                                        className="history-item-btn"
                                        onClick={() => handleSelect(file.filename)}
                                    >
                                        <span className="history-name">{file.filename.replace('analysis_', '').replace('.json', '')}</span>
                                        <span className="history-date">{new Date(file.created).toLocaleDateString()}</span>
                                    </button>
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
