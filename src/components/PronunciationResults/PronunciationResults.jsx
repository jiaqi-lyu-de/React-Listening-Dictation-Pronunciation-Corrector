import { useEffect, useMemo, useRef, useState } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import { getIPA } from '../../utils/ipaMap';
import './PronunciationResults.css';

const PronunciationResults = ({ pronunciationResult, title = "Pronunciation Assessment" }) => {
    const { isRecording: isWordRecording, isProcessing: processingWord, startContinuousAssessment, stopContinuousAssessment } = useAzureSpeech();
    const [recordingWordIndex, setRecordingWordIndex] = useState(null);
    const [wordPracticeResults, setWordPracticeResults] = useState({});
    const [selectedProblemWordIndex, setSelectedProblemWordIndex] = useState(null);
    const attemptedProblemWordsRef = useRef(new Set());

    const getScoreClass = (score) => {
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-medium';
        return 'score-low';
    };

    const getPhonemeClass = (score) => {
        if (score >= 80) return 'phoneme-high';
        if (score >= 60) return 'phoneme-medium';
        return 'phoneme-low';
    };

    const getWordClass = (errorType, accuracyScore) => {
        if (errorType === 'None' && accuracyScore >= 80) return 'word-correct';
        if (errorType === 'Omission') return 'word-omission';
        if (errorType === 'Insertion') return 'word-insertion';
        if (errorType === 'Mispronunciation' || accuracyScore < 60) return 'word-error';
        return 'word-warning';
    };

    const getWordStatusLabel = (word) => {
        if (!word) return 'Needs work';
        if (word.errorType === 'Omission') return 'Omitted in reading';
        if (word.errorType === 'Insertion') return 'Unexpected insertion';
        if (word.errorType === 'Mispronunciation') return 'Mispronounced';
        if (word.accuracyScore < 60) return 'Low accuracy';
        return 'Needs polish';
    };

    const speakWord = (word) => {
        if (!word) return;
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const runWordAssessment = async (word, index) => {
        if (processingWord) return;

        if (isWordRecording) {
            if (recordingWordIndex === index) {
                // Manually stop the recording
                const result = await stopContinuousAssessment();
                setRecordingWordIndex(null);
                
                if (result && result.words && result.words.length > 0) {
                    setWordPracticeResults(prev => ({
                        ...prev,
                        [index]: result
                    }));
                }
            } else {
                // If recording another word, ignore or could stop it
                return;
            }
        } else {
            // Start recording
            setRecordingWordIndex(index);
            startContinuousAssessment(word);
        }
    };

    const handleWordRightClick = async (e, word, index) => {
        e.preventDefault();
        await runWordAssessment(word, index);
    };
    const selectProblemWord = (index, wordText) => {
        setSelectedProblemWordIndex(index);
        speakWord(wordText);
    };

    const allWords = useMemo(() => pronunciationResult?.words || [], [pronunciationResult]);
    const problemWordIndices = useMemo(
        () => allWords.reduce((indices, word, index) => {
            if (word.errorType !== 'None' || word.accuracyScore < 80) {
                indices.push(index);
            }
            return indices;
        }, []),
        [allWords]
    );
    const problemWords = problemWordIndices.map(index => ({ ...allWords[index], sourceIndex: index }));
    const selectedProblemWord = selectedProblemWordIndex !== null ? allWords[selectedProblemWordIndex] : null;
    const selectedPracticeResult = selectedProblemWordIndex !== null ? wordPracticeResults[selectedProblemWordIndex] : null;
    const selectedProblemPosition = selectedProblemWordIndex !== null ? problemWordIndices.indexOf(selectedProblemWordIndex) : -1;
    const hasPrevProblemWord = selectedProblemPosition > 0;
    const hasNextProblemWord = selectedProblemPosition >= 0 && selectedProblemPosition < problemWordIndices.length - 1;

    // Auto-save "Needs Improvement" words once per day (per unique word).
    useEffect(() => {
        if (!pronunciationResult) return;
        if (!problemWordIndices || problemWordIndices.length === 0) return;

        const dateStr = new Date().toISOString().split('T')[0];

        // Deduplicate per word (case-insensitive) within this assessment.
        const uniqueProblemWords = new Map();
        problemWordIndices.forEach((idx) => {
            const w = allWords[idx];
            if (!w?.word) return;
            const key = w.word.toLowerCase().trim();
            if (!key) return;
            if (!uniqueProblemWords.has(key)) uniqueProblemWords.set(key, w);
        });

        uniqueProblemWords.forEach((w, key) => {
            const attemptKey = `${dateStr}|${key}`;
            if (attemptedProblemWordsRef.current.has(attemptKey)) return;
            attemptedProblemWordsRef.current.add(attemptKey);

            fetch('http://localhost:8888/record-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: w.word,
                    score: w.accuracyScore,
                    phonemes: w.phonemes?.map(p => ({
                        phoneme: p.phoneme,
                        accuracyScore: p.accuracyScore
                    })) || []
                })
            }).catch((e) => {
                console.error('Failed to record attempt:', e);
            });
        });
    }, [pronunciationResult, problemWordIndices, allWords]);

    useEffect(() => {
        if (problemWordIndices.length === 0) {
            setSelectedProblemWordIndex(null);
            return;
        }

        if (!problemWordIndices.includes(selectedProblemWordIndex)) {
            setSelectedProblemWordIndex(problemWordIndices[0]);
        }
    }, [problemWordIndices, selectedProblemWordIndex]);

    const handleSelectAdjacentProblemWord = (direction) => {
        if (selectedProblemPosition < 0) return;
        const nextPosition = selectedProblemPosition + direction;
        if (nextPosition < 0 || nextPosition >= problemWordIndices.length) return;
        setSelectedProblemWordIndex(problemWordIndices[nextPosition]);
    };

    if (!pronunciationResult) return null;

    return (
        <div className="pronunciation-results">
            <h3 className="results-title">{title}</h3>

            <div className="score-grid">
                <div className="score-item">
                    <span className="score-label">Accuracy</span>
                    <span className={`score-value ${getScoreClass(pronunciationResult.pronunciationAssessment.accuracyScore)}`}>
                        {Math.round(pronunciationResult.pronunciationAssessment.accuracyScore)}%
                    </span>
                </div>
                <div className="score-item">
                    <span className="score-label">Fluency</span>
                    <span className={`score-value ${getScoreClass(pronunciationResult.pronunciationAssessment.fluencyScore)}`}>
                        {Math.round(pronunciationResult.pronunciationAssessment.fluencyScore)}%
                    </span>
                </div>
                <div className="score-item">
                    <span className="score-label">Completeness</span>
                    <span className={`score-value ${getScoreClass(pronunciationResult.pronunciationAssessment.completenessScore)}`}>
                        {Math.round(pronunciationResult.pronunciationAssessment.completenessScore)}%
                    </span>
                </div>
                <div className="score-item">
                    <span className="score-label">Overall</span>
                    <span className={`score-value ${getScoreClass(pronunciationResult.pronunciationAssessment.pronunciationScore)}`}>
                        {Math.round(pronunciationResult.pronunciationAssessment.pronunciationScore)}%
                    </span>
                </div>
            </div>

            <div className="word-assessment">
                <h4 className="word-title">Reading Playback (Click to hear, Right-click to verify)</h4>
                <div className="text-playback-area">
                    {allWords.map((word, index) => (
                        <span
                            key={index}
                            className={`text-word ${getWordClass(word.errorType, word.accuracyScore)} ${recordingWordIndex === index ? 'recording-word' : ''}`}
                            title={`Accuracy: ${Math.round(word.accuracyScore)}% | Error: ${word.errorType}`}
                            onClick={() => speakWord(word.word)}
                            onContextMenu={(e) => handleWordRightClick(e, word.word, index)}
                        >
                            {word.word}{" "}
                        </span>
                    ))}
                </div>
            </div>

            <div className="word-assessment">
                <h4 className="word-title">Needs Improvement ({problemWords.length})</h4>
                {problemWords.length === 0 ? (
                    <div className="perfect-message">
                        ✨ Great job! Your pronunciation is very clear with no significant errors.
                    </div>
                ) : (
                    <div className="needs-improvement-layout">
                        <div className="word-list word-list-sidebar">
                            {problemWords.map((word) => {
                                const index = word.sourceIndex;
                                const practiceResult = wordPracticeResults[index];
                                const currentAccuracy = practiceResult
                                    ? practiceResult.pronunciationAssessment.accuracyScore
                                    : word.accuracyScore;
                                const currentErrorType = practiceResult?.words?.[0]?.errorType || word.errorType;

                                return (
                                    <div
                                        key={index}
                                        className={`word-details word-details-button ${selectedProblemWordIndex === index ? 'active' : ''}`}
                                        onClick={() => selectProblemWord(index, word.word)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                selectProblemWord(index, word.word);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="word-details-top">
                                            <span
                                                className={`word-item ${getWordClass(currentErrorType, currentAccuracy)} ${recordingWordIndex === index ? 'recording-word' : ''}`}
                                                title={`Accuracy: ${Math.round(currentAccuracy)}%`}
                                            >
                                                {word.word}
                                            </span>
                                            <span className={`word-details-accuracy-badge ${getScoreClass(currentAccuracy)}`}>
                                                {Math.round(currentAccuracy)}
                                            </span>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                        {selectedProblemWord && (
                            <div className="word-practice-panel">
                                <div className="word-practice-header">
                                    <div>
                                        <p className="word-practice-kicker">Focused practice</p>
                                        <div className="word-practice-title-row">
                                            <h5 className="word-practice-title">{selectedProblemWord.word}</h5>
                                            <span className={`word-practice-score ${getScoreClass(selectedProblemWord.accuracyScore)}`}>
                                                {Math.round(selectedProblemWord.accuracyScore)}%
                                            </span>
                                        </div>
                                        <p className="word-practice-status">{getWordStatusLabel(selectedProblemWord)}</p>
                                    </div>
                                    <div className="word-practice-actions">
                                        <button type="button" className="word-practice-action-btn" onClick={() => speakWord(selectedProblemWord.word)}>
                                            Listen
                                        </button>
                                        <button type="button" className="word-practice-action-btn" onClick={() => handleSelectAdjacentProblemWord(-1)} disabled={!hasPrevProblemWord}>
                                            Previous
                                        </button>
                                        <button type="button" className="word-practice-action-btn" onClick={() => handleSelectAdjacentProblemWord(1)} disabled={!hasNextProblemWord}>
                                            Next
                                        </button>
                                    </div>
                                </div>

                                <div className="word-practice-body">
                                    <section className="word-practice-card">
                                        <h6 className="word-practice-card-title">Pronunciation Practice</h6>
                                        <div className="word-practice-recorder">
                                            <button
                                                type="button"
                                                className={`word-practice-record-btn ${recordingWordIndex === selectedProblemWordIndex ? 'recording' : ''}`}
                                                onClick={() => runWordAssessment(selectedProblemWord.word, selectedProblemWordIndex)}
                                                disabled={processingWord}
                                                aria-label={`Record ${selectedProblemWord.word}`}
                                            >
                                                <svg className="word-practice-mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                    <line x1="12" y1="19" x2="12" y2="23" />
                                                    <line x1="8" y1="23" x2="16" y2="23" />
                                                </svg>
                                            </button>
                                            <p className="word-practice-hint">
                                                {recordingWordIndex === selectedProblemWordIndex ? `Recording: ${selectedProblemWord.word}` : `Read the word: ${selectedProblemWord.word}`}
                                            </p>
                                        </div>

                                        {selectedPracticeResult?.words?.[0]?.phonemes?.length > 0 && (
                                            <div className="word-practice-phoneme-results">
                                                {selectedPracticeResult.words[0].phonemes.map((phoneme, index) => (
                                                    <div
                                                        key={`${phoneme.phoneme}-${index}`}
                                                        className={`word-practice-phoneme-chip ${getPhonemeClass(phoneme.accuracyScore)}`}
                                                    >
                                                        <span>{getIPA(phoneme.phoneme)}</span>
                                                        <span className="word-practice-phoneme-score">
                                                            {Math.round(phoneme.accuracyScore)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {selectedPracticeResult && (
                                            <div className="word-practice-accuracy-row">
                                                <span className="word-practice-accuracy-label">Accuracy</span>
                                                <div className="word-practice-accuracy-track">
                                                    <div
                                                        className={`word-practice-accuracy-fill ${getScoreClass(selectedPracticeResult.pronunciationAssessment.accuracyScore)}`}
                                                        style={{ width: `${selectedPracticeResult.pronunciationAssessment.accuracyScore}%` }}
                                                    />
                                                </div>
                                                <span className={`word-practice-accuracy-value ${getScoreClass(selectedPracticeResult.pronunciationAssessment.accuracyScore)}`}>
                                                    {Math.round(selectedPracticeResult.pronunciationAssessment.accuracyScore)}
                                                </span>
                                            </div>
                                        )}
                                    </section>

                                    <section className="word-practice-card">
                                        <h6 className="word-practice-card-title">Reading Breakdown</h6>
                                        <div className="word-practice-summary-grid">
                                            <div className="word-practice-summary-item">
                                                <span className="word-practice-summary-label">Issue</span>
                                                <strong>{getWordStatusLabel(selectedProblemWord)}</strong>
                                            </div>
                                            <div className="word-practice-summary-item">
                                                <span className="word-practice-summary-label">Syllables</span>
                                                <strong>{selectedProblemWord.syllables?.length || 0}</strong>
                                            </div>
                                            <div className="word-practice-summary-item">
                                                <span className="word-practice-summary-label">Phonemes</span>
                                                <strong>{selectedProblemWord.phonemes?.length || 0}</strong>
                                            </div>
                                        </div>

                                        {selectedProblemWord.syllables?.length > 0 && (
                                            <div className="word-practice-reference-block">
                                                <span className="word-practice-reference-label">Syllable map</span>
                                                <div className="syllable-list">
                                                    {selectedProblemWord.syllables.map((syllable, index) => (
                                                        <span key={`${syllable.syllable}-${index}`} className={`syllable-item ${getPhonemeClass(syllable.accuracyScore)}`}>
                                                            {syllable.syllable}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedProblemWord.phonemes?.length > 0 && (
                                            <div className="word-practice-reference-block">
                                                <span className="word-practice-reference-label">Reference phonemes</span>
                                                <div className="phoneme-list word-practice-reference-phonemes">
                                                    {selectedProblemWord.phonemes.map((phoneme, index) => (
                                                        <span
                                                            key={`${phoneme.phoneme}-${index}`}
                                                            className={`phoneme-item ${getPhonemeClass(phoneme.accuracyScore)}`}
                                                        >
                                                            {getIPA(phoneme.phoneme)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <p className="word-practice-note">
                                            Click a word on the left to switch focus. Use Listen for the reference sound, then record again here for targeted correction.
                                        </p>
                                    </section>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="recognized-text">
                <h4 className="recognized-title">What you said (Raw String):</h4>
                <p className="recognized-content">{pronunciationResult.recognizedText || "None"}</p>
            </div>
        </div>
    );
};

export default PronunciationResults;
