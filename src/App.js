import './App.css';
import AudioControls from './components/AudioControls/AudioControls';
import Transcripts from './components/Transcripts/Transcripts';
import DiffCom from './components/DiffCom/DiffCom';
import ProgressBar from './components/ProgressBar/ProgressBar';
import DiffHistory from './components/DiffHistory/DiffHistory';
import WordSidebar from './components/WordSidebar/WordSidebar';
import ManualPronunciation from './components/ManualPronunciation/ManualPronunciation';
import PronunciationResults from './components/PronunciationResults/PronunciationResults';
import WordReading from './components/WordReading/WordReading';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const PROBLEM_HISTORY_STORAGE_KEYS = {
  Dictation: 'problemWordHistoryDictation',
  'Sentence Reading': 'problemWordHistorySentenceReading',
};

const loadProblemWordHistory = (storageKey) => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(`Failed to load problem word history for ${storageKey}:`, error);
    return [];
  }
};

function App() {
  const [text, setText] = useState('');
  const [number, setNumber] = useState(0);
  const [diffHistory, setDiffHistory] = useState([]);
  const [audioFileName, setAudioFileName] = useState('');
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [appMode, setAppMode] = useState('dictation');
  const [dictationProblemWordHistory, setDictationProblemWordHistory] = useState(() =>
    loadProblemWordHistory(PROBLEM_HISTORY_STORAGE_KEYS.Dictation)
  );
  const [sentenceProblemWordHistory, setSentenceProblemWordHistory] = useState(() =>
    loadProblemWordHistory(PROBLEM_HISTORY_STORAGE_KEYS['Sentence Reading'])
  );
  const replayRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      PROBLEM_HISTORY_STORAGE_KEYS.Dictation,
      JSON.stringify(dictationProblemWordHistory)
    );
  }, [dictationProblemWordHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      PROBLEM_HISTORY_STORAGE_KEYS['Sentence Reading'],
      JSON.stringify(sentenceProblemWordHistory)
    );
  }, [sentenceProblemWordHistory]);

  const captureProblemWords = useCallback((words, source = 'Reading') => {
    if (!words || words.length === 0) return;
    const setHistory = source === 'Dictation'
      ? setDictationProblemWordHistory
      : setSentenceProblemWordHistory;

    setHistory((prev) => {
      const next = [...prev];
      const seenKeys = new Set(prev.map((entry) => `${entry.word?.toLowerCase() || ''}|${entry.source}`));
      words.forEach((word) => {
        if (!word?.word) return;
        const normalized = word.word.trim();
        if (!normalized) return;
        const key = `${normalized.toLowerCase()}|${source}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        next.unshift({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          word: normalized,
          accuracy: word.accuracy ?? 0,
          errorType: word.errorType,
          phonemes: word.phonemes,
          source,
          timestamp: new Date().toISOString()
        });
      });
      return next.slice(0, 80);
    });
  }, []);

  const handleText = (text) => {
    setText(text);
    setNumber(0);
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
  const practicedSentences = diffHistory.length;
  const overallAccuracy = practicedSentences > 0
    ? Math.round(diffHistory.reduce((sum, item) => sum + item.accuracy, 0) / practicedSentences)
    : null;
  const completionRate = totalSentences > 0
    ? Math.round((practicedSentences / totalSentences) * 100)
    : 0;
  const unlockedSentenceNumbers = useMemo(
    () => new Set(diffHistory.map((item) => item.sentenceNumber)),
    [diffHistory]
  );

  const modes = [
    {
      key: 'dictation',
      label: 'Dictation',
      icon: '🎧',
      desc: 'Dictation Studio',
      summary: 'Upload audio, practice sentence by sentence, and review dictation differences with pronunciation feedback.',
    },
    {
      key: 'sentence',
      label: 'Sentence Reading',
      icon: '📖',
      desc: 'Sentence Reading',
      summary: 'Paste any text, assess selected words or phrases, and revisit weak words in focused reading practice.',
    },
    {
      key: 'word-reading',
      label: 'Word Reading',
      icon: '📖',
      desc: 'Word Reading',
      summary: 'Review saved weak words from earlier sessions and reassess them in a dedicated practice view.',
    },
  ];
  const activeMode = modes.find((mode) => mode.key === appMode);

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <div className="hero-copy">
            <span className="hero-eyebrow">AI Listening Lab</span>
            <h1 className="app-title">Listening, Dictation, and Pronunciation in one focused workspace.</h1>
            <p className="app-subtitle">
              Move from audio import to sentence-level correction and weak-word review without leaving the same workspace.
            </p>
          </div>


        </header>

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

        <section className="mode-spotlight">
          <div>
            <span className="spotlight-kicker">{activeMode?.label}</span>
            <h2 className="spotlight-title">{activeMode?.desc}</h2>
          </div>
          <p className="spotlight-text">{activeMode?.summary}</p>
        </section>

        <div className="main-content">
          <section className={`mode-panel ${appMode === 'dictation' ? 'active' : 'hidden'}`}>
            <>
              <AudioControls
                handleText={handleText}
                number={number}
                handleNum={handleNum}
                text={text}
                onReplay={replayRef}
                onAudioNameChange={handleAudioNameChange}
                audioFileName={audioFileName}
              />

              {text && totalSentences > 0 ? (
                <div className="dictation-layout">
                  <div className="dictation-top-row">
                    <div className="dictation-main">
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
                          onPronunciationResult={setPronunciationResult}
                          isReferenceUnlocked={unlockedSentenceNumbers.has(number)}
                        />
                      </div>
                    </div>

                    <aside className="dictation-side">
                      <Transcripts
                        text={text?.transcript}
                        currentNumber={number}
                        onSentenceClick={handleSentenceClick}
                        unlockedSentenceNumbers={unlockedSentenceNumbers}
                      />
                    </aside>
                  </div>

                  {pronunciationResult && (
                    <div className="dictation-results">
                      <PronunciationResults
                        pronunciationResult={pronunciationResult}
                        referenceText={text?.transcript?.[number]?.speech}
                        modeLabel="Dictation Playback"
                        onProblemWordsCaptured={(problemWords) => captureProblemWords(problemWords, 'Dictation')}
                      />
                    </div>
                  )}

                  <div className="dictation-history">
                    <DiffHistory
                      history={diffHistory}
                      audioFileName={audioFileName}
                    />
                  </div>
                </div>
              ) : (
                <section className="empty-workspace">
                  <div className="empty-workspace-card">
                    <span className="empty-step">01</span>
                    <h3>Import an audio file</h3>
                    <p>Upload a new practice source or restore a previous session from history.</p>
                  </div>
                  <div className="empty-workspace-card">
                    <span className="empty-step">02</span>
                    <h3>Practice sentence by sentence</h3>
                    <p>Use keyboard shortcuts to move quickly through the audio, then record for pronunciation assessment.</p>
                  </div>
                  <div className="empty-workspace-card">
                    <span className="empty-step">03</span>
                    <h3>Review mistakes and weak words</h3>
                    <p>The side history and word panel keep the items you need to revisit later.</p>
                  </div>
                </section>
              )}

              <WordSidebar />
            </>
          </section>

          <section className={`mode-panel ${appMode === 'sentence' ? 'active' : 'hidden'}`}>
            <ManualPronunciation
              onProblemWordsCaptured={(problemWords) => captureProblemWords(problemWords, 'Sentence Reading')}
            />
          </section>

          <section className={`mode-panel ${appMode === 'word-reading' ? 'active' : 'hidden'}`}>
            <WordReading
              dictationHistoryWords={dictationProblemWordHistory}
              sentenceHistoryWords={sentenceProblemWordHistory}
            />
          </section>

        </div>
      </div>
    </div>
  );
}

export default App;
