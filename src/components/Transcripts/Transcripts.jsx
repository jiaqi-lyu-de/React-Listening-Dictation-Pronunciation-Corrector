import React, { useEffect, useRef } from 'react';
import './Transcripts.css';

const Transcripts = ({ text, currentNumber, onSentenceClick, unlockedSentenceNumbers = new Set() }) => {
  const activeSentenceRef = useRef(null);

  useEffect(() => {
    if (activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentNumber]);

  if (!text || text.length === 0) {
    return <div className="transcripts-empty">No transcript available</div>;
  }

  return (
    <div className="transcripts-container">
      <div className="transcripts-header">
        <div>
          <h2 className="transcripts-title">Transcript</h2>
          <p className="transcripts-subtitle">点击任一句跳转，当前句会自动跟随音频定位。</p>
        </div>
        <div className="transcripts-meta">
          <span>{text.length} sentences</span>
        </div>
      </div>
      <div className="transcripts-list">
        {text.map((transcript, index) => {
          const isUnlocked = unlockedSentenceNumbers.has(index);

          return (
            <div
              key={index}
              ref={index === currentNumber ? activeSentenceRef : null}
              className={`transcript-item ${index === currentNumber ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => onSentenceClick && onSentenceClick(index)}
            >
              <span className="transcript-number">{index + 1}</span>
              <div className="transcript-body">
                <span className={`transcript-text ${isUnlocked ? '' : 'is-obscured'}`}>
                  {isUnlocked ? transcript.speech : (transcript.speech || 'Sentence hidden until answered')}
                </span>
                {!isUnlocked && transcript.speech && (
                  <span className="transcript-lock-hint">完成该句听写后解锁原文</span>
                )}
                {(transcript.start || transcript.end) && (
                  <span className="transcript-time">
                    {transcript.start || '--'} - {transcript.end || '--'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Transcripts;
