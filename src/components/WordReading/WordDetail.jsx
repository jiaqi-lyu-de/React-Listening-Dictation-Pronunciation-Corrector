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
        <div className="wr-detail-panel">
            <div className="wr-detail-header">
                <div className="wr-detail-word-container">
                    <span className="wr-detail-word" dangerouslySetInnerHTML={{ __html: formattedHw }} />
                    <span className="wr-detail-fl">{word.fl || ''}</span>
                </div>
                {score !== null && (
                    <div className="wr-detail-score" style={{ color: getScoreColor(score) }}>
                        {score}
                    </div>
                )}
                <button className="wr-detail-close" onClick={onClose} aria-label="Close">×</button>
            </div>

            <div className="wr-detail-actions">
                <button className="wr-detail-action-btn" onClick={handleSpeakWord}>
                    Listen Word
                </button>
                <button className="wr-detail-action-btn" onClick={onPrevWord} disabled={!hasPrev}>
                    Previous
                </button>
                <button className="wr-detail-action-btn" onClick={onNextWord} disabled={!hasNext}>
                    Next
                </button>
            </div>

            <div className="wr-detail-dashboard">
                {/* Pronunciation Practice Card */}
                <section className="wr-dashboard-card">
                    <h3 className="wr-card-title">Pronunciation Practice</h3>
                    <div className="wr-detail-record-container">
                        <button
                            className={`wr-record-btn wr-record-btn-single ${isRecording ? 'recording' : ''}`}
                            onClick={handleRecord}
                            aria-label="Record word"
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
                        <p className="wr-record-hint-single">
                            {isRecording ? `Recording: ${word.word}` : `Read the word: ${word.word}`}
                        </p>

                        {/* Phoneme Results */}
                        {wordResult && wordResult.wordGroups && (
                            <div className="wr-phoneme-results">
                                {wordResult.wordGroups.map((group, gIdx) => (
                                    <div key={gIdx} className="wr-phoneme-word-group">
                                        <div className="wr-phoneme-word-label">{group.word}</div>
                                        <div className="wr-phoneme-chips-container">
                                            {group.phonemes.map((p, i) => {
                                                const s = Math.round(p.accuracyScore);
                                                const level = getScoreLevel(s);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`wr-phoneme-chip ${level}`}
                                                        style={{ animation: `fadeInUp 0.2s ${gIdx * 100 + i * 40}ms both` }}
                                                    >
                                                        <span>{getIPA(p.phoneme)}</span>
                                                        <span className="wr-phoneme-score">{s}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Accuracy Bar */}
                        {wordResult && (
                            <div className="wr-detail-scores">
                                <div className="wr-detail-row">
                                    <span className="wr-detail-label">Accuracy</span>
                                    <div className="wr-detail-bar-track">
                                        <div
                                            className={`wr-detail-bar-fill ${getScoreLevel(wordResult.accuracy)}`}
                                            style={{ width: `${wordResult.accuracy}%` }}
                                        />
                                    </div>
                                    <span className="wr-detail-value" style={{ color: getScoreColor(wordResult.accuracy) }}>
                                        {Math.round(wordResult.accuracy)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Dictionary Card */}
                <section className="wr-dashboard-card">
                    <h3 className="wr-card-title">Dictionary Information</h3>
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

                        {/* Idioms */}
                        {word.idioms && word.idioms.length > 0 && (
                            <div className="wr-detail-section">
                                <h4 className="wr-detail-section-title">Idioms</h4>
                                <ul>
                                    {word.idioms.map((idiom, i) => {
                                        const formattedIdiomHw = idiom.hw.replace(/·/g, '·');
                                        return (
                                            <li key={i} className="wr-idiom-item">
                                                <span className="wr-idiom-hw">{formattedIdiomHw}</span>: {' '}
                                                <span className="wr-idiom-def">{idiom.shortdef.join('; ')}</span>
                                            </li>
                                        );
                                    })}
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
