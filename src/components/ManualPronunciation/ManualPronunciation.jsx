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
    // Handle text selection and snap to word boundaries
    const handleSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            // Get selected text and ensure it's within our display area
            if (displayRef.current && displayRef.current.contains(selection.anchorNode)) {
                try {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;

                    // We only want to snap if we're dealing with text nodes
                    // If the user selected across different elements, we might skip snapping for simplicity
                    // but here it's mostly a single div with text.

                    // Expand start to the beginning of the word
                    let startNode = range.startContainer;
                    let startOffset = range.startOffset;

                    if (startNode.nodeType === Node.TEXT_NODE) {
                        while (startOffset > 0 && !/\s/.test(startNode.textContent.charAt(startOffset - 1))) {
                            startOffset--;
                        }
                        range.setStart(startNode, startOffset);
                    }

                    // Expand end to the end of the word
                    let endNode = range.endContainer;
                    let endOffset = range.endOffset;

                    if (endNode.nodeType === Node.TEXT_NODE) {
                        while (endOffset < endNode.textContent.length && !/\s/.test(endNode.textContent.charAt(endOffset))) {
                            endOffset++;
                        }
                        range.setEnd(endNode, endOffset);
                    }

                    // Avoid triggering another selectionchange if possible, 
                    // but browsers are usually smart enough or we'll just handle one extra call
                    selection.removeAllRanges();
                    selection.addRange(range);

                    setSelectedText(selection.toString().trim());
                } catch (e) {
                    // Fallback to basic selection if snapping fails
                    setSelectedText(selection.toString().trim());
                }
            }
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
