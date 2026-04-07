import { useState, useRef, useCallback, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const AZURE_SPEECH_KEY = process.env.REACT_APP_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.REACT_APP_AZURE_SPEECH_REGION;

/**
 * Shared speech assessment hook backed by the browser Azure Speech SDK.
 * Keeps low-latency websocket recognition in the client for dictation and word practice.
 */
const useAzureSpeech = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const recognizerRef = useRef(null);
  const recorderId = useRef(Math.random().toString(36).slice(2, 11));
  const segmentsRef = useRef([]);

  const cleanupRecognizer = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.close();
      } catch (e) {
        // ignore recognizer cleanup errors
      }
      recognizerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    cleanupRecognizer();
    setIsProcessing(false);
  }, [cleanupRecognizer]);

  useEffect(() => {
    const handleRecordingStarted = (event) => {
      if (event.detail.sourceId !== recorderId.current) {
        cancelRecording();
      }
    };

    window.addEventListener('recording-started', handleRecordingStarted);
    return () => {
      window.removeEventListener('recording-started', handleRecordingStarted);
      cancelRecording();
    };
  }, [cancelRecording]);

  const createSpeechConfig = useCallback((referenceText) => {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error('Missing Azure Speech credentials. Check REACT_APP_AZURE_SPEECH_KEY and REACT_APP_AZURE_SPEECH_REGION.');
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = 'en-US';

    const wordCount = referenceText.trim().split(/\s+/).length;
    const isSingleWord = wordCount === 1;
    speechConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
      isSingleWord ? '1500' : '2000'
    );
    speechConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
      isSingleWord ? '5000' : '3500'
    );

    return speechConfig;
  }, []);

  const buildAssessmentResult = useCallback((speechResult) => {
    const pa = SpeechSDK.PronunciationAssessmentResult.fromResult(speechResult);
    const jsonStr = speechResult.properties.getProperty(
      SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
    );
    const parsed = JSON.parse(jsonStr);
    const nBest = parsed.NBest[0];

    return {
      recognizedText: speechResult.text,
      pronunciationAssessment: {
        accuracyScore: pa.accuracyScore,
        fluencyScore: pa.fluencyScore,
        completenessScore: pa.completenessScore,
        prosodyScore: pa.prosodyScore || null,
        pronunciationScore: pa.pronunciationScore
      },
      words: (nBest.Words || []).map((word) => ({
        word: word.Word,
        accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
        errorType: word.PronunciationAssessment?.ErrorType || 'None',
        syllables: word.Syllables ? word.Syllables.map((syllable) => ({
          syllable: syllable.Syllable,
          accuracyScore: syllable.PronunciationAssessment?.AccuracyScore || 0
        })) : [],
        phonemes: word.Phonemes ? word.Phonemes.map((phoneme) => ({
          phoneme: phoneme.Phoneme,
          accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore || 0
        })) : []
      }))
    };
  }, []);

  const assessPronunciation = useCallback(async (referenceText) => {
    if (!referenceText || isRecording) return null;

    window.dispatchEvent(new CustomEvent('recording-started', {
      detail: { sourceId: recorderId.current }
    }));

    setIsRecording(true);
    setIsProcessing(false);
    setError(null);
    setResult(null);

    try {
      const speechConfig = createSpeechConfig(referenceText);
      const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
      );
      pronunciationConfig.phonemeAlphabet = 'IPA';

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);
      recognizerRef.current = recognizer;

      const assessmentResult = await new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          (speechResult) => {
            setIsRecording(false);
            setIsProcessing(true);

            if (speechResult.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
              resolve(buildAssessmentResult(speechResult));
            } else if (speechResult.reason === SpeechSDK.ResultReason.NoMatch) {
              reject(new Error('No speech was detected. Speak a bit closer to the mic and try again.'));
            } else if (speechResult.reason === SpeechSDK.ResultReason.Canceled) {
              const details = SpeechSDK.CancellationDetails.fromResult(speechResult);
              reject(new Error(`Recognition canceled: ${details.errorDetails || details.reason}`));
            } else {
              reject(new Error('Speech recognition failed.'));
            }
          },
          reject
        );
      });

      recognizer.close();
      recognizerRef.current = null;
      setResult(assessmentResult);
      setIsProcessing(false);
      return assessmentResult;
    } catch (err) {
      setError(err.message || 'Pronunciation assessment failed');
      cleanupRecognizer();
      setIsProcessing(false);
      return null;
    }
  }, [buildAssessmentResult, cleanupRecognizer, createSpeechConfig, isRecording]);

  const startContinuousAssessment = useCallback((referenceText, onWordRecognized, onSegmentResult) => {
    if (!referenceText || isRecording) return;

    window.dispatchEvent(new CustomEvent('recording-started', {
      detail: { sourceId: recorderId.current }
    }));

    setIsRecording(true);
    setError(null);
    setResult(null);
    segmentsRef.current = [];

    try {
      const speechConfig = createSpeechConfig(referenceText);
      const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
      );
      pronunciationConfig.phonemeAlphabet = 'IPA';

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);
      recognizerRef.current = recognizer;

      recognizer.recognized = (_, event) => {
        if (event.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return;

        const jsonStr = event.result.properties.getProperty(
          SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
        );

        if (!jsonStr) return;

        try {
          const parsed = JSON.parse(jsonStr);
          segmentsRef.current.push(parsed);
          if (onSegmentResult) onSegmentResult(parsed);

          const nBest = parsed.NBest;
          if (nBest?.[0]?.Words && onWordRecognized) {
            nBest[0].Words.forEach((word) => {
              onWordRecognized({
                word: word.Word,
                accuracy: word.PronunciationAssessment?.AccuracyScore || 0,
                phonemes: word.Phonemes ? word.Phonemes.map((phoneme) => ({
                  phoneme: phoneme.Phoneme,
                  accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore || 0
                })) : []
              });
            });
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      recognizer.canceled = (_, event) => {
        if (event.reason === SpeechSDK.CancellationReason.Error) {
          setError(`Recognition error: ${event.errorDetails}`);
        }
        cleanupRecognizer();
      };

      recognizer.sessionStopped = () => {
        cleanupRecognizer();
      };

      recognizer.startContinuousRecognitionAsync(
        () => { },
        (err) => {
          setError(`Failed to start recording: ${err}`);
          cleanupRecognizer();
        }
      );
    } catch (err) {
      setError(`Error: ${err.message}`);
      cleanupRecognizer();
    }
  }, [cleanupRecognizer, createSpeechConfig, isRecording]);

  const stopContinuousAssessment = useCallback(() => new Promise((resolve) => {
    if (!isRecording || !recognizerRef.current) {
      resolve(null);
      return;
    }

    setIsProcessing(true);

    recognizerRef.current.stopContinuousRecognitionAsync(
      () => {
        try {
          let totalAccuracy = 0;
          let totalFluency = 0;
          let totalCompleteness = 0;
          let totalPron = 0;
          let count = 0;
          let recognizedText = '';
          let allWords = [];

          segmentsRef.current.forEach((segment) => {
            const nBest = segment.NBest;
            if (!nBest?.length) return;

            const bestResult = nBest[0];
            const pa = bestResult.PronunciationAssessment;
            if (pa) {
              totalAccuracy += pa.AccuracyScore || 0;
              totalFluency += pa.FluencyScore || 0;
              totalCompleteness += pa.CompletenessScore || 0;
              totalPron += pa.PronScore || 0;
              count += 1;
            }

            if (bestResult.Words) {
              allWords = allWords.concat(bestResult.Words.map((word) => ({
                word: word.Word,
                accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                errorType: word.PronunciationAssessment?.ErrorType || 'None',
                syllables: word.Syllables ? word.Syllables.map((syllable) => ({
                  syllable: syllable.Syllable,
                  accuracyScore: syllable.PronunciationAssessment?.AccuracyScore || 0
                })) : [],
                phonemes: word.Phonemes ? word.Phonemes.map((phoneme) => ({
                  phoneme: phoneme.Phoneme,
                  accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore || 0
                })) : []
              })));
            }

            if (bestResult.DisplayText) {
              recognizedText += `${bestResult.DisplayText} `;
            }
          });

          const aggregatedResult = count > 0 ? {
            recognizedText: recognizedText.trim(),
            pronunciationAssessment: {
              accuracyScore: totalAccuracy / count,
              fluencyScore: totalFluency / count,
              completenessScore: totalCompleteness / count,
              pronunciationScore: totalPron / count
            },
            words: allWords
          } : null;

          setResult(aggregatedResult);
          setIsProcessing(false);
          cleanupRecognizer();
          resolve(aggregatedResult);
        } catch (err) {
          console.error('Stop error:', err);
          setError(err.message || 'Failed to stop assessment.');
          setIsProcessing(false);
          cleanupRecognizer();
          resolve(null);
        }
      },
      (err) => {
        setError(`Failed to stop recording: ${err}`);
        setIsProcessing(false);
        cleanupRecognizer();
        resolve(null);
      }
    );
  }), [cleanupRecognizer, isRecording]);

  return {
    isRecording,
    isProcessing,
    result,
    error,
    assessPronunciation,
    startContinuousAssessment,
    stopContinuousAssessment
  };
};

export default useAzureSpeech;
