import { useState, useRef } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import './SpeechAssessor.css';

/**
 * SpeechAssessor — replaces old SpeechRecorder component.
 * Uses browser-side Azure Speech SDK directly via useAzureSpeech hook.
 * No backend proxy needed.
 */
const SpeechAssessor = ({ referenceText, onAssessmentResult, onError }) => {
    const {
        isRecording,
        isProcessing,
        startContinuousAssessment,
        stopContinuousAssessment,
        cancelRecording
    } = useAzureSpeech();

    const [audioUrl, setAudioUrl] = useState(null);
    const segmentsRef = useRef([]);

    const handleToggleRecording = async () => {
        if (isProcessing) return;

        if (isRecording) {
            // Stop recording and process results
            const result = await stopContinuousAssessment(segmentsRef.current);
            if (result) {
                if (onAssessmentResult) onAssessmentResult(result);
            } else if (!isRecording) {
                // Was canceled or failed
            }
            return;
        }

        // Start recording
        setAudioUrl(null);
        segmentsRef.current = [];

        startContinuousAssessment(
            referenceText,
            null, // onWordRecognized (not used here for now)
            (segment) => {
                segmentsRef.current.push(segment);
            }
        );
    };

    return (
        <div className="speech-recorder">
            <button
                className={`record-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                onClick={handleToggleRecording}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <>
                        <span className="spinner"></span>
                        正在处理...
                    </>
                ) : isRecording ? (
                    <>
                        <span className="stop-icon">■</span>
                        结束录音
                    </>
                ) : (
                    <>
                        🎤 开始录音
                    </>
                )}
            </button>

            {isRecording && (
                <div className="recording-indicator">
                    <span className="pulse"></span>
                    Recording in progress...
                </div>
            )}

            {audioUrl && !isRecording && (
                <div className="audio-preview" style={{ marginTop: '10px' }}>
                    <audio src={audioUrl} controls style={{ height: '30px' }} />
                </div>
            )}
        </div>
    );
};

export default SpeechAssessor;
