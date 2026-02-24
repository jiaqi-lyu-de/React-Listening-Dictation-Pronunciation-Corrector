import { useState, useRef, useCallback } from 'react';

const useRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = useCallback(async (onDataAvailable) => {
        try {
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
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const stream = mediaRecorderRef.current.stream;
                    stream.getTracks().forEach(track => track.stop());
                    setIsRecording(false);
                    resolve(audioBlob);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(null);
            }
        });
    }, [isRecording]);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
};

export default useRecorder;
