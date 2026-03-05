import { useState, useRef } from 'react';
import useRecorder from '../../utils/useRecorder';
import './SpeechRecorder.css';

const SpeechRecorder = ({ referenceText, onAssessmentResult, onError }) => {
    const { isRecording, startRecording: startRedcordingHook, stopRecording: stopRecordingHook } = useRecorder();
    const [isProcessing, setIsProcessing] = useState(false);

    const [audioUrl, setAudioUrl] = useState(null);

    const startRecording = async () => {
        setAudioUrl(null); // Clear previous recording
        const success = await startRedcordingHook();
        if (!success && onError) {
            onError('Failed to access microphone. Please grant microphone permission and try again.');
        }
    };

    const stopRecording = async () => {
        if (isRecording) {
            const audioBlob = await stopRecordingHook();
            if (audioBlob) {
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                setIsProcessing(true);
                await processAudio(audioBlob);
            }
        }
    };

    const processAudio = async (audioBlob) => {
        try {

            // Convert WebM to WAV for better Azure Speech SDK compatibility
            const wavBlob = await convertToWav(audioBlob);
            // Prepare form data
            const formData = new FormData();
            formData.append('audio', wavBlob, 'recording.wav');
            formData.append('referenceText', referenceText);

            // Send to backend
            const response = await fetch('http://localhost:8888/pronunciation-assessment', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (onAssessmentResult) {
                    onAssessmentResult(data.result);
                }
            } else {
                throw new Error(data.message || 'Pronunciation assessment failed');
            }
        } catch (error) {
            if (onError) {
                onError(error.message || 'Failed to process audio. Please try again.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Convert WebM/other formats to WAV for better Azure Speech SDK compatibility
    const convertToWav = async (blob) => {
        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const fileReader = new FileReader();

            fileReader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // Convert to WAV format (16-bit PCM, mono, 16kHz - optimal for speech recognition)
                    const wavBuffer = audioBufferToWav(audioBuffer);
                    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

                    audioContext.close();
                    resolve(wavBlob);
                } catch (error) {
                    console.error('Audio conversion error:', error);
                    audioContext.close();
                    reject(error);
                }
            };

            fileReader.onerror = () => {
                reject(new Error('Failed to read audio file'));
            };

            fileReader.readAsArrayBuffer(blob);
        });
    };

    // Convert AudioBuffer to WAV format
    const audioBufferToWav = (audioBuffer) => {
        // Resample to 16kHz mono for optimal speech recognition
        const targetSampleRate = 16000;
        const numberOfChannels = 1; // mono

        // Get audio data and convert to mono if needed
        let audioData;
        if (audioBuffer.numberOfChannels === 1) {
            audioData = audioBuffer.getChannelData(0);
        } else {
            // Mix down to mono
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            audioData = new Float32Array(left.length);
            for (let i = 0; i < left.length; i++) {
                audioData[i] = (left[i] + right[i]) / 2;
            }
        }

        // Resample if needed
        if (audioBuffer.sampleRate !== targetSampleRate) {
            audioData = resampleAudio(audioData, audioBuffer.sampleRate, targetSampleRate);
        }

        // Create WAV file
        const buffer = new ArrayBuffer(44 + audioData.length * 2);
        const view = new DataView(buffer);

        // WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + audioData.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // PCM format
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, targetSampleRate, true);
        view.setUint32(28, targetSampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true); // 16-bit
        writeString(view, 36, 'data');
        view.setUint32(40, audioData.length * 2, true);

        // Write PCM samples
        let offset = 44;
        for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const resampleAudio = (audioData, fromSampleRate, toSampleRate) => {
        const ratio = fromSampleRate / toSampleRate;
        const newLength = Math.round(audioData.length / ratio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const position = i * ratio;
            const index = Math.floor(position);
            const fraction = position - index;

            if (index + 1 < audioData.length) {
                result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction;
            } else {
                result[i] = audioData[index];
            }
        }

        return result;
    };

    const handleToggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
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
                        Stop Recording
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

export default SpeechRecorder;
