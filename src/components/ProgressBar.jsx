import React from 'react';

const ProgressBar = ({ current, total, accuracy }) => {
    const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

    const getAccuracyClass = (acc) => {
        if (acc === null || acc === undefined) return '';
        if (acc >= 90) return 'excellent';
        if (acc >= 70) return 'good';
        if (acc >= 50) return 'fair';
        return 'poor';
    };

    return (
        <div className="progress-container">
            <div className="progress-header">
                <div className="progress-info">
                    <span className="progress-label">Progress</span>
                    <span className="progress-count">
                        {current + 1} / {total}
                    </span>
                </div>
                {accuracy !== null && accuracy !== undefined && (
                    <div className={`progress-accuracy ${getAccuracyClass(accuracy)}`}>
                        <span className="accuracy-label">Avg Accuracy</span>
                        <span className="accuracy-value">{accuracy}%</span>
                    </div>
                )}
            </div>
            <div className="progress-bar-track">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                >
                    <span className="progress-percentage">{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;
