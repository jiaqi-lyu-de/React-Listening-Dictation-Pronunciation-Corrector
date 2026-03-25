const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../db');
const WORDS_FILE = path.join(DB_DIR, 'words.json');
const ATTEMPTS_DIR = path.join(DB_DIR, 'attempts');

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(ATTEMPTS_DIR)) fs.mkdirSync(ATTEMPTS_DIR, { recursive: true });

/**
 * Save entire words.json file (used by WordReading delete + persist)
 */
exports.saveWordsFile = (req, res) => {
    try {
        const words = req.body;
        if (!Array.isArray(words)) {
            return res.status(400).json({ error: 'Expected array of words' });
        }

        // Also save to public/words.json so that the frontend can reload
        const publicWordsPath = path.resolve(__dirname, '../../public/words.json');
        fs.writeFileSync(publicWordsPath, JSON.stringify(words, null, 2), 'utf-8');

        res.json({ success: true });
    } catch (e) {
        console.error('Save words file error:', e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * Record low-score pronunciation attempt (one per word per day)
 */
exports.recordAttempt = (req, res) => {
    try {
        const data = req.body;
        const dateStr = new Date().toISOString().split('T')[0];
        const filePath = path.join(ATTEMPTS_DIR, `${dateStr}.json`);

        let existing = [];
        if (fs.existsSync(filePath)) {
            existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }

        // Check if word already exists in today's file
        const exists = existing.some(
            item => item.word.toLowerCase() === data.word.toLowerCase()
        );

        if (!exists) {
            existing.push(data);
            fs.writeFileSync(filePath, JSON.stringify(existing, null, 4), 'utf-8');
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Record attempt error:', e);
        res.status(500).json({ error: e.message });
    }
};
