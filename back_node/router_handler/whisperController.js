
const whisperModule = require('whisper-node');
const whisper = whisperModule.default || whisperModule.whisper;
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
exports.uploadMiddleware = upload.single('audio');

exports.toText = async (req, res) => {
    // 1. Check if file exists in request
    if (!req.file) {
        return res.status(400).send({ error: 'No audio file uploaded' });
    }

    const inputFile = req.file.path; // Multer's temporary path
    const outputFile = `${inputFile}.wav`;

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

        // 3. Whisper Options
        const options = {
            modelName: "base.en",
            whisperOptions: {
                language: 'en',
                gen_file_txt: false,
                gen_file_subtitle: false,
                word_timestamps: false
            },
        };

        // 4. Run Transcription
        const transcript = await whisper(outputFile, options);

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

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

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
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }

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