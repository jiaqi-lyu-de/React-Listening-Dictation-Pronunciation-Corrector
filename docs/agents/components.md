# Components

This file defines what each component owns. If a task must cross these boundaries, the task should say so explicitly.

## `AudioControls`

Files:

- `src/components/AudioControls/AudioControls.jsx`
- `src/components/AudioControls/AudioControls.css`

Purpose:

- audio upload and history restore entry point
- audio playback controls
- sentence-level timing synchronization
- transcription method selection

Owns:

- local upload/loading/error state
- audio element lifecycle
- replay behavior and sentence time alignment

Must not own:

- dictation scoring logic
- diff result rendering
- global weak-word aggregation

## `HistorySelector`

Files:

- `src/components/HistorySelector/HistorySelector.jsx`
- `src/components/HistorySelector/HistorySelector.css`

Purpose:

- browse and restore saved practice history

Owns:

- history selection UI

Must not own:

- top-level session orchestration after selection

## `ProgressBar`

Files:

- `src/components/ProgressBar/ProgressBar.jsx`
- `src/components/ProgressBar/ProgressBar.css`

Purpose:

- summarize dictation progress

Owns:

- current sentence / total sentence progress display
- high-level accuracy summary display

Must not own:

- navigation logic
- scoring persistence

## `DiffCom`

Files:

- `src/components/DiffCom/DiffCom.jsx`
- `src/components/DiffCom/DiffCom.css`

Purpose:

- main dictation practice surface
- compare user input with reference text
- trigger next-step dictation flow
- emit pronunciation results upward

Owns:

- current sentence answer input
- diff generation and feedback presentation
- dictation submission behavior for the current sentence

Must not own:

- transcript-wide navigation state
- long-term history storage

## `DiffHistory`

Files:

- `src/components/DiffHistory/DiffHistory.jsx`
- `src/components/DiffHistory/DiffHistory.css`

Purpose:

- review past dictation attempts within the current session

Owns:

- presentation of per-sentence attempt history

Must not own:

- mutation of upstream history rules

## `Transcripts`

Files:

- `src/components/Transcripts/Transcripts.jsx`
- `src/components/Transcripts/Transcripts.css`

Purpose:

- sentence list and selection sidebar

Owns:

- transcript list rendering
- current sentence highlight
- sentence click selection UI

Must not own:

- audio playback state
- scoring rules

## `ManualPronunciation`

Files:

- `src/components/ManualPronunciation/ManualPronunciation.jsx`
- `src/components/ManualPronunciation/ManualPronunciation.css`

Purpose:

- freeform reading practice mode
- text input and selection-based pronunciation flow

Owns:

- local reading text state
- selection flow for focused assessment
- emission of weak-word results upward

Must not own:

- global weak-word persistence
- dictation-specific assumptions

## `PronunciationResults`

Files:

- `src/components/PronunciationResults/PronunciationResults.jsx`
- `src/components/PronunciationResults/PronunciationResults.css`

Purpose:

- render pronunciation scoring details
- expose weak-word capture candidates

Owns:

- score breakdown presentation
- word and phoneme result display

Must not own:

- recording lifecycle
- upstream persistence policy

## `SpeechAssessor`

Files:

- `src/components/SpeechAssessor/SpeechAssessor.jsx`
- `src/components/SpeechAssessor/SpeechAssessor.css`

Purpose:

- encapsulate browser speech assessment interactions

Owns:

- UI and local control flow directly related to assessment execution

Must not own:

- page-wide orchestration concerns

## `WordSidebar`

Files:

- `src/components/WordSidebar/WordSidebar.jsx`
- `src/components/WordSidebar/WordSidebar.css`

Purpose:

- auxiliary word-review surface for dictation flows

Owns:

- sidebar-level word review presentation

Must not own:

- sentence-reading page behavior
- top-level persistence policy

## `WordReading`

Files:

- `src/components/WordReading/WordReading.jsx`
- `src/components/WordReading/WordReading.css`

Purpose:

- dedicated weak-word review mode
- combine dictation-derived and reading-derived weak words

Owns:

- review mode UI
- empty or partial history states
- focused repetition flow for collected weak words

Must not own:

- collection of weak words from other modes
- upstream localStorage persistence rules
