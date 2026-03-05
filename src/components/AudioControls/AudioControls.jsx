import React, { useState, useRef, useEffect } from "react";
import { fetchAPI } from '../../utils/fetch';
import HistorySelector from '../HistorySelector/HistorySelector';
import './AudioControls.css';

const AudioControls = ({ handleText, number, handleNum, text, onReplay, onAudioNameChange }) => {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const handleHistorySelect = ({ text, audioUrl, fileName }) => {
    handleText(text);
    if (audioUrl) {
      setAudioUrl(audioUrl);
    }
    if (onAudioNameChange) {
      onAudioNameChange(fileName);
    }
  };

  // 辅助函数：时间字符串转秒数
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return (hours * 3600) + (minutes * 60) + seconds;
  };

  // 核心功能：监听时间更新
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    const currentLine = text?.transcript?.[number];

    if (audio && currentLine?.end) {
      const endTime = timeToSeconds(currentLine.end);

      // 如果当前播放时间超过了句子的结束时间
      if (audio.currentTime >= endTime) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = endTime;
      }
    }
  };

  // 当切换句子序号时，跳转到开始时间并自动播放（可选）
  useEffect(() => {
    const startTimeStr = text?.transcript?.[number]?.start;
    if (startTimeStr && audioRef.current) {
      const startTime = timeToSeconds(startTimeStr);
      audioRef.current.currentTime = startTime;

      // 如果希望切换句子后自动播放这一段，取消下面注释：
      // audioRef.current.play();
      // setIsPlaying(true);
    }
  }, [number, text]);

  // 内存清理
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleUpload = async (file) => {
    if (!file) return;

    setError(null);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setLoading(true);

    // Pass filename to parent
    if (onAudioNameChange) {
      onAudioNameChange(file.name);
    }

    try {
      const formData = new FormData();
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

  const replaySentence = () => {
    const startTimeStr = text?.transcript?.[number]?.start;
    if (startTimeStr && audioRef.current) {
      const startTime = timeToSeconds(startTimeStr);
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (number > 0) {
      handleNum(number - 1);
    }
  };

  const handleNext = () => {
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
  }, [number, text, onReplay]);

  const totalSentences = text?.transcript?.length || 0;

  return (
    <div className="audio-controls-container">
      <div className="upload-section">
        {!audioUrl && (
          <>
            <label htmlFor="audio-upload" className="upload-label">
              <span className="upload-icon">🎵</span>
              <span className="upload-text">
                {loading ? 'Processing...' : 'Choose Audio File'}
              </span>
            </label>
            <input
              id="audio-upload"
              type="file"
              onChange={(e) => handleUpload(e.target.files[0])}
              accept="audio/*"
              style={{ display: 'none' }}
              disabled={loading}
            />
          </>
        )}
        {error && <div className="error-message">{error}</div>}
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Transcribing audio...</p>
          </div>
        )}
        <HistorySelector onSelect={handleHistorySelect} />
      </div>

      {audioUrl && (
        <>
          <div className="audio-player">
            <audio
              controls
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          <div className="playback-controls">
            <button
              className="control-btn secondary"
              onClick={handlePrevious}
              disabled={number === 0}
            >
              ⏮ Previous
            </button>
            <button
              className="control-btn primary"
              onClick={replaySentence}
            >
              🔁 Replay Current
            </button>
            <button
              className="control-btn secondary"
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