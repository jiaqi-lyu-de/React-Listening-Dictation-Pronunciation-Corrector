require('dotenv').config();

const express = require('express')
const path = require('path')
const cors = require('cors')
const router = express.Router()
const app = express()
const whisperController = require('./router_handler/whisperController');
const azureSpeechController = require('./router_handler/azureSpeechController');
const dataController = require('./router_handler/dataController');

app.use(cors())
app.use(express.json()) // Parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, 'db/uploads'))); // Serve uploaded audio files
router.post('/transcribe', whisperController.uploadMiddleware, whisperController.toText);
router.post('/pronunciation-assessment', azureSpeechController.uploadMiddleware, azureSpeechController.assessPronunciation);

// Data Routes
router.post('/save-words', dataController.saveWords);
router.get('/history', dataController.getHistory);
router.get('/history/:filename', dataController.getHistoryItem);
app.use(router)
app.listen(8888, function () {
  console.log('server is running at http://127.0.0.1:8888')
})

module.exports = router