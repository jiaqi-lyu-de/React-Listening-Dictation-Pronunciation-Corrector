const whisperModule = require('whisper-node');
const whisper = whisperModule.default || whisperModule.whisper;
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

const multer = require('multer');
const TEMP_UPLOAD_DIR = path.join(__dirname, '../db/tmp');
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}
const upload = multer({ dest: TEMP_UPLOAD_DIR });
exports.uploadMiddleware = upload.single('audio');

const WHISPERX_SERVICE_URL = (process.env.WHISPERX_SERVICE_URL || 'http://127.0.0.1:8008').replace(/\/+$/, '');
const WHISPERX_MODEL = process.env.WHISPERX_MODEL || 'small';
const WHISPERX_DEVICE = process.env.WHISPERX_DEVICE || 'cpu';
const WHISPERX_COMPUTE_TYPE = process.env.WHISPERX_COMPUTE_TYPE || 'int8';

// Time formatter helper for converting seconds to HH:MM:SS.mmm
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const mapSegmentsToTranscript = (segments = []) => segments.map((segment) => ({
    start: formatTime(segment.start),
    end: formatTime(segment.end),
    speech: segment.text.trim()
}));

const runWhisperXViaService = async (audioPath) => {
    let response;
    try {
        response = await fetch(`${WHISPERX_SERVICE_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_path: audioPath,
                model_name: WHISPERX_MODEL,
                device: WHISPERX_DEVICE,
                compute_type: WHISPERX_COMPUTE_TYPE,
                language: 'en'
            })
        });
    } catch (error) {
        throw new Error(
            `WhisperX service is unavailable at ${WHISPERX_SERVICE_URL}. Start the Python service with "python3 python_whisperx/app.py".`
        );
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.detail || payload.error || 'WhisperX service request failed');
    }

    if (!Array.isArray(payload.segments)) {
        throw new Error('WhisperX service returned an invalid response');
    }

    return mapSegmentsToTranscript(payload.segments);
};

exports.whisperxHealth = async (_req, res) => {
    try {
        const response = await fetch(`${WHISPERX_SERVICE_URL}/health`);
        if (!response.ok) {
            return res.status(503).send({
                success: false,
                error: 'WhisperX service responded with an unhealthy status.'
            });
        }

        return res.send({ success: true });
    } catch (error) {
        return res.status(503).send({
            success: false,
            error: `WhisperX service is unavailable at ${WHISPERX_SERVICE_URL}.`
        });
    }
};

exports.toText = async (req, res) => {
    // 1. Check if file exists in request
    if (!req.file) {
        return res.status(400).send({ error: 'No audio file uploaded' });
    }

    const inputFile = path.resolve(req.file.path); // Multer's temporary path
    const outputFile = path.resolve(`${inputFile}.wav`);

    try {
        // 2. Convert MP3 to WAV (16kHz mono)
        // whisper-node is strict about 16000Hz sampling rate
        console.log(`Converting uploaded file ${req.file.originalname} to WAV...`);
        await new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .audioFrequency(16000)
                .audioChannels(1)
                .on('end', resolve)
                .on('error', reject)
                .save(outputFile);
        });

        // 3. Choose Transcription Method
        const method = req.body.method || 'whisper-node';
        let transcript = [];

        if (method === 'whisperx') {
            console.log(`Requesting whisperx service for ${outputFile}...`);
            transcript = await runWhisperXViaService(outputFile);
        } else {
            // whisper-node fallback
            const options = {
                modelName: "base.en",
                whisperOptions: {
                    language: 'en',
                    gen_file_txt: false,
                    gen_file_subtitle: false,
                    word_timestamps: false
                },
            };
            transcript = await whisper(outputFile, options);
        }

        if (!transcript || transcript.length === 0) {
            throw new Error('Transcription returned empty result');
        }

        // Save to history storage
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const audioFilename = `${timestamp}.wav`;
        const historyFilename = `analysis_${timestamp}.json`;

        // Move wav file to uploads directory
        const uploadsDir = path.join(__dirname, '../db/uploads');
        const savedAudioPath = path.join(uploadsDir, audioFilename);

        ensureDirectory(uploadsDir);

        // Rename/Move the wav file
        fs.renameSync(outputFile, savedAudioPath);

        const historyData = {
            originalName: req.file.originalname,
            audioFilename: audioFilename,
            timestamp: new Date().toISOString(),
            transcript: transcript
        };

        const historyPath = path.join(__dirname, '../db/history', historyFilename);

        const historyDir = path.dirname(historyPath);
        ensureDirectory(historyDir);

        fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));

        // 5. Success Response
        res.send({
            success: true,
            originalName: req.file.originalname,
            transcript: transcript,
            historyFile: historyFilename,
            audioUrl: `/uploads/${audioFilename}`
        });

    } catch (error) {
        console.error('Processing Error:', error);
        res.status(500).send({
            error: 'Failed to process audio',
            details: error.message
        });
    } finally {
        // 6. CLEANUP: Delete input temporary file
        // outputFile is already moved or should be deleted if error
        if (fs.existsSync(inputFile)) {
            fs.unlink(inputFile, (err) => {
                if (err) console.error(`Error deleting temp file ${inputFile}:`, err);
            });
        }
        // If error occurred and outputFile still exists (wasn't moved), delete it
        if (fs.existsSync(outputFile)) {
            fs.unlink(outputFile, (err) => {
                if (err) console.error(`Error deleting temp file ${outputFile}:`, err);
            });
        }
    }
};
