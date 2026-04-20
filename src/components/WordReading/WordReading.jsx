import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchAPI } from '../../utils/fetch';
import PronunciationResults from '../PronunciationResults/PronunciationResults';
import '../PronunciationResults/PronunciationResults.css';
import '../HistorySelector/HistorySelector.css';
import './WordReading.css';

const HISTORY_SOURCES = [
    { key: 'Dictation', label: 'Dictation' },
    { key: 'Sentence Reading', label: 'Sentence Reading' }
];

const WordReading = ({
    dictationHistoryWords = [],
    sentenceHistoryWords = []
}) => {
    const cleanWord = (w) => (w || '').replace(/[.,!?;:()""''，。！？、]/g, '').trim();
    const normalize = (w) => cleanWord(w).toLowerCase();

    const [allWords, setAllWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [historySource, setHistorySource] = useState('Dictation');
    const [historySelections, setHistorySelections] = useState({});
    const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
    const historyMenuRef = useRef(null);

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

    useEffect(() => {
        const loadWords = async () => {
            setLoading(true);
            setLoadError('');

            try {
                const data = await fetchAPI('words', 'GET');
                setAllWords(data.words || []);
            } catch (error) {
                console.error('Failed to load words:', error);
                setLoadError('Failed to load the shared word pool.');
            } finally {
                setLoading(false);
            }
        };

        loadWords();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (historyMenuRef.current && !historyMenuRef.current.contains(event.target)) {
                setHistoryMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                const hasSelection = currentSelection && groups.some((group) => group.id === currentSelection);
                if (!hasSelection) {
                    next[key] = groups[0].id;
                }
            });

            return next;
        });
    }, [groupedHistoryBySource]);

    const activeHistoryGroups = groupedHistoryBySource[historySource] || [];
    const selectedHistoryDate = historySelections[historySource] || null;
    const selectedHistoryGroup =
        activeHistoryGroups.find((group) => group.id === selectedHistoryDate) ||
        activeHistoryGroups[0] ||
        null;

    const handleSelectHistoryDate = useCallback((dateKey) => {
        setHistorySelections((prev) => ({
            ...prev,
            [historySource]: dateKey
        }));
        setHistoryMenuOpen(false);
    }, [historySource]);

    const dictionaryByWord = useMemo(() => {
        const entries = new Map();

        allWords.forEach((entry) => {
            const key = normalize(entry.word);
            if (!key || entries.has(key)) return;
            entries.set(key, entry);
        });

        return entries;
    }, [allWords]);

    const historyPronunciationResult = useMemo(() => {
        const words = (selectedHistoryGroup?.words || []).map((entry) => ({
            word: entry.word,
            accuracyScore: entry.accuracy ?? 0,
            errorType: (entry.accuracy ?? 0) < 80 ? 'Mispronunciation' : 'None',
            phonemes: entry.phonemes || [],
            ...(dictionaryByWord.get(normalize(entry.word)) || {})
        }));

        return {
            pronunciationAssessment: {
                accuracyScore: 0,
                fluencyScore: 0,
                completenessScore: 0,
                pronunciationScore: 0
            },
            words
        };
    }, [selectedHistoryGroup, dictionaryByWord]);

    const historySummary = useMemo(() => {
        if (!selectedHistoryGroup) return null;

        const count = selectedHistoryGroup.words.length;
        const average = count > 0
            ? Math.round(
                selectedHistoryGroup.words.reduce((sum, entry) => sum + (entry.accuracy ?? 0), 0) / count
            )
            : 0;

        return { count, average };
    }, [selectedHistoryGroup]);

    const formatHistoryDate = useCallback((dateKey) => {
        if (!dateKey) return 'Select date';

        const parsed = new Date(`${dateKey}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return dateKey;

        return parsed.toLocaleDateString('en-US', {
            month: 'short',
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
            <h4 className="word-title">History Word Pool</h4>

            <div className="wr-mode-control">
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
                        className="history-btn wr-history-btn ui-btn-secondary"
                        onClick={() => setHistoryMenuOpen((prev) => !prev)}
                    >
                        {selectedHistoryGroup ? `📜 ${formatHistoryDate(selectedHistoryGroup.dateKey)}` : '📭 No history yet'}
                    </button>

                    {historyMenuOpen && (
                        <div className="history-dropdown wr-history-dropdown">
                            {activeHistoryGroups.length === 0 ? (
                                <div className="history-empty">📭 No history found</div>
                            ) : (
                                <ul className="history-list">
                                    {activeHistoryGroups.map((group) => (
                                        <li key={group.id}>
                                            <button
                                                type="button"
                                                className="history-item-btn"
                                                onClick={() => handleSelectHistoryDate(group.id)}
                                            >
                                                <span className="history-name">{formatHistoryDate(group.dateKey)}</span>
                                                <span className="history-date">{group.words.length} words</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {loadError && (
                <div className="wr-status ui-feedback ui-feedback--error">
                    {loadError}
                </div>
            )}

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
                    No saved weak words for this source yet. Complete an assessment in Dictation or Sentence Reading first.
                </div>
            )}
        </div>
    );
};

export default WordReading;
