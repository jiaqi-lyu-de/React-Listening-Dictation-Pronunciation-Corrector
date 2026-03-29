import { useState, useRef, useCallback, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const AZURE_SPEECH_KEY = process.env.REACT_APP_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.REACT_APP_AZURE_SPEECH_REGION;

/**
 * Unified Azure Speech SDK hook for pronunciation assessment.
 * 
 * Provides two modes:
 * 1. Single assessment (recognizeOnce) — for sentence/word pronunciation
 * 2. Continuous assessment — for batch word reading (wordd-style)
 * 
 * All components should use this hook instead of the old useRecorder + backend approach.
 */
const useAzureSpeech = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const recognizerRef = useRef(null);
  const recorderId = useRef(Math.random().toString(36).substr(2, 9));

  // Utility to close recognizer and reset state
  const cleanupRecognizer = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.close();
      } catch (e) { /* ignore */ }
      recognizerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Cancel any ongoing recording when another component starts recording
  const cancelRecording = useCallback(() => {
    cleanupRecognizer();
    setIsProcessing(false);
  }, [cleanupRecognizer]);

  // Listen for recording-started events from other speech components
  useEffect(() => {
    const handleRecordingStarted = (e) => {
      if (e.detail.sourceId !== recorderId.current) {
        cancelRecording();
      }
    };
    window.addEventListener('recording-started', handleRecordingStarted);
    return () => {
      window.removeEventListener('recording-started', handleRecordingStarted);
      cancelRecording();
    };
  }, [cancelRecording]);

  /**
   * Single pronunciation assessment (recognizeOnce).
   * Used for sentence reading and manual pronunciation modes.
   * 
   * @param {string} referenceText - The text to assess against
   * @returns {Promise<object|null>} Assessment result in unified format
   */
  const assessPronunciation = useCallback(async (referenceText) => {
    if (!referenceText || isRecording) return null;

    // Broadcast that we're starting a recording
    window.dispatchEvent(new CustomEvent('recording-started', {
      detail: { sourceId: recorderId.current }
    }));

    setIsRecording(true);
    setIsProcessing(false);
    setError(null);
    setResult(null);

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
      );
      speechConfig.speechRecognitionLanguage = 'en-US';

      const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
      );
      pronunciationConfig.phonemeAlphabet = "IPA";

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
              const pa = SpeechSDK.PronunciationAssessmentResult.fromResult(speechResult);
              const jsonStr = speechResult.properties.getProperty(
                SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
              );
              const parsed = JSON.parse(jsonStr);
              const nBest = parsed.NBest[0];

              // Unified result format
              resolve({
                recognizedText: speechResult.text,
                pronunciationAssessment: {
                  accuracyScore: pa.accuracyScore,
                  fluencyScore: pa.fluencyScore,
                  completenessScore: pa.completenessScore,
                  prosodyScore: pa.prosodyScore || null,
                  pronunciationScore: pa.pronunciationScore
                },
                words: nBest.Words.map(word => ({
                  word: word.Word,
                  accuracyScore: word.PronunciationAssessment?.AccuracyScore || 0,
                  errorType: word.PronunciationAssessment?.ErrorType || 'None',
                  syllables: word.Syllables ? word.Syllables.map(s => ({
                    syllable: s.Syllable,
                    accuracyScore: s.PronunciationAssessment?.AccuracyScore || 0
                  })) : [],
                  phonemes: word.Phonemes ? word.Phonemes.map(p => ({
                    phoneme: p.Phoneme,
                    accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0
                  })) : []
                }))
              });
            } else if (speechResult.reason === SpeechSDK.ResultReason.NoMatch) {
              reject(new Error('No speech could be recognized. Please try again.'));
            } else if (speechResult.reason === SpeechSDK.ResultReason.Canceled) {
              const details = SpeechSDK.CancellationDetails.fromResult(speechResult);
              reject(new Error(`Recognition canceled: ${details.errorDetails || details.reason}`));
            } else {
              reject(new Error('Speech recognition failed'));
            }
          },
          (err) => reject(err)
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
  }, [isRecording, cleanupRecognizer]);

  /**
   * Start continuous pronunciation assessment.
   * Used for batch word reading (wordd-style Space key).
   * 
   * @param {string} referenceText - Space-separated words to assess
   * @param {Function} onWordRecognized - Callback(recognizedWord) for real-time updates
   * @param {Function} onSegmentResult - Callback(segment) for each recognition segment
   */
  const startContinuousAssessment = useCallback((referenceText, onWordRecognized, onSegmentResult) => {
    if (isRecording) return;

    window.dispatchEvent(new CustomEvent('recording-started', {
      detail: { sourceId: recorderId.current }
    }));

    setIsRecording(true);
    setError(null);
    setResult(null);

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
      );
      speechConfig.speechRecognitionLanguage = 'en-US';

      const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
      );

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);
      recognizerRef.current = recognizer;

      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const jsonStr = e.result.properties.getProperty(
            SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
          );
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (onSegmentResult) onSegmentResult(parsed);

              // Extract individual word results for real-time highlighting
              const nBest = parsed.NBest;
              if (nBest && nBest.length > 0 && nBest[0].Words) {
                nBest[0].Words.forEach(w => {
                  if (onWordRecognized) {
                    onWordRecognized({
                      word: w.Word,
                      accuracy: w.PronunciationAssessment?.AccuracyScore || 0,
                      phonemes: w.Phonemes ? w.Phonemes.map(p => ({
                        phoneme: p.Phoneme,
                        accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0
                      })) : []
                    });
                  }
                });
              }
            } catch (err) {
              console.error('Parse error:', err);
            }
          }
        }
      };

      recognizer.canceled = (s, e) => {
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          setError('Recognition error: ' + e.errorDetails);
        }
        cleanupRecognizer();
      };

      recognizer.sessionStopped = () => {
        cleanupRecognizer();
      };

      recognizer.startContinuousRecognitionAsync(
        () => { /* started */ },
        (err) => {
          setError('Failed to start recording: ' + err);
          cleanupRecognizer();
        }
      );
    } catch (err) {
      setError('Error: ' + err.message);
      cleanupRecognizer();
    }
  }, [isRecording, cleanupRecognizer]);

  /**
   * Stop continuous assessment and return overall scores.
   * 
   * @param {Array} segments - Collected segment results
   * @returns {Promise<object|null>} Overall scores
   */
  const stopContinuousAssessment = useCallback((segments = []) => {
    return new Promise((resolve) => {
      if (!isRecording || !recognizerRef.current) {
        resolve(null);
        return;
      }

      setIsProcessing(true);

      recognizerRef.current.stopContinuousRecognitionAsync(
        () => {
          // Calculate overall scores and aggregate text/words from segments
          let totalAccuracy = 0, totalFluency = 0, totalCompleteness = 0, totalPron = 0;
          let count = 0;
          let recognizedText = "";
          let allWords = [];

          segments.forEach(seg => {
            const nBest = seg.NBest;
            if (nBest && nBest.length > 0) {
              const bestResult = nBest[0];
              const pa = bestResult.PronunciationAssessment;
              if (pa) {
                totalAccuracy += pa.AccuracyScore || 0;
                totalFluency += pa.FluencyScore || 0;
                totalCompleteness += pa.CompletenessScore || 0;
                totalPron += pa.PronScore || 0;
                count++;
              }

              // Aggregate words and text
              if (bestResult.Words) {
                bestResult.Words.forEach(w => {
                  allWords.push({
                    word: w.Word,
                    accuracyScore: w.PronunciationAssessment?.AccuracyScore || 0,
                    errorType: w.PronunciationAssessment?.ErrorType || 'None',
                    syllables: w.Syllables ? w.Syllables.map(s => ({
                      syllable: s.Syllable,
                      accuracyScore: s.PronunciationAssessment?.AccuracyScore || 0
                    })) : [],
                    phonemes: w.Phonemes ? w.Phonemes.map(p => ({
                      phoneme: p.Phoneme,
                      accuracyScore: p.PronunciationAssessment?.AccuracyScore || 0
                    })) : []
                  });
                });
              }
              if (bestResult.DisplayText) {
                recognizedText += (recognizedText ? " " : "") + bestResult.DisplayText;
              }
            }
          });

          const overall = count > 0 ? {
            accuracy: totalAccuracy / count, // For WordReading back-compat
            pronScore: totalPron / count,     // For WordReading back-compat
            pronunciationAssessment: {
              accuracyScore: totalAccuracy / count,
              fluencyScore: totalFluency / count,
              completenessScore: totalCompleteness / count,
              pronunciationScore: totalPron / count
            },
            words: allWords,
            recognizedText: recognizedText
          } : null;

          cleanupRecognizer();
          setIsProcessing(false);
          resolve(overall);
        },
        (err) => {
          console.error('Stop error:', err);
          cleanupRecognizer();
          setIsProcessing(false);
          resolve(null);
        }
      );
    });
  }, [isRecording, cleanupRecognizer]);

  return {
    isRecording,
    isProcessing,
    result,
    error,
    assessPronunciation,
    startContinuousAssessment,
    stopContinuousAssessment,
    cancelRecording
  };
};

export default useAzureSpeech;
