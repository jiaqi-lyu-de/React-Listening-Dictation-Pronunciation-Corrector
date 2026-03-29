import { useState, useEffect, useCallback, useRef } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import WordGrid from './WordGrid';
import WordDetail from './WordDetail';
import './WordReading.css';

const PAGE_SIZE = 30;

const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success, #10b981)';
    if (score >= 60) return 'var(--warning, #f59e0b)';
    return 'var(--error, #ef4444)';
};

/**
 * WordReading — Main container for the Word Reading module.
 * Migrated from wordd project. Uses useAzureSpeech for all speech interactions.
 */
const WordReading = () => {
    const [allWords, setAllWords] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [wordResults, setWordResults] = useState(new Map());
    const [pendingDeletions, setPendingDeletions] = useState(new Set());
    const [selectedWordIndex, setSelectedWordIndex] = useState(null);
    const [overallScores, setOverallScores] = useState(null);
    const [toast, setToast] = useState('');
    const [loading, setLoading] = useState(true);

    const segmentsRef = useRef([]);
    const { isRecording, startContinuousAssessment, stopContinuousAssessment } = useAzureSpeech();

    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(''), 2500);
    }, []);

    // Load words from public/words.json
    useEffect(() => {
        const loadWords = async () => {
            try {
                const resp = await fetch('/words.json');
                const data = await resp.json();
                setAllWords(data);
            } catch (err) {
                console.error('Failed to load words:', err);
                showToast('Failed to load word list');
            } finally {
                setLoading(false);
            }
        };
        loadWords();
    }, [showToast]);

    // Derived values
    const totalPages = Math.max(1, Math.ceil(allWords.length / PAGE_SIZE));
    const pageStart = currentPage * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, allWords.length);
    const pageWords = allWords.slice(pageStart, pageEnd);
    const pageScoredCount = pageWords.reduce((count, _, i) => count + (wordResults.has(pageStart + i) ? 1 : 0), 0);
    const pagePendingDeleteCount = pageWords.reduce((count, _, i) => count + (pendingDeletions.has(pageStart + i) ? 1 : 0), 0);
    const pageRemainingCount = Math.max(0, pageWords.length - pagePendingDeleteCount);

    // Toggle delete mark
    const toggleDelete = useCallback((absIdx) => {
        setPendingDeletions(prev => {
            const next = new Set(prev);
            if (next.has(absIdx)) {
                next.delete(absIdx);
            } else {
                next.add(absIdx);
            }
            return next;
        });
    }, []);

    // Persist deletions to server
    const persistDeletions = useCallback(async () => {
        if (pendingDeletions.size === 0) return 0;

        const sortedIndices = Array.from(pendingDeletions).sort((a, b) => b - a);
        const deletedCount = sortedIndices.length;

        let updatedWords = [...allWords];
        let updatedResults = new Map(wordResults);

        for (const absIdx of sortedIndices) {
            updatedWords.splice(absIdx, 1);
            const newResults = new Map();
            for (const [idx, val] of updatedResults) {
                if (idx < absIdx) {
                    newResults.set(idx, val);
                } else if (idx > absIdx) {
                    newResults.set(idx - 1, val);
                }
            }
            updatedResults = newResults;
        }

        setAllWords(updatedWords);
        setWordResults(updatedResults);
        setPendingDeletions(new Set());

        // Save to server
        try {
            await fetch('http://localhost:8888/save-words-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedWords),
            });
            showToast(`Permanently deleted ${deletedCount} words`);
        } catch (e) {
            console.error('Save error:', e);
        }

        return deletedCount;
    }, [allWords, wordResults, pendingDeletions, showToast]);

    // Record low score attempt
    const recordLowScore = useCallback(async (word, score, phonemes) => {
        try {
            await fetch('http://localhost:8888/record-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, score, phonemes }),
            });
        } catch (e) {
            console.error('Record attempt failed:', e);
        }
    }, []);

    // Page navigation
    const handlePrevPage = useCallback(async () => {
        if (currentPage <= 0) return;
        await persistDeletions();
        setCurrentPage(prev => Math.max(0, prev - 1));
        setWordResults(new Map());
        setOverallScores(null);
        setSelectedWordIndex(null);
    }, [currentPage, persistDeletions]);

    const handleNextPage = useCallback(async () => {
        if (currentPage >= totalPages - 1) return;
        await persistDeletions();
        const newMax = Math.max(1, Math.ceil(allWords.length / PAGE_SIZE)) - 1;
        setCurrentPage(prev => Math.min(newMax, prev + 1));
        setWordResults(new Map());
        setOverallScores(null);
        setSelectedWordIndex(null);
    }, [currentPage, totalPages, allWords.length, persistDeletions]);

    // Batch recording (Space key)
    const handleBatchRecord = useCallback(() => {
        if (isRecording) {
            // Stop
            stopContinuousAssessment(segmentsRef.current).then(overall => {
                if (overall) {
                    setOverallScores(overall);
                    showToast('Page assessment complete');
                }
            });
        } else {
            // Start
            const assessmentWords = pageWords.filter((_, i) => !pendingDeletions.has(pageStart + i));
            if (assessmentWords.length === 0) {
                showToast('No words to assess');
                return;
            }

            const referenceText = assessmentWords.map(w => w.word).join(' ');
            segmentsRef.current = [];
            setWordResults(new Map());
            setOverallScores(null);
            setSelectedWordIndex(null);
            showToast('Started page assessment');

            startContinuousAssessment(
                referenceText,
                // onWordRecognized — real-time word highlighting
                (recognized) => {
                    setWordResults(prev => {
                        const next = new Map(prev);
                        // Find matching word on page
                        for (let i = 0; i < pageWords.length; i++) {
                            const absIdx = pageStart + i;
                            if (next.has(absIdx)) continue;
                            if (pageWords[i].word.toLowerCase().replace(/[^a-z]/g, '') ===
                                recognized.word.toLowerCase().replace(/[^a-z]/g, '')) {
                                next.set(absIdx, {
                                    accuracy: recognized.accuracy,
                                    pronScore: recognized.accuracy,
                                    wordGroups: [{
                                        word: recognized.word,
                                        phonemes: recognized.phonemes
                                    }]
                                });

                                // Record low score
                                if (recognized.accuracy <= 80) {
                                    recordLowScore(recognized.word, recognized.accuracy, recognized.phonemes);
                                }
                                break;
                            }
                        }
                        return next;
                    });
                },
                // onSegmentResult — collect for overall scores
                (segment) => {
                    segmentsRef.current.push(segment);
                }
            );
        }
    }, [isRecording, pageWords, pageStart, pendingDeletions, showToast,
        startContinuousAssessment, stopContinuousAssessment, recordLowScore]);

    // Single word record result
    const handleSingleRecordResult = useCallback((result) => {
        if (selectedWordIndex === null) return;
        setWordResults(prev => {
            const next = new Map(prev);
            next.set(selectedWordIndex, result);
            return next;
        });

        // Record low score
        if (result.accuracy <= 80) {
            const word = allWords[selectedWordIndex];
            const phonemes = result.wordGroups?.flatMap(g => g.phonemes) || [];
            recordLowScore(word?.word, result.accuracy, phonemes);
        }
    }, [selectedWordIndex, allWords, recordLowScore]);

    const selectRelativeWord = useCallback((direction) => {
        if (pageWords.length === 0) return;

        if (selectedWordIndex === null) {
            setSelectedWordIndex(pageStart);
            return;
        }

        const nextIndex = Math.min(pageEnd - 1, Math.max(pageStart, selectedWordIndex + direction));
        setSelectedWordIndex(nextIndex);
    }, [pageEnd, pageStart, pageWords.length, selectedWordIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                handleBatchRecord();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectRelativeWord(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectRelativeWord(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextPage();
            } else if (e.key === 'Escape') {
                setSelectedWordIndex(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleBatchRecord, handlePrevPage, handleNextPage, selectRelativeWord]);

    if (loading) {
        return (
            <div className="wr-container">
                <div className="wr-loading">Loading word list...</div>
            </div>
        );
    }

    const selectedWord = selectedWordIndex !== null ? allWords[selectedWordIndex] : null;
    const selectedResult = selectedWordIndex !== null ? wordResults.get(selectedWordIndex) : null;

    return (
        <div className="wr-container">
            <div className="wr-layout">
                {/* Left: Word Grid + Controls */}
                <div className="wr-left">
                    <div className="wr-session-bar">
                        <div className="wr-session-chip">
                            <span className="wr-session-chip-label">This Page</span>
                            <strong>{pageWords.length} words</strong>
                        </div>
                        <div className="wr-session-chip">
                            <span className="wr-session-chip-label">Scored</span>
                            <strong>{pageScoredCount}</strong>
                        </div>
                        <div className="wr-session-chip">
                            <span className="wr-session-chip-label">Pending Delete</span>
                            <strong>{pagePendingDeleteCount}</strong>
                        </div>
                        <div className="wr-session-chip">
                            <span className="wr-session-chip-label">Active Pool</span>
                            <strong>{pageRemainingCount}</strong>
                        </div>
                    </div>

                    {/* Overall Summary */}
                    {overallScores && (
                        <div className="wr-overall-summary">
                            <div className="wr-summary-stats">
                                <div className="wr-summary-stat">
                                    <span className="wr-summary-stat-value" style={{ color: getScoreColor(overallScores.accuracy) }}>
                                        {Math.round(overallScores.accuracy)}
                                    </span>
                                    <span className="wr-summary-stat-label">Acc</span>
                                </div>
                                <div className="wr-summary-stat">
                                    <span className="wr-summary-stat-value" style={{ color: getScoreColor(overallScores.fluency) }}>
                                        {Math.round(overallScores.fluency)}
                                    </span>
                                    <span className="wr-summary-stat-label">Flu</span>
                                </div>
                                <div className="wr-summary-stat">
                                    <span className="wr-summary-stat-value" style={{ color: getScoreColor(overallScores.completeness) }}>
                                        {Math.round(overallScores.completeness)}
                                    </span>
                                    <span className="wr-summary-stat-label">Comp</span>
                                </div>
                                <div className="wr-summary-stat">
                                    <span className="wr-summary-stat-value" style={{ color: getScoreColor(overallScores.pronScore) }}>
                                        {Math.round(overallScores.pronScore)}
                                    </span>
                                    <span className="wr-summary-stat-label">Pron</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <WordGrid
                        words={pageWords}
                        baseIndex={pageStart}
                        wordResults={wordResults}
                        pendingDeletions={pendingDeletions}
                        selectedWordIndex={selectedWordIndex}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageStart={pageStart}
                        pageEnd={pageEnd}
                        totalWords={allWords.length}
                        onWordClick={setSelectedWordIndex}
                        onToggleDelete={toggleDelete}
                        onPrevPage={handlePrevPage}
                        onNextPage={handleNextPage}
                    />

                    {/* Batch Record Button */}
                    <div className="wr-recording-section">
                        <button
                            className={`wr-record-btn ${isRecording ? 'recording' : ''}`}
                            onClick={handleBatchRecord}
                            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                        >
                            <div className="wr-record-btn-inner">
                                <svg className="wr-mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                                {isRecording && <div className="wr-recording-pulse"></div>}
                            </div>
                        </button>
                        <p className="wr-record-hint">
                            {isRecording ? 'Listening… press Space to stop' : 'Space to assess the full page'}
                        </p>
                    </div>
                </div>

                {/* Right: Detail Panel */}
                <div className="wr-right">
                    {selectedWord ? (
                        <WordDetail
                            word={selectedWord}
                            wordResult={selectedResult}
                            onRecordResult={handleSingleRecordResult}
                            onPrevWord={() => selectRelativeWord(-1)}
                            onNextWord={() => selectRelativeWord(1)}
                            hasPrev={selectedWordIndex > pageStart}
                            hasNext={selectedWordIndex !== null && selectedWordIndex < pageEnd - 1}
                            onClose={() => setSelectedWordIndex(null)}
                        />
                    ) : (
                        <div className="wr-welcome-state">
                            <div className="wr-welcome-icon">✨</div>
                            <h2 className="wr-welcome-title">Select a word to begin</h2>
                            <p className="wr-welcome-desc">
                                Choose a word from the left to start your focused pronunciation training.
                            </p>
                            <div className="wr-keyboard-hints">
                                <div className="wr-kbd-hint"><kbd>Space</kbd> Batch Read</div>
                                <div className="wr-kbd-hint"><kbd>←</kbd><kbd>→</kbd> Turn Page</div>
                                <div className="wr-kbd-hint"><kbd>↑</kbd><kbd>↓</kbd> Move Focus</div>
                                <div className="wr-kbd-hint"><kbd>Esc</kbd> Close Detail</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && <div className="wr-toast show">{toast}</div>}
        </div>
    );
};

export default WordReading;
