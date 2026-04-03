import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import { fetchAPI } from '../../utils/fetch';
import PronunciationResults from '../PronunciationResults/PronunciationResults';
import '../PronunciationResults/PronunciationResults.css';
import '../HistorySelector/HistorySelector.css';
import './WordReading.css';

const PAGE_SIZE = 30;
const HISTORY_SOURCES = [
    { key: 'Dictation', label: '听力部分' },
    { key: 'Sentence Reading', label: '句子阅读' }
];
const normalizeWord = (value = '') => value.toLowerCase().replace(/[^a-z]/g, '');

/**
 * WordReading — Main container for the Word Reading module.
 * Migrated from wordd project. Uses useAzureSpeech for all speech interactions.
 */
const WordReading = ({
    dictationHistoryWords = [],
    sentenceHistoryWords = []
}) => {
    const [allWords, setAllWords] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [wordResults, setWordResults] = useState(new Map());
    const [pendingDeletions, setPendingDeletions] = useState(new Set());
    const [selectedWordIndex, setSelectedWordIndex] = useState(null);
    const [toast, setToast] = useState('');
    const [loading, setLoading] = useState(true);
    const [historySource, setHistorySource] = useState('Dictation');
    const [historySelections, setHistorySelections] = useState({});
    const [historyMenuOpen, setHistoryMenuOpen] = useState(false);

    const segmentsRef = useRef([]);
    const historyMenuRef = useRef(null);
    const { isRecording, startContinuousAssessment, stopContinuousAssessment } = useAzureSpeech();
    const formatTimestamp = useCallback((value) => {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }, []);

    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(''), 2500);
    }, []);

    // Load words from backend storage
    useEffect(() => {
        const loadWords = async () => {
            try {
                const data = await fetchAPI('words', 'GET');
                setAllWords(data.words || []);
            } catch (err) {
                console.error('Failed to load words:', err);
                showToast('Failed to load word list');
            } finally {
                setLoading(false);
            }
        };
        loadWords();
    }, [showToast]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (historyMenuRef.current && !historyMenuRef.current.contains(event.target)) {
                setHistoryMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Derived values
    const totalPages = Math.max(1, Math.ceil(allWords.length / PAGE_SIZE));
    const pageStart = currentPage * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, allWords.length);
    const pageWords = allWords.slice(pageStart, pageEnd);

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
            await fetchAPI('save-words-file', 'POST', { body: updatedWords });
            showToast(`Permanently deleted ${deletedCount} words`);
        } catch (e) {
            console.error('Save error:', e);
        }

        return deletedCount;
    }, [allWords, wordResults, pendingDeletions, showToast]);

    // Record low score attempt
    const recordLowScore = useCallback(async (word, score, phonemes) => {
        try {
            await fetchAPI('record-attempt', 'POST', { body: { word, score, phonemes } });
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
        setSelectedWordIndex(null);
    }, [currentPage, persistDeletions]);

    const handleNextPage = useCallback(async () => {
        if (currentPage >= totalPages - 1) return;
        await persistDeletions();
        const newMax = Math.max(1, Math.ceil(allWords.length / PAGE_SIZE)) - 1;
        setCurrentPage(prev => Math.min(newMax, prev + 1));
        setWordResults(new Map());
        setSelectedWordIndex(null);
    }, [currentPage, totalPages, allWords.length, persistDeletions]);

    // Batch recording (Space key)
    const handleBatchRecord = useCallback(() => {
        if (isRecording) {
            // Stop
            stopContinuousAssessment(segmentsRef.current).then(overall => {
                if (overall) {
                    const recognizedWords = [...(overall.words || [])];
                    setWordResults(() => {
                        const next = new Map();

                        pageWords.forEach((pageWord, i) => {
                            const absIdx = pageStart + i;
                            if (pendingDeletions.has(absIdx)) return;

                            const target = normalizeWord(pageWord.word);
                            const matchIndex = recognizedWords.findIndex(
                                (recognizedWord) => normalizeWord(recognizedWord.word) === target
                            );

                            if (matchIndex < 0) return;

                            const match = recognizedWords.splice(matchIndex, 1)[0];
                            next.set(absIdx, {
                                accuracy: match.accuracyScore ?? 0,
                                pronScore: match.accuracyScore ?? 0,
                                wordGroups: [{
                                    word: match.word,
                                    phonemes: match.phonemes || []
                                }]
                            });

                            if ((match.accuracyScore ?? 0) <= 80) {
                                recordLowScore(match.word, match.accuracyScore ?? 0, match.phonemes || []);
                            }
                        });

                        return next;
                    });
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

    const historyWordsBySource = useMemo(() => ({
        Dictation: dictationHistoryWords,
        'Sentence Reading': sentenceHistoryWords
    }), [dictationHistoryWords, sentenceHistoryWords]);

    const groupedHistoryBySource = useMemo(() => {
        const buildGroups = (entries) => {
            const grouped = new Map();
            entries.forEach((entry) => {
                const timestamp = entry.timestamp || new Date().toISOString();
                const dateKey = timestamp.slice(0, 10);
                if (!grouped.has(dateKey)) {
                    grouped.set(dateKey, {
                        id: dateKey,
                        dateKey,
                        timestamp,
                        words: []
                    });
                }
                grouped.get(dateKey).words.push(entry);
            });

            return Array.from(grouped.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
        };

        return {
            Dictation: buildGroups(historyWordsBySource.Dictation || []),
            'Sentence Reading': buildGroups(historyWordsBySource['Sentence Reading'] || [])
        };
    }, [historyWordsBySource]);

    const activeHistoryGroups = groupedHistoryBySource[historySource] || [];
    const selectedHistoryDate = historySelections[historySource] || null;
    const selectedHistoryGroup = activeHistoryGroups.find(group => group.id === selectedHistoryDate) || activeHistoryGroups[0] || null;

    useEffect(() => {
        setHistorySelections((prev) => {
            const next = { ...prev };

            HISTORY_SOURCES.forEach(({ key }) => {
                const groups = groupedHistoryBySource[key] || [];
                if (groups.length === 0) {
                    delete next[key];
                    return;
                }

                const currentSelection = prev[key];
                const hasSelection = currentSelection && groups.some(group => group.id === currentSelection);
                if (!hasSelection) {
                    next[key] = groups[0].id;
                }
            });

            return next;
        });
    }, [groupedHistoryBySource]);

    const handleSelectHistoryDate = useCallback((dateKey) => {
        setHistorySelections((prev) => ({
            ...prev,
            [historySource]: dateKey
        }));
        setHistoryMenuOpen(false);
    }, [historySource]);

    const historyPronunciationResult = useMemo(() => {
        const words = (selectedHistoryGroup?.words || []).map(entry => {
            const dictionaryMatch = allWords.find(word => word.word?.toLowerCase() === entry.word?.toLowerCase());
            return {
                word: entry.word,
                accuracyScore: entry.accuracy ?? 0,
                errorType: (entry.accuracy ?? 0) < 80 ? 'Mispronunciation' : 'None',
                phonemes: entry.phonemes || [],
                ...dictionaryMatch // Include dictionary info
            };
        });

        return {
            pronunciationAssessment: {
                accuracyScore: 0,
                fluencyScore: 0,
                completenessScore: 0,
                pronunciationScore: 0
            },
            words
        };
    }, [selectedHistoryGroup, allWords]);

    const historySummary = useMemo(() => {
        if (!selectedHistoryGroup) return null;
        const count = selectedHistoryGroup.words.length;
        const average = count > 0
            ? Math.round(selectedHistoryGroup.words.reduce((sum, entry) => sum + (entry.accuracy ?? 0), 0) / count)
            : 0;
        return {
            count,
            average
        };
    }, [selectedHistoryGroup]);

    const formatHistoryDate = useCallback((dateKey) => {
        if (!dateKey) return '选择日期';
        const parsed = new Date(`${dateKey}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return dateKey;
        return parsed.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric'
        });
    }, []);

    if (loading) {
        return (
            <div className="word-assessment">
                <div className="wr-loading">Loading word list...</div>
            </div>
        );
    }

    return (
        <div className="word-assessment">
            <h4 className="word-title">{'History Word Pool'}</h4>

            <div className="wr-mode-control" style={{ marginBottom: '1rem' }}>
                <div className="wr-mode-tabs">
                    {HISTORY_SOURCES.map((source) => (
                        <button
                            key={source.key}
                            type="button"
                            className={`wr-mode-btn ${historySource === source.key ? 'active' : ''}`}
                            onClick={() => setHistorySource(source.key)}
                        >
                            {source.label}
                        </button>
                    ))}
                </div>

                <div className="wr-history-picker" ref={historyMenuRef}>
                    <button
                        type="button"
                        className="history-btn wr-history-btn"
                        onClick={() => setHistoryMenuOpen((prev) => !prev)}
                    >
                        {selectedHistoryGroup ? `📜 ${formatHistoryDate(selectedHistoryGroup.dateKey)}` : '📭 暂无历史'}
                    </button>

                    {historyMenuOpen && (
                        <div className="history-dropdown wr-history-dropdown">
                            {activeHistoryGroups.length === 0 ? (
                                <div className="history-empty">📭 No history found</div>
                            ) : (
                                <ul className="history-list">
                                    {activeHistoryGroups.map((group) => (
                                        <li key={group.id} onClick={() => handleSelectHistoryDate(group.id)}>
                                            <span className="history-name">{formatHistoryDate(group.dateKey)}</span>
                                            <span className="history-date">{group.words.length} words</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {historySummary && (
                <div className="wr-history-summary">
                    <div className="wr-history-chip">
                        <span className="wr-history-label">Date</span>
                        <strong>{formatHistoryDate(selectedHistoryGroup?.dateKey)}</strong>
                        <span className="wr-history-subtext">{formatTimestamp(selectedHistoryGroup?.timestamp)}</span>
                    </div>
                    <div className="wr-history-chip">
                        <span className="wr-history-label">Words</span>
                        <strong>{historySummary.count}</strong>
                        <span className="wr-history-subtext">{historySource}</span>
                    </div>
                    <div className="wr-history-chip">
                        <span className="wr-history-label">Average</span>
                        <strong>{historySummary.average}%</strong>
                        <span className="wr-history-subtext">Needs improvement pool</span>
                    </div>
                </div>
            )}

            {selectedHistoryGroup ? (
                <PronunciationResults
                    key={`${historySource}-${selectedHistoryGroup.id}`}
                    pronunciationResult={historyPronunciationResult}
                    isProblemOnly={true}
                    modeLabel={historySource}
                />
            ) : (
                <div className="wr-history-empty-state">
                    当前来源下还没有历史错误单词，先回到听力部分或句子阅读完成一次评测。
                </div>
            )}

            {/* Toast */}
            {toast && <div className="wr-toast show">{toast}</div>}
        </div>
    );
};


export default WordReading;
