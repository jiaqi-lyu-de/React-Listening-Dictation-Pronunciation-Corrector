import { useState, useEffect, useRef } from 'react';
import SpeechRecorder from './SpeechRecorder';
import useRecorder from '../utils/useRecorder';
import { fetchAPI } from '../utils/fetch';
import { diffWords } from 'diff';

const DiffCom = ({ text, number, onNext, onCheck, onReplayAudio }) => {
  const [userInput, setUserInput] = useState('');
  const [diff, setDiff] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [pronunciationError, setPronunciationError] = useState(null);
  const inputRef = useRef(null);

  // Single word practice state
  const { isRecording: isWordRecording, startRecording: startWordRec, stopRecording: stopWordRec } = useRecorder();
  const [recordingWordIndex, setRecordingWordIndex] = useState(null);
  const [wordPracticeResults, setWordPracticeResults] = useState({});
  const [processingWord, setProcessingWord] = useState(false);

  // Clear input when sentence changes
  useEffect(() => {
    setUserInput('');
    setDiff([]);
    setAccuracy(null);
    setIsChecked(false);
    setPronunciationResult(null);
    setPronunciationError(null);
    setWordPracticeResults({});
    setRecordingWordIndex(null);
    // Auto-focus input on sentence change
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [number]);

  const handleChange = (event) => {
    const inputText = event.target.value;
    setUserInput(inputText);

    // Safety check for props - fix array access bug
    const originalText = text?.transcript?.[number]?.speech || "";
    const diffResult = diffWords(originalText, inputText, { ignoreCase: true });
    setDiff(diffResult);

    // Real-time accuracy calculation
    if (inputText.trim()) {
      const accuracy = calculateAccuracy(originalText, inputText);
      setAccuracy(accuracy);
    } else {
      setAccuracy(null);
    }
  };

  const calculateAccuracy = (original, input) => {
    const diffResult = diffWords(original.toLowerCase().trim(), input.toLowerCase().trim());
    let correctChars = 0;
    let totalChars = 0;

    diffResult.forEach(part => {
      if (!part.added && !part.removed) {
        correctChars += part.value.length;
      }
      if (!part.added) {
        totalChars += part.value.length;
      }
    });

    return totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;
  };

  const handlePronunciationResult = (result) => {
    setPronunciationResult(result);
    setPronunciationError(null);
  };

  const handlePronunciationError = (error) => {
    setPronunciationError(error);
    setPronunciationResult(null);
  };



  const saveToHistory = () => {
    const originalText = text?.transcript?.[number]?.speech || "";
    const finalAccuracy = calculateAccuracy(originalText, userInput);
    setAccuracy(finalAccuracy);
    // Save to diff history
    if (onCheck && userInput.trim()) {
      onCheck({
        sentenceNumber: number,
        originalText,
        userInput,
        diff,
        accuracy: finalAccuracy,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleKeyDown = (event) => {
    // Tab - Replay current sentence
    if (event.key === 'Tab') {
      event.preventDefault();
      // Audio replay will be handled by parent component
      if (onReplayAudio) {
        onReplayAudio();
      }
    }

    // Enter - Next sentence and auto-play
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      saveToHistory();
      if (onNext) {
        onNext();
        // Trigger auto-play for the next sentence
        setTimeout(() => {
          if (onReplayAudio) {
            onReplayAudio();
          }
        }, 100); // Small delay to let the sentence change
      }
    }

    // Ctrl/Cmd + Enter - Check/Submit input and save to history
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setIsChecked(true);
      // Calculate final accuracy
      // saveToHistory();
    }
  };

  const originalText = text?.transcript?.[number]?.speech || "";

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

  return (
    <div className="diff-container">
      <div className="input-section">
        <h3 className="input-title">Your Input</h3>
        <textarea
          ref={inputRef}
          className="input-field"
          placeholder="Type what you hear... (Tab: Replay | Enter: Next | Cmd+Enter: Check)"
          value={userInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        {accuracy !== null && (
          <div className={`accuracy-badge ${accuracy >= 90 ? 'high' : accuracy >= 70 ? 'medium' : 'low'}`}>
            Accuracy: {accuracy}%
          </div>
        )}
      </div>

      {isChecked && (
        <div className="original-text">
          <h3 className="original-title">Original Text</h3>
          <p className="original-content">{originalText}</p>
        </div>
      )}

      <SpeechRecorder
        referenceText={originalText}
        onAssessmentResult={handlePronunciationResult}
        onError={handlePronunciationError}
      />

      {pronunciationError && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {pronunciationError}
        </div>
      )}

      {pronunciationResult && (
        <div className="pronunciation-results">
          <h3 className="results-title">Pronunciation Assessment</h3>

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
      )}

      {/* Render the diff directly as JSX */}
      {isChecked && <div className="diff-section">
        <h3 className="diff-title">Real-time Comparison</h3>
        <div className="diff-output">
          {diff.length > 0 ? (
            diff.map((part, index) => {
              // Identify the class based on diff properties
              let className = "diff-unchanged";
              if (part.added) className = "diff-added";
              if (part.removed) className = "diff-removed";

              return (
                <span key={index} className={className}>
                  {part.value}
                </span>
              );
            })
          ) : (
            <span className="diff-placeholder">Start typing to see comparison...</span>
          )}
        </div>
      </div>}

      <div className="keyboard-hints">
        <span className="hint"><kbd>Tab</kbd> Replay</span>
        <span className="hint"><kbd>Enter</kbd> Next</span>
        <span className="hint"><kbd>Cmd+Enter</kbd> Check</span>
      </div>
    </div>
  );
};

export default DiffCom;