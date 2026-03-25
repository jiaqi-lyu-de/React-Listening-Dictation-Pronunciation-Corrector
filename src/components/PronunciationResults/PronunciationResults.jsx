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
                <h4 className="word-title">Word-level Pronunciation</h4>
                <div className="word-list">
                    {pronunciationResult.words.map((word, index) => (
                        <div key={index} className="word-details">
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
                    ))}
                </div>
            </div>

            <div className="recognized-text">
                <h4 className="recognized-title">What you said:</h4>
                <p className="recognized-content">{pronunciationResult.recognizedText}</p>
            </div>
        </div>
    );
};

export default PronunciationResults;
