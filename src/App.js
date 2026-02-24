import './App.css';
import AudioControls from './components/AudioControls';
import Transcripts from './components/Transcripts';
import DiffCom from './components/DiffCom';
import ProgressBar from './components/ProgressBar';
import DiffHistory from './components/DiffHistory';
import WordSidebar from './components/WordSidebar';
import { useState, useRef } from 'react';

function App() {
  const [text, setText] = useState('');
  const [number, setNumber] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(null);
  const [diffHistory, setDiffHistory] = useState([]);
  const [audioFileName, setAudioFileName] = useState('');
  const replayRef = useRef(null);

  const handleText = (text) => {
    setText(text);
    setNumber(0); // Reset to first sentence when new audio is uploaded
    setOverallAccuracy(null);
    setDiffHistory([]); // Clear history when new audio is uploaded
  };

  const handleNum = (num) => {
    const maxNum = text?.transcript?.length - 1 || 0;
    const validNum = Math.max(0, Math.min(num, maxNum));
    setNumber(validNum);
  };

  const handleSentenceClick = (index) => {
    handleNum(index);
  };

  const handleNext = () => {
    handleNum(number + 1);
  };

  const handleReplay = (diffData) => {
    // If diffData is provided, save it to history
    if (diffData && typeof diffData === 'object') {
      setDiffHistory(prevHistory => {
        // Check if entry for this sentence already exists
        const existingIndex = prevHistory.findIndex(
          item => item.sentenceNumber === diffData.sentenceNumber
        );

        if (existingIndex >= 0) {
          // Update existing entry (keep latest)
          const newHistory = [...prevHistory];
          newHistory[existingIndex] = diffData;
          return newHistory;
        } else {
          // Add new entry
          return [...prevHistory, diffData];
        }
      });
    }
  };

  const handleReplayAudio = () => {
    // Just replay audio
    if (replayRef.current) {
      replayRef.current();
    }
  };

  const handleAudioNameChange = (fileName) => {
    setAudioFileName(fileName);
  };

  const totalSentences = text?.transcript?.length || 0;

  return (
    <div className="App">
      <div className="app-header">
        <h1 className="app-title">🎧 Listening Practice</h1>
        <p className="app-subtitle">Improve your listening skills with real-time feedback</p>
      </div>

      <div className="app-container">
        <div className="main-content">
          <AudioControls
            handleText={handleText}
            number={number}
            handleNum={handleNum}
            text={text}
            onReplay={replayRef}
            onAudioNameChange={handleAudioNameChange}
          />

          {text && totalSentences > 0 && (
            <>
              <ProgressBar
                current={number}
                total={totalSentences}
                accuracy={overallAccuracy}
              />

              <div className="practice-section">
                <DiffCom
                  text={text}
                  number={number}
                  onNext={handleNext}
                  onCheck={handleReplay}
                  onReplayAudio={handleReplayAudio}
                />
              </div>

              <DiffHistory
                history={diffHistory}
                audioFileName={audioFileName}
              />

              <Transcripts
                text={text?.transcript}
                currentNumber={number}
                onSentenceClick={handleSentenceClick}
              />
            </>
          )}

          <WordSidebar />
        </div>
      </div>
    </div>
  );
}

export default App;
