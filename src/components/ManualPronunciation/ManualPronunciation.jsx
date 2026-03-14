import { useState, useRef, useEffect } from 'react';
import SpeechRecorder from '../SpeechRecorder/SpeechRecorder';
import PronunciationResults from '../PronunciationResults/PronunciationResults';
import './ManualPronunciation.css';

const ManualPronunciation = () => {
    const [inputText, setInputText] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [pronunciationResult, setPronunciationResult] = useState(null);
    const [pronunciationError, setPronunciationError] = useState(null);
    const displayRef = useRef(null);

    // Update display text when input text changes
    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    const handleApplyText = () => {
        setDisplayText(inputText);
        setPronunciationResult(null);
        setPronunciationError(null);
        setSelectedText('');
    };

    const clearText = () => {
        setInputText('');
        setDisplayText('');
        setPronunciationResult(null);
        setPronunciationError(null);
        setSelectedText('');
    };

    // Handle text selection
    const handleSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            // Get selected text and ensure it's within our display area
            if (displayRef.current && displayRef.current.contains(selection.anchorNode)) {
                setSelectedText(selection.toString().trim());
            }
        } else {
            // Only clear if they click without selecting
            //  setSelectedText(''); 
        }
    };

    // Add event listeners for selection changes
    useEffect(() => {
        document.addEventListener('selectionchange', handleSelection);
        return () => {
            document.removeEventListener('selectionchange', handleSelection);
        };
    }, []);

    const handlePronunciationResult = (result) => {
        setPronunciationResult(result);
        setPronunciationError(null);
    };

    const handlePronunciationError = (error) => {
        setPronunciationError(error);
        setPronunciationResult(null);
    };

    return (
        <div className="manual-pronunciation-container">
            <div className="input-section">
                <h3 className="section-title">Enter Text to Practice</h3>
                <textarea
                    className="text-input"
                    placeholder="Type or paste the text you want to practice reading aloud..."
                    value={inputText}
                    onChange={handleInputChange}
                    rows={4}
                />
                <div className="button-group">
                    <button className="btn-apply" onClick={handleApplyText} disabled={!inputText.trim()}>
                        Apply Text
                    </button>
                    <button className="btn-clear" onClick={clearText} disabled={!inputText && !displayText}>
                        Clear
                    </button>
                </div>
            </div>

            {displayText && (
                <div className="practice-section">
                    <h3 className="section-title">Highlight Text to Assess</h3>
                    <p className="instruction-text">
                        Use your mouse to highlight the specific word or phrase you want to practice in the box below.
                    </p>
                    <div
                        className="text-display-area"
                        ref={displayRef}
                        onMouseUp={handleSelection} // Fallback for some browsers
                    >
                        {displayText}
                    </div>

                    <div className="selection-info">
                        <span className="selection-label">Currently selected: </span>
                        {selectedText ? (
                            <span className="selected-phrase">"{selectedText}"</span>
                        ) : (
                            <span className="no-selection">None (Please highlight text above)</span>
                        )}
                    </div>

                    <div className="recorder-section">
                        <SpeechRecorder
                            referenceText={selectedText || displayText} // fallback to full text
                            onAssessmentResult={handlePronunciationResult}
                            onError={handlePronunciationError}
                        />
                        <p className="recorder-hint">
                            {selectedText ? "Will assess the highlighted text." : "Will assess the entire text."}
                        </p>
                    </div>
                </div>
            )}

            {pronunciationError && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {pronunciationError}
                </div>
            )}

            <PronunciationResults
                pronunciationResult={pronunciationResult}
                title={`Pronunciation Assessment (${selectedText ? "Selection" : "Full Text"})`}
            />
        </div>
    );
};

export default ManualPronunciation;
