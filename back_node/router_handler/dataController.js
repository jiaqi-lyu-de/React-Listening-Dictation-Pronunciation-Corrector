const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../db');
const WORDS_FILE = path.join(DB_DIR, 'words.json');
const HISTORY_DIR = path.join(DB_DIR, 'history');

// Ensure directories exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);
if (!fs.existsSync(WORDS_FILE)) fs.writeFileSync(WORDS_FILE, '[]');

exports.saveWords = (req, res) => {
    try {
        const newWords = req.body.words; // Expecting array of objects or strings
        if (!Array.isArray(newWords)) {
            return res.status(400).send({ error: 'Invalid data format. Expected "words" array.' });
        }

        const currentData = JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'));

        let updatedData = [...currentData];
        newWords.forEach(nw => {
            // Check for duplicate based on 'word' property if object, or direct value if string
            const isDuplicate = updatedData.some(existing => {
                if (typeof existing === 'string' && typeof nw === 'string') return existing === nw;
                if (typeof existing === 'object' && typeof nw === 'object') return existing.word === nw.word;
                return false;
            });

            if (!isDuplicate) {
                updatedData.push(nw);
            }
        });

        fs.writeFileSync(WORDS_FILE, JSON.stringify(updatedData, null, 2));
        res.send({ success: true, count: updatedData.length });
    } catch (error) {
        console.error('Error saving words:', error);
        res.status(500).send({ error: 'Failed to save words' });
    }
};

exports.getHistory = (req, res) => {
    try {
        const files = fs.readdirSync(HISTORY_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(HISTORY_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    created: stats.birthtime,
                    size: stats.size
                };
            })
            // Sort by creation time desc
            .sort((a, b) => b.created - a.created);

        res.send({ success: true, history: files });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).send({ error: 'Failed to get history' });
    }
};

exports.getHistoryItem = (req, res) => {
    try {
        const { filename } = req.params;
        // Basic path traversal protection
        const cleanFilename = path.basename(filename);
        const filePath = path.join(HISTORY_DIR, cleanFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send({ error: 'History item not found' });
        }

        const data = fs.readFileSync(filePath, 'utf8');
        res.send(JSON.parse(data));
    } catch (error) {
        console.error('Error reading history item:', error);
        res.status(500).send({ error: 'Failed to read history item' });
    }
};
