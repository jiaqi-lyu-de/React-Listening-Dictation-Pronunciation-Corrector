import React, { useState } from 'react';
import './DiffHistory.css';

const DiffHistory = ({ history, audioFileName, onExport }) => {
    const [exportStatus, setExportStatus] = useState('');

    const handleExport = () => {
        if (!history || history.length === 0) {
            setExportStatus('There is no practice history to export yet.');
            return;
        }

        // Get current date in YYYY-MM-DD format
        const date = new Date().toISOString().split('T')[0];

        // Extract audio filename without extension
        const audioName = audioFileName
            ? audioFileName.replace(/\.[^/.]+$/, '')
            : 'audio';

        // Create export data
        const exportData = {
            exportDate: new Date().toISOString(),
            audioFile: audioFileName || 'unknown',
            totalSentences: history.length,
            averageAccuracy: history.length > 0
                ? Math.round(history.reduce((sum, item) => sum + item.accuracy, 0) / history.length)
                : 0,
            history: history.map(item => ({
                sentenceNumber: item.sentenceNumber,
                originalText: item.originalText,
                userInput: item.userInput,
                accuracy: item.accuracy,
                timestamp: item.timestamp
            }))
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `${date}_${audioName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportStatus(`Exported ${history.length} sentence${history.length !== 1 ? 's' : ''}.`);
    };

    if (!history || history.length === 0) {
        return null;
    }

    const averageAccuracy = Math.round(
        history.reduce((sum, item) => sum + item.accuracy, 0) / history.length
    );

    return (
        <div className="diff-history-container">
            <div className="diff-history-header">
                <div className="diff-history-title-section">
                    <h3 className="diff-history-title">📝 Practice History</h3>
                    <span className="diff-history-count">{history.length} sentence{history.length !== 1 ? 's' : ''}</span>
                    <span className={`diff-history-avg accuracy-badge ${averageAccuracy >= 90 ? 'high' : averageAccuracy >= 70 ? 'medium' : 'low'}`}>
                        Avg: {averageAccuracy}%
                    </span>
                </div>
                <button className="export-btn" onClick={handleExport}>
                    📥 Export All Diffs
                </button>
            </div>

            {exportStatus && (
                <div className="diff-history-status">
                    {exportStatus}
                </div>
            )}

            <div className="diff-history-list">
                {history.map((item, index) => (
                    <div key={index} className="diff-history-item">
                        <div className="diff-history-item-header">
                            <span className="diff-history-sentence-num">Sentence #{item.sentenceNumber + 1}</span>
                            <span className={`accuracy-badge ${item.accuracy >= 90 ? 'high' : item.accuracy >= 70 ? 'medium' : 'low'}`}>
                                {item.accuracy}%
                            </span>
                        </div>
                        <div className="diff-history-texts">
                            <div className="diff-history-text-row">
                                <span className="diff-history-label">Original:</span>
                                <span className="diff-history-content">{item.originalText}</span>
                            </div>
                            <div className="diff-history-text-row">
                                <span className="diff-history-label">Your Input:</span>
                                <span className="diff-history-content">{item.userInput}</span>
                            </div>
                        </div>
                        <div className="diff-history-timestamp">
                            {new Date(item.timestamp).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiffHistory;
