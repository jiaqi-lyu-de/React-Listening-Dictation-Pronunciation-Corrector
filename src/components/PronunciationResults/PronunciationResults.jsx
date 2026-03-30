import { useState } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import './PronunciationResults.css';

const PronunciationResults = ({ pronunciationResult, title = "Pronunciation Assessment" }) => {
    // Single word practice using Azure Speech SDK directly
    const { isRecording: isWordRecording, isProcessing: processingWord, assessPronunciation } = useAzureSpeech();
    const [recordingWordIndex, setRecordingWordIndex] = useState(null);
    const [wordPracticeResults, setWordPracticeResults] = useState({});

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

    const speakWord = (word) => {
        if (!word) return;
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const handleWordRightClick = async (e, word, index) => {
        e.preventDefault();
        if (processingWord || isWordRecording) return;

        setRecordingWordIndex(index);
        const result = await assessPronunciation(word);
        setRecordingWordIndex(null);

        if (result) {
            setWordPracticeResults(prev => ({
                ...prev,
                [index]: result
            }));
        }
    };

    const [savedWords, setSavedWords] = useState(new Set());
    const handleSaveToVocabulary = async (wordStr) => {
        try {
            await fetch('http://localhost:8888/save-words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: [wordStr] })
            });
            setSavedWords(prev => new Set(prev).add(wordStr));
        } catch (e) {
            console.error('Failed to save to vocab', e);
        }
    };

    if (!pronunciationResult) return null;

    const allWords = pronunciationResult.words || [];
    const problemWords = allWords.filter(w => w.errorType !== 'None' || w.accuracyScore < 80);

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
                    <div className="word-list">
                        {problemWords.map((word) => {
                            const index = allWords.indexOf(word);
                            return (
                                <div key={index} className="word-details">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <span
                                            className={`word-item ${getWordClass(word.errorType, word.accuracyScore)} ${recordingWordIndex === index ? 'recording-word' : ''}`}
                                            title={`Accuracy: ${Math.round(word.accuracyScore)}% (Right-click to practice)`}
                                            onDoubleClick={() => speakWord(word.word)}
                                            onContextMenu={(e) => handleWordRightClick(e, word.word, index)}
                                        >
                                            {word.word}
                                            {word.errorType !== 'None' && (
                                                <span className="error-badge">{word.errorType}</span>
                                            )}
                                        </span>
                                        <button 
                                            className={`mini-action-btn ${savedWords.has(word.word) ? 'saved' : ''}`}
                                            onClick={() => handleSaveToVocabulary(word.word)}
                                            disabled={savedWords.has(word.word)}
                                            title="Save to Vocabulary"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        </button>
                                    </div>

                                    <div className="phonetic-container">
                                        {word.syllables && word.syllables.length > 0 && (
                                            <div className="syllable-list">
                                                {word.syllables.map((syl, sIdx) => (
                                                    <div key={sIdx} className="syllable-group">
                                                        <span
                                                            className={`syllable-item ${getPhonemeClass(syl.accuracyScore)}`}
                                                            title={`Syllable Accuracy: ${Math.round(syl.accuracyScore)}%`}
                                                        >
                                                            {syl.syllable}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {word.phonemes && word.phonemes.length > 0 && (
                                            <div className="phoneme-list">
                                                {word.phonemes.map((ph, pIdx) => (
                                                    <span
                                                        key={pIdx}
                                                        className={`phoneme-item ${getPhonemeClass(ph.accuracyScore)}`}
                                                        title={`Phoneme Accuracy: ${Math.round(ph.accuracyScore)}%`}
                                                    >
                                                        {ph.phoneme}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Single word practice result display */}
                                    {wordPracticeResults[index] && (
                                        <div className="practice-result-mini">
                                            <span className={`mini-score ${getScoreClass(wordPracticeResults[index].pronunciationAssessment.accuracyScore)}`}>
                                                {Math.round(wordPracticeResults[index].pronunciationAssessment.accuracyScore)}%
                                            </span>
                                            {wordPracticeResults[index].words[0]?.phonemes?.map((ph, idx) => (
                                                <span key={idx} className={`mini-phoneme ${getPhonemeClass(ph.accuracyScore)}`}>
                                                    {ph.phoneme}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
