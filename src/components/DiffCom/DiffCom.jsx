import { useState, useEffect, useRef } from 'react';
import SpeechRecorder from '../SpeechRecorder/SpeechRecorder';
import PronunciationResults from '../PronunciationResults/PronunciationResults';
import './DiffCom.css';
import { diffWords } from 'diff';

const DiffCom = ({ text, number, onNext, onCheck, onReplayAudio }) => {
  const [userInput, setUserInput] = useState('');
  const [diff, setDiff] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [pronunciationError, setPronunciationError] = useState(null);
  const inputRef = useRef(null);

  // Clear input when sentence changes
  useEffect(() => {
    setUserInput('');
    setDiff([]);
    setAccuracy(null);
    setIsChecked(false);
    setPronunciationResult(null);
    setPronunciationError(null);
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

      {/* Render the diff directly as JSX */}
      {isChecked && <div className="diff-section">
        <h3 className="diff-title">Real-time Comparison</h3>
        <div className="diff-output">
          {diff.length > 0 ? (
            <div className="diff-split">
              <div className="diff-expected">
                <div className="diff-label">Expected (Original)</div>
                <div className="diff-text">
                  {diff.filter(p => !p.added).map((part, index) => (
                    <span key={`exp-${index}`} className={part.removed ? "diff-missing" : "diff-unchanged"}>
                      {part.value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="diff-actual">
                <div className="diff-label">Your Input</div>
                <div className="diff-text">
                  {diff.filter(p => !p.removed).map((part, index) => (
                    <span key={`act-${index}`} className={part.added ? "diff-error" : "diff-unchanged"}>
                      {part.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <span className="diff-placeholder">Start typing to see comparison...</span>
          )}
        </div>
      </div>}

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

      <PronunciationResults pronunciationResult={pronunciationResult} />

      <div className="keyboard-hints">
        <span className="hint"><kbd>Tab</kbd> Replay</span>
        <span className="hint"><kbd>Enter</kbd> Next</span>
        <span className="hint"><kbd>Cmd+Enter</kbd> Check</span>
        <span className="hint"><kbd>Cmd+B</kbd> save word</span>
        <span className="hint"><kbd>Double Click</kbd> read word</span>
        <span className="hint"><kbd>Right Click</kbd> replay word</span>
      </div>
    </div>
  );
};

export default DiffCom;