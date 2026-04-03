import { useEffect, useRef } from 'react';
import useAzureSpeech from '../../utils/useAzureSpeech';
import './SpeechAssessor.css';

/**
 * SpeechAssessor
 * Uses the shared Azure speech hook for live pronunciation assessment.
 */
const SpeechAssessor = ({ referenceText, onAssessmentResult, onError }) => {
    const {
        isRecording,
        isProcessing,
        error,
        startContinuousAssessment,
        stopContinuousAssessment
    } = useAzureSpeech();

    const segmentsRef = useRef([]);

    useEffect(() => {
        if (!error || !onError) return;
        onError(error);
    }, [error, onError]);

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
                className={`record-button ui-btn-primary ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
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
        </div>
    );
};

export default SpeechAssessor;
