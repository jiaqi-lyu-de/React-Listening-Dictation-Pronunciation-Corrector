const getScoreLevel = (score) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
};

/**
 * WordGrid — Paginated word list grid.
 * Ported from wordd's renderWordGrid / renderPageNav.
 */
const WordGrid = ({
    words,           // Current page words: [{ word, hw, fl, ... }]
    baseIndex,       // Index offset for current page
    wordResults,     // Map<absIdx, result>
    pendingDeletions,// Set<absIdx>
    selectedWordIndex,
    currentPage,
    totalPages,
    pageStart,
    pageEnd,
    totalWords,
    onWordClick,
    onToggleDelete,
    onPrevPage,
    onNextPage
}) => {

    const playWord = (word) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="wr-sidebar">
            {/* Page Navigation */}
            <div className="wr-page-nav">
                <button
                    className="wr-page-nav-btn"
                    onClick={onPrevPage}
                    disabled={currentPage <= 0}
                    aria-label="Previous page"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="wr-page-info">
                    <span className="wr-page-label">Page {currentPage + 1} / {totalPages}</span>
                    <span className="wr-page-range">
                        {totalWords > 0 ? `Words ${pageStart + 1}–${pageEnd}` : 'No words'}
                    </span>
                </div>
                <button
                    className="wr-page-nav-btn"
                    onClick={onNextPage}
                    disabled={currentPage >= totalPages - 1}
                    aria-label="Next page"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            {/* Word Grid */}
            <div className="wr-word-list-container">
                <div className="wr-word-grid">
                    {words.map((item, i) => {
                        const absIdx = baseIndex + i;
                        const result = wordResults.get(absIdx);
                        const isDeleted = pendingDeletions.has(absIdx);
                        const score = result ? Math.round(result.accuracy) : null;
                        const level = score !== null ? getScoreLevel(score) : '';

                        return (
                            <div
                                key={absIdx}
                                className={`wr-word-chip ${result ? 'scored' : ''} ${level} ${isDeleted ? 'deleted' : ''} ${selectedWordIndex === absIdx ? 'active' : ''}`}
                                data-index={absIdx}
                                onClick={() => {
                                    playWord(item.word);
                                    onWordClick(absIdx);
                                }}
                            >
                                <span className="wr-word-chip-text">{item.word}</span>
                                <div className="wr-word-chip-right">
                                    {score !== null && (
                                        <span className="wr-word-chip-score">{score}</span>
                                    )}
                                    <span
                                        className="wr-word-chip-delete"
                                        title={`Delete "${item.word}"`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleDelete(absIdx);
                                        }}
                                    >
                                        ×
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WordGrid;
