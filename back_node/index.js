require('dotenv').config();

const express = require('express')
const path = require('path')
const cors = require('cors')
const router = express.Router()
const app = express()
const whisperController = require('./router_handler/whisperController');
const dataController = require('./router_handler/dataController');
const wordController = require('./router_handler/wordController');
const PORT = process.env.PORT || 8888;

app.use(cors())
app.use(express.json()) // Parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, 'db/uploads'))); // Serve uploaded audio files
router.post('/transcribe', whisperController.uploadMiddleware, whisperController.toText);

// Data Routes
router.post('/save-words', dataController.saveWords);
router.get('/words', dataController.getWords);
router.get('/history', dataController.getHistory);
router.get('/history/:filename', dataController.getHistoryItem);

// Word Reading Routes
router.post('/save-words-file', wordController.saveWordsFile);
router.post('/record-attempt', wordController.recordAttempt);
app.use(router)
app.listen(PORT, function () {
  console.log(`server is running at http://127.0.0.1:${PORT}`)
})

module.exports = router
