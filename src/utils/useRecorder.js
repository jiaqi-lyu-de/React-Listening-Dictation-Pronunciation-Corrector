import { useState, useRef, useCallback, useEffect } from 'react';

const useRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recorderId = useRef(Math.random().toString(36).substr(2, 9));

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                } catch (e) {}
            }
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            setIsRecording(false);
        }
    }, []);

    useEffect(() => {
        const handleRecordingStarted = (e) => {
            if (e.detail.sourceId !== recorderId.current) {
                cancelRecording();
            }
        };
        window.addEventListener('recording-started', handleRecordingStarted);
        return () => window.removeEventListener('recording-started', handleRecordingStarted);
    }, [cancelRecording]);

    const startRecording = useCallback(async (onDataAvailable) => {
        try {
            window.dispatchEvent(new CustomEvent('recording-started', { detail: { sourceId: recorderId.current } }));

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    if (onDataAvailable) {
                        onDataAvailable(event.data);
                    }
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            return false;
        }
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    if (mediaRecorderRef.current.stream) {
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    }
                    setIsRecording(false);
                    resolve(audioBlob);
                };
                mediaRecorderRef.current.stop();
            } else {
                setIsRecording(false);
                resolve(null);
            }
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
        cancelRecording
    };
};

export default useRecorder;
