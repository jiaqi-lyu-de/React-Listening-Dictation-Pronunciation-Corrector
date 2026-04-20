import React, { useState, useRef, useEffect, useCallback } from "react";
import { fetchAPI } from '../../utils/fetch';
import HistorySelector from '../HistorySelector/HistorySelector';
import './AudioControls.css';

const AudioControls = ({
  handleText,
  number,
  handleNum,
  text,
  onReplay,
  onAudioNameChange,
  audioFileName
}) => {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [transcriptionMethod, setTranscriptionMethod] = useState("whisper-node");
  const [isFullPlaying, setIsFullPlaying] = useState(false);
  const audioRef = useRef(null);
  const uploadedObjectUrlRef = useRef(null);

  const handleHistorySelect = ({ text, audioUrl, fileName }) => {
    handleText(text);
    if (audioUrl) {
      setAudioUrl(audioUrl);
    }
    if (onAudioNameChange) {
      onAudioNameChange(fileName);
    }
  };

  // Convert an hh:mm:ss timestamp string into seconds.
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
  };

  // Keep the active sentence aligned with playback progress.
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !text?.transcript) return;

    if (isFullPlaying) {
      const currentTime = audio.currentTime;
      let newNumber = number;
      for (let i = 0; i < text.transcript.length; i++) {
        const start = timeToSeconds(text.transcript[i].start);
        const end = timeToSeconds(text.transcript[i].end);
        if (currentTime >= start && currentTime <= end) {
          newNumber = i;
          break;
        }
      }
      if (newNumber !== number) {
        handleNum(newNumber);
      }
    } else {
      const currentLine = text.transcript[number];
      if (currentLine?.end) {
        const endTime = timeToSeconds(currentLine.end);

        // Stop sentence playback at the current sentence boundary.
        if (audio.currentTime >= endTime) {
          audio.pause();
          audio.currentTime = endTime;
        }
      }
    }
  };

  // When the active sentence changes, keep playback anchored to its start time.
  useEffect(() => {
    const currentLine = text?.transcript?.[number];
    if (currentLine?.start && audioRef.current) {
      const startTime = timeToSeconds(currentLine.start);
      const endTime = timeToSeconds(currentLine.end);
      const currentTime = audioRef.current.currentTime;

      // If the current audio time is not within the sentence boundaries, jump to start
      if (currentTime < startTime || currentTime > endTime) {
        audioRef.current.currentTime = startTime;
      }
    }
  }, [number, text]);

  // Revoke the last uploaded object URL on unmount.
  useEffect(() => {
    return () => {
      if (uploadedObjectUrlRef.current) {
        URL.revokeObjectURL(uploadedObjectUrlRef.current);
      }
    };
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;

    setError(null);
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    uploadedObjectUrlRef.current = url;
    setAudioUrl(url);
    setLoading(true);

    // Pass filename to parent
    if (onAudioNameChange) {
      onAudioNameChange(file.name);
    }

    try {
      const formData = new FormData();
      formData.append('method', transcriptionMethod);
      formData.append('audio', file);
      const response = await fetchAPI('transcribe', 'POST', { body: formData });
      handleText(response);
      setError(null);
    } catch (error) {
      console.error('Upload error:', error.message);
      setError(error.message || 'Failed to process audio file. Please try again.');
      setAudioUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // const togglePlay = () => {
  //   if (isPlaying) {
  //     audioRef.current.pause();
  //   } else {
  //     audioRef.current.play();
  //   }
  //   setIsPlaying(!isPlaying);
  // };

  const playFull = () => {
    setIsFullPlaying(true);
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const replaySentence = useCallback(() => {
    setIsFullPlaying(false);
    const startTimeStr = text?.transcript?.[number]?.start;
    if (startTimeStr && audioRef.current) {
      const startTime = timeToSeconds(startTimeStr);
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
  }, [number, text]);

  const handlePrevious = () => {
    setIsFullPlaying(false);
    if (number > 0) {
      handleNum(number - 1);
    }
  };

  const handleNext = () => {
    setIsFullPlaying(false);
    const totalSentences = text?.transcript?.length || 0;
    if (number < totalSentences - 1) {
      handleNum(number + 1);
    }
  };

  // Expose replay function to parent
  useEffect(() => {
    if (onReplay) {
      onReplay.current = replaySentence;
    }
  }, [number, text, onReplay, replaySentence]);

  const totalSentences = text?.transcript?.length || 0;
  const handleResetSession = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (uploadedObjectUrlRef.current) {
      URL.revokeObjectURL(uploadedObjectUrlRef.current);
      uploadedObjectUrlRef.current = null;
    }
    setAudioUrl(null);
    setError(null);
    setIsFullPlaying(false);
    handleText('');
    if (onAudioNameChange) {
      onAudioNameChange('');
    }
  };

  const methodOptions = [
    {
      value: 'whisper-node',
      title: 'whisper-node',
      desc: 'Default option with lighter processing for faster imports.',
    },
    {
      value: 'whisperx',
      title: 'whisperx',
      desc: 'Provides finer sentence segmentation for more precise boundaries.',
    },
  ];

  return (
    <div className="audio-controls-container">
      <div className="upload-section">
        <div className="upload-copy">
          <span className="section-kicker">Audio Setup</span>
          <h2 className="upload-title">Import audio and start sentence-level practice</h2>
          <p className="upload-subtitle">
            Upload a new audio file or restore a saved session with its dictation context and timeline.
          </p>
        </div>

        {!audioUrl && (
          <>
            <label htmlFor="audio-upload" className="upload-label">
              <span className="upload-icon">🎵</span>
              <span className="upload-text-group">
                <span className="upload-text">
                  {loading ? 'Processing...' : 'Choose Audio File'}
                </span>
                <span className="upload-hint">Supports common formats such as MP3, WAV, and M4A</span>
              </span>
            </label>
            <input
              id="audio-upload"
              type="file"
              onChange={(e) => handleUpload(e.target.files[0])}
              accept="audio/*"
              className="audio-upload-input"
              disabled={loading}
            />
            <div className="method-selector">
              {methodOptions.map((option) => (
                <label
                  key={option.value}
                  className={`method-option ${transcriptionMethod === option.value ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={option.value}
                    checked={transcriptionMethod === option.value}
                    onChange={() => setTranscriptionMethod(option.value)}
                    disabled={loading}
                  />
                  <span className="method-option-title">{option.title}</span>
                  <span className="method-option-desc">{option.desc}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {error && <div className="error-message">{error}</div>}
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Transcribing audio...</p>
          </div>
        )}
        <div className="history-selector-row">
          <HistorySelector onSelect={handleHistorySelect} />
          {audioUrl && (
            <button className="session-reset-btn ui-btn-secondary" onClick={handleResetSession}>
              Start New Session
            </button>
          )}
        </div>
      </div>

      {audioUrl && (
        <>
          <div className="audio-session-meta">
            <div className="session-chip">
              <span className="session-chip-label">Current File</span>
              <strong>{audioFileName || 'Imported audio'}</strong>
            </div>
            <div className="session-chip">
              <span className="session-chip-label">Sentence</span>
              <strong>{totalSentences > 0 ? `${number + 1} / ${totalSentences}` : '--'}</strong>
            </div>
            <div className="session-chip">
              <span className="session-chip-label">Playback</span>
              <strong>{isFullPlaying ? 'Follow full audio' : 'Focus current sentence'}</strong>
            </div>
          </div>

          <div className="audio-player">
            <audio
              controls
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          <div className="playback-controls">
            <button
              className="control-btn secondary ui-btn-secondary"
              onClick={handlePrevious}
              disabled={number === 0}
            >
              ⏮ Previous
            </button>
            <button
              className="control-btn primary ui-btn-primary"
              onClick={replaySentence}
            >
              🔁 Replay Current
            </button>
            <button
              className="control-btn primary ui-btn-primary"
              onClick={playFull}
            >
              🎧 Play Through
            </button>
            <button
              className="control-btn secondary ui-btn-secondary"
              onClick={handleNext}
              disabled={number >= totalSentences - 1}
            >
              Next ⏭
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AudioControls;
