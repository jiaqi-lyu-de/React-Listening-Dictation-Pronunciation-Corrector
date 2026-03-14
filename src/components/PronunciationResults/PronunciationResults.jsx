import { useState } from 'react';
import useRecorder from '../../utils/useRecorder';
import './PronunciationResults.css';

const PronunciationResults = ({ pronunciationResult, title = "Pronunciation Assessment" }) => {
    // Single word practice state
    const { isRecording: isWordRecording, startRecording: startWordRec, stopRecording: stopWordRec } = useRecorder();
    const [recordingWordIndex, setRecordingWordIndex] = useState(null);
    const [wordPracticeResults, setWordPracticeResults] = useState({});
    const [processingWord, setProcessingWord] = useState(false);

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

        if (processingWord) return;

        if (recordingWordIndex === index && isWordRecording) {
            // Stop recording
            setProcessingWord(true);
            const audioBlob = await stopWordRec();
            setRecordingWordIndex(null);

            if (audioBlob) {
                await processWordAudio(audioBlob, word, index);
            }
            setProcessingWord(false);
        } else {
            // Start recording
            const success = await startWordRec();
            if (success) {
                setRecordingWordIndex(index);
            }
        }
    };

    const processWordAudio = async (audioBlob, referenceText, index) => {
        try {
            const formData = new FormData();
            const wavBlob = await convertToWav(audioBlob);
            formData.append('audio', wavBlob, 'word-practice.wav');
            formData.append('referenceText', referenceText);

            const response = await fetch('http://localhost:8888/pronunciation-assessment', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setWordPracticeResults(prev => ({
                    ...prev,
                    [index]: data.result
                }));
            }
        } catch (error) {
            console.error("Word assessment failed", error);
        }
    };

    const convertToWav = async (blob) => {
        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const wavBuffer = audioBufferToWav(audioBuffer);
                    resolve(new Blob([wavBuffer], { type: 'audio/wav' }));
                } catch (e) { reject(e); }
            };
            fileReader.readAsArrayBuffer(blob);
        });
    };

    const audioBufferToWav = (audioBuffer) => {
        const targetSampleRate = 16000;
        let audioData = audioBuffer.getChannelData(0);
        if (audioBuffer.numberOfChannels > 1) {
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < audioData.length; i++) audioData[i] = (audioData[i] + right[i]) / 2;
        }
        if (audioBuffer.sampleRate !== targetSampleRate) {
            const ratio = audioBuffer.sampleRate / targetSampleRate;
            const newLength = Math.round(audioData.length / ratio);
            const result = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
                const idx = Math.floor(i * ratio);
                result[i] = audioData[idx];
            }
            audioData = result;
        }

        const buffer = new ArrayBuffer(44 + audioData.length * 2);
        const view = new DataView(buffer);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + audioData.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true);
        view.setUint16(22, 1, true); view.setUint32(24, targetSampleRate, true);
        view.setUint32(28, targetSampleRate * 2, true); view.setUint16(32, 2, true);
        view.setUint16(34, 16, true); writeString(view, 36, 'data');
        view.setUint32(40, audioData.length * 2, true);

        let offset = 44;
        for (let i = 0; i < audioData.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
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
                                {/* Syllable level assessment */}
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

                                {/* Phoneme level assessment */}
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
