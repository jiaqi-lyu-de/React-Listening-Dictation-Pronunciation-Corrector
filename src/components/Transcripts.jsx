import React from 'react';

const Transcripts = ({ text, currentNumber, onSentenceClick }) => {
  if (!text || text.length === 0) {
    return <div className="transcripts-empty">No transcript available</div>;
  }

  return (
    <div className="transcripts-container">
      <h2 className="transcripts-title">Transcript</h2>
      <div className="transcripts-list">
        {text.map((transcript, index) => (
          <div
            key={index}
            className={`transcript-item ${index === currentNumber ? 'active' : ''}`}
            onClick={() => onSentenceClick && onSentenceClick(index)}
          >
            <span className="transcript-number">{index + 1}</span>
            <span className="transcript-text">{transcript.speech}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transcripts;