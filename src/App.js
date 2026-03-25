import './App.css';
import AudioControls from './components/AudioControls/AudioControls';
import Transcripts from './components/Transcripts/Transcripts';
import DiffCom from './components/DiffCom/DiffCom';
import ProgressBar from './components/ProgressBar/ProgressBar';
import DiffHistory from './components/DiffHistory/DiffHistory';
import WordSidebar from './components/WordSidebar/WordSidebar';
import ManualPronunciation from './components/ManualPronunciation/ManualPronunciation';
import WordReading from './components/WordReading/WordReading';
import { useState, useRef } from 'react';

function App() {
  const [text, setText] = useState('');
  const [number, setNumber] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(null);
  const [diffHistory, setDiffHistory] = useState([]);
  const [audioFileName, setAudioFileName] = useState('');
  const [appMode, setAppMode] = useState('dictation');
  const replayRef = useRef(null);

  const handleText = (text) => {
    setText(text);
    setNumber(0);
    setOverallAccuracy(null);
    setDiffHistory([]);
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
    if (diffData && typeof diffData === 'object') {
      setDiffHistory(prevHistory => {
        const existingIndex = prevHistory.findIndex(
          item => item.sentenceNumber === diffData.sentenceNumber
        );

        if (existingIndex >= 0) {
          const newHistory = [...prevHistory];
          newHistory[existingIndex] = diffData;
          return newHistory;
        } else {
          return [...prevHistory, diffData];
        }
      });
    }
  };

  const handleReplayAudio = () => {
    if (replayRef.current) {
      replayRef.current();
    }
  };

  const handleAudioNameChange = (fileName) => {
    setAudioFileName(fileName);
  };

  const totalSentences = text?.transcript?.length || 0;

  const modes = [
    { key: 'dictation', label: '语音转复读', icon: '🎧', desc: 'Dictation' },
    { key: 'sentence', label: '句子阅读', icon: '📖', desc: 'Sentence Reading' },
    { key: 'word', label: '单词阅读', icon: '📝', desc: 'Word Reading' },
  ];

  return (
    <div className="App">
      <div className="app-header">
        <h1 className="app-title">🎧 Listening & Pronunciation</h1>
        <p className="app-subtitle">Improve your skills with real-time feedback</p>
      </div>

      <div className="app-container">
        <div className="mode-toggle">
          {modes.map(mode => (
            <button
              key={mode.key}
              className={`toggle-btn ${appMode === mode.key ? 'active' : ''}`}
              onClick={() => setAppMode(mode.key)}
            >
              <span className="toggle-icon">{mode.icon}</span>
              <span className="toggle-label">{mode.label}</span>
            </button>
          ))}
        </div>

        <div className="main-content">
          {appMode === 'dictation' && (
            <>
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
            </>
          )}

          {appMode === 'sentence' && (
            <ManualPronunciation />
          )}

          {appMode === 'word' && (
            <WordReading />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
