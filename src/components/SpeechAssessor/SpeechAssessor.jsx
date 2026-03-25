import { useState } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import './SpeechAssessor.css';

/**
 * SpeechAssessor — replaces old SpeechRecorder component.
 * Uses browser-side Azure Speech SDK directly via useAzureSpeech hook.
 * No backend proxy needed.
 */
const SpeechAssessor = ({ referenceText, onAssessmentResult, onError }) => {
    const { isRecording, isProcessing, assessPronunciation } = useAzureSpeech();
    const [audioUrl, setAudioUrl] = useState(null);

    const handleToggleRecording = async () => {
        if (isRecording || isProcessing) return;

        setAudioUrl(null);
        const result = await assessPronunciation(referenceText);

        if (result) {
            if (onAssessmentResult) {
                onAssessmentResult(result);
            }
        } else if (onError) {
            onError('Pronunciation assessment failed. Please try again.');
        }
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
                        Processing...
                    </>
                ) : isRecording ? (
                    <>
                        <span className="recording-dot"></span>
                        Listening...
                    </>
                ) : (
                    <>
                        🎤 Record Pronunciation
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
