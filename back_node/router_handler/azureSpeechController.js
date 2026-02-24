const sdk = require('microsoft-cognitiveservices-speech-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pronunciation-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /wav|mp3|ogg|webm|m4a/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'));
        }
    }
});

// Middleware for audio upload
exports.uploadMiddleware = upload.single('audio');

// Pronunciation assessment handler
exports.assessPronunciation = async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({
                error: 'No audio file provided',
                message: 'Please upload an audio file for pronunciation assessment'
            });
        }

        if (!req.body.referenceText) {
            return res.status(400).json({
                error: 'No reference text provided',
                message: 'Please provide the reference text for comparison'
            });
        }

        const audioFile = req.file.path;
        const referenceText = req.body.referenceText;

        // Validate Azure credentials
        const subscriptionKey = process.env.AZURE_SPEECH_KEY;
        const serviceRegion = process.env.AZURE_SPEECH_REGION;

        if (!subscriptionKey || !serviceRegion) {
            return res.status(500).json({
                error: 'Azure configuration missing',
                message: 'Azure Speech API credentials are not configured properly'
            });
        }

        // Configure Azure Speech SDK
        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        speechConfig.speechRecognitionLanguage = 'en-US';

        // Configure pronunciation assessment
        const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
            referenceText,
            sdk.PronunciationAssessmentGradingSystem.HundredMark,
            sdk.PronunciationAssessmentGranularity.Phoneme,
            true // Enable miscue (detect extra or missing words)
        );

        // Use IPA for phonemes
        pronunciationConfig.phonemeAlphabet = "IPA";

        // Create audio config from file (Azure SDK supports various audio formats)
        const pushStream = sdk.AudioInputStream.createPushStream();
        const audioData = fs.readFileSync(audioFile);
        pushStream.write(audioData);
        pushStream.close();

        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        // Create speech recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        pronunciationConfig.applyTo(recognizer);

        // Perform pronunciation assessment
        const assessmentResult = await new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync(
                (result) => {
                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

                        // Parse detailed results
                        const detailedResult = JSON.parse(result.properties.getProperty(
                            sdk.PropertyId.SpeechServiceResponse_JsonResult
                        ));

                        resolve({
                            recognizedText: result.text,
                            pronunciationAssessment: {
                                accuracyScore: pronunciationResult.accuracyScore,
                                fluencyScore: pronunciationResult.fluencyScore,
                                completenessScore: pronunciationResult.completenessScore,
                                prosodyScore: pronunciationResult.prosodyScore || null,
                                pronunciationScore: pronunciationResult.pronunciationScore
                            },
                            words: detailedResult.NBest[0].Words.map(word => ({
                                word: word.Word,
                                accuracyScore: word.PronunciationAssessment.AccuracyScore,
                                errorType: word.PronunciationAssessment.ErrorType,
                                syllables: word.Syllables ? word.Syllables.map(syllable => ({
                                    syllable: syllable.Syllable,
                                    accuracyScore: syllable.PronunciationAssessment.AccuracyScore
                                })) : [],
                                phonemes: word.Phonemes ? word.Phonemes.map(phoneme => ({
                                    phoneme: phoneme.Phoneme,
                                    accuracyScore: phoneme.PronunciationAssessment.AccuracyScore
                                })) : []
                            }))
                        });
                    } else if (result.reason === sdk.ResultReason.NoMatch) {
                        reject(new Error('No speech could be recognized'));
                    } else if (result.reason === sdk.ResultReason.Canceled) {
                        const cancellationDetails = sdk.CancellationDetails.fromResult(result);
                        console.error('CANCELED: Reason=' + cancellationDetails.reason);
                        if (cancellationDetails.reason === sdk.CancellationReason.Error) {
                            console.error('CANCELED: ErrorCode=' + cancellationDetails.ErrorCode);
                            console.error('CANCELED: ErrorDetails=' + cancellationDetails.errorDetails);
                            reject(new Error(`Speech recognition canceled: ${cancellationDetails.errorDetails}`));
                        } else {
                            reject(new Error(`Speech recognition canceled: ${cancellationDetails.reason}`));
                        }
                    } else {
                        reject(new Error('Speech recognition failed with reason: ' + result.reason));
                    }
                },
                (error) => {
                    reject(error);
                }
            );
        });

        // Clean up
        recognizer.close();

        // Delete uploaded file after processing
        fs.unlinkSync(audioFile);

        // Send response
        res.json({
            success: true,
            result: assessmentResult
        });

    } catch (error) {
        console.error('Pronunciation assessment error:', error);
        try {
            fs.appendFileSync(path.join(__dirname, '../error.log'), `${new Date().toISOString()} - Error: ${error.message}\nStack: ${error.stack}\n`);
        } catch (e) { console.error('Failed to write to error log', e); }

        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Pronunciation assessment failed',
            message: error.message || 'An error occurred during pronunciation assessment'
        });
    }
};
