import { getIPA } from '../../utils/ipaMap';
import useAzureSpeech from '../../utils/useAzureSpeech';

const getScoreLevel = (score) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
};

const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success, #10b981)';
    if (score >= 60) return 'var(--warning, #f59e0b)';
    return 'var(--error, #ef4444)';
};

/**
 * WordDetail — Phoneme detail panel for a selected word.
 * Shows pronunciation practice (single word recording), phoneme chips,
 * definitions, examples, and idioms.
 */
const WordDetail = ({ word, wordResult, onRecordResult, onClose, onPrevWord, onNextWord, hasPrev, hasNext }) => {
    const { isRecording, assessPronunciation } = useAzureSpeech();

    if (!word) return null;

    const score = wordResult ? Math.round(wordResult.accuracy) : null;
    const formattedHw = (word.hw || word.word).replace(/·/g, '<span class="syllable-divider">·</span>');

    const handleRecord = async () => {
        const result = await assessPronunciation(word.word);
        if (result && onRecordResult) {
            // Convert to wordd-style result format
            const wordGroups = result.words.map(w => ({
                word: w.word,
                phonemes: w.phonemes
            }));
            onRecordResult({
                accuracy: result.pronunciationAssessment.accuracyScore,
                pronScore: result.pronunciationAssessment.accuracyScore,
                wordGroups
            });
        }
    };

    const handleSpeakWord = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="word-practice-panel">
            <div className="word-practice-header">
                <div>
                    <div className="word-practice-title-row">
                        <h5 className="word-practice-title" dangerouslySetInnerHTML={{ __html: formattedHw }} />
                        {score !== null && (
                            <span className={`word-practice-score ${score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low'}`}>
                                {score}%
                            </span>
                        )}
                    </div>
                    <p className="word-practice-status">{word.fl || ''}</p>
                </div>
                <div className="word-practice-actions">
                    <button type="button" className="word-practice-action-btn" onClick={handleSpeakWord}>
                        Listen
                    </button>
                    <button type="button" className="word-practice-action-btn" onClick={onPrevWord} disabled={!hasPrev}>
                        Previous
                    </button>
                    <button type="button" className="word-practice-action-btn" onClick={onNextWord} disabled={!hasNext}>
                        Next
                    </button>
                    <button type="button" className="word-practice-action-btn" onClick={onClose} aria-label="Close">
                        Close
                    </button>
                </div>
            </div>

            <div className="word-practice-body">
                {/* Pronunciation Practice Card */}
                <section className="word-practice-card">
                    <h6 className="word-practice-card-title">Pronunciation Practice</h6>
                    <div className="word-practice-recorder">
                        <button
                            type="button"
                            className={`word-practice-record-btn ${isRecording ? 'recording' : ''}`}
                            onClick={handleRecord}
                            disabled={isRecording && false} // Logic handled in handleRecord
                            aria-label="Record word"
                        >
                            <svg className="word-practice-mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                        <p className="word-practice-hint">
                            {isRecording ? `Recording: ${word.word}` : `Read the word: ${word.word}`}
                        </p>
                    </div>

                    {/* Phoneme Results */}
                    {wordResult && wordResult.wordGroups && (
                        <div className="word-practice-phoneme-results">
                            {wordResult.wordGroups.flatMap(group => group.phonemes).map((p, i) => {
                                const s = Math.round(p.accuracyScore);
                                const scoreClass = s >= 80 ? 'phoneme-high' : s >= 60 ? 'phoneme-medium' : 'phoneme-low';
                                return (
                                    <div
                                        key={i}
                                        className={`word-practice-phoneme-chip ${scoreClass}`}
                                    >
                                        <span>{getIPA(p.phoneme)}</span>
                                        <span className="word-practice-phoneme-score">{s}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Accuracy Bar */}
                    {wordResult && (
                        <div className="word-practice-accuracy-row">
                            <span className="word-practice-accuracy-label">Accuracy</span>
                            <div className="word-practice-accuracy-track">
                                <div
                                    className={`word-practice-accuracy-fill ${score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low'}`}
                                    style={{ width: `${wordResult.accuracy}%` }}
                                />
                            </div>
                            <span className={`word-practice-accuracy-value ${score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low'}`}>
                                {Math.round(wordResult.accuracy)}
                            </span>
                        </div>
                    )}
                </section>

                {/* Dictionary Card */}
                <section className="word-practice-card">
                    <h6 className="word-practice-card-title">Dictionary Information</h6>
                    <div className="wr-word-details-content">
                        {/* Definitions */}
                        <div className="wr-detail-section">
                            <h4 className="wr-detail-section-title">Definition</h4>
                            {word.shortdef && word.shortdef.length > 0 ? (
                                word.shortdef.map((d, i) => (
                                    <p key={i} className="wr-definition-item">{d}</p>
                                ))
                            ) : (
                                <p className="wr-no-data">No definition available</p>
                            )}
                        </div>

                        {/* Examples */}
                        {word.vis && word.vis.length > 0 && (
                            <div className="wr-detail-section">
                                <h4 className="wr-detail-section-title">Examples</h4>
                                <ul>
                                    {word.vis.map((v, i) => (
                                        <li key={i} className="wr-example-item">{v}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default WordDetail;
