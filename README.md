# React Listening Dictation & Pronunciation Corrector

An AI-assisted English listening and pronunciation training workspace built with React, Azure Speech SDK, and a lightweight Node backend.

一款用于英语精听、听写、跟读和问题词复盘的训练工作台，基于 React、Azure Speech SDK 和 Node.js 构建。

## Overview

This project combines three learning loops in a single interface:

- `Dictation Studio`: upload audio, replay sentence by sentence, type what you hear, and compare against the reference text
- `Sentence Reading`: paste arbitrary text, assess pronunciation for the full passage or a highlighted fragment
- `Word Review`: revisit problem words captured from different practice modes and focus on repeated weak spots

It is designed as a local-first demo project for showcasing:

- real-time browser speech assessment with Azure Speech SDK over websocket
- multi-mode language-learning UX in a single-page React app
- lightweight backend support for transcription, history persistence, and word storage

## Why This Project Stands Out

- It is not just a speech demo. It connects transcription, dictation feedback, pronunciation scoring, and review loops into one workflow.
- Pronunciation assessment runs in the browser with Azure Speech SDK, which keeps interaction latency low for repeated speaking practice.
- Listening history, problem words, and word review are tied together, so the app supports iterative learning instead of one-off API calls.
- The UI is intentionally product-shaped rather than tutorial-shaped: mode switching, history restore, focused practice panels, and review surfaces are all integrated.

## Showcase Highlights

### 1. Dictation Workflow

- Upload audio and transcribe it with `whisper-node` or `whisperx`
- Replay sentence audio quickly while typing your answer
- Unlock the original sentence only after answering
- Inspect diff feedback, pronunciation results, and per-session history

### 2. Pronunciation Feedback

- Uses Azure Speech SDK in the frontend for low-latency websocket recognition
- Returns word-level and phoneme-level scoring
- Supports both full-sentence reading and focused single-word practice

### 3. Review System

- Captures problematic words from dictation and sentence-reading separately
- Stores review history by date
- Lets users re-open historical weak-word sets for targeted repetition

## Architecture

```mermaid
flowchart LR
    A[React UI] --> B[Mode Switching / Practice Flows]
    B --> C[Azure Speech SDK in Browser]
    B --> D[Node / Express Backend]
    D --> E[Whisper / WhisperX Transcription]
    D --> F[Local JSON Storage]
    F --> G[History]
    F --> H[Word Pool]
    F --> I[Attempts]
```

### Runtime Responsibilities

- `Frontend`
  - dictation interaction
  - sentence reading interaction
  - low-latency pronunciation assessment with Azure Speech SDK
  - review and word-practice UI
- `Backend`
  - audio upload and transcription
  - local history persistence
  - centralized word storage
  - practice attempt logging

## Tech Stack

- `Frontend`: React 19, vanilla CSS, browser media APIs
- `Speech`: Azure Cognitive Services Speech SDK
- `Backend`: Node.js, Express
- `Transcription`: whisper-node, optional whisperx
- `Audio tooling`: ffmpeg-static, fluent-ffmpeg
- `Persistence`: local JSON files under `back_node/db`

## Project Structure

```text
├── back_node/
│   ├── db/                  # local storage for words, history, attempts, uploads
│   ├── router_handler/      # transcription and persistence handlers
│   └── index.js             # backend entry
├── src/
│   ├── components/          # feature UI components
│   ├── utils/               # shared hooks and network helpers
│   ├── App.js               # app shell and mode orchestration
│   └── App.css              # global product styling
└── public/
```

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) `v18+`
- an Azure Speech resource
- optional for `whisperx` mode: `python3`, a virtualenv, and the Python WhisperX service dependencies

### Environment Variables

Create root `.env` from `.env.example`:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8888
REACT_APP_AZURE_SPEECH_KEY=your_azure_speech_key_here
REACT_APP_AZURE_SPEECH_REGION=your_azure_region_here
```

Create `back_node/.env` from `back_node/.env.example`:

```env
PORT=8888
WHISPERX_SERVICE_URL=http://127.0.0.1:8008
WHISPERX_MODEL=small
WHISPERX_DEVICE=cpu
WHISPERX_COMPUTE_TYPE=int8
```

### Install

```bash
npm install
cd back_node && npm install && cd ..
```

If you want to use `whisperx`, start the Python service separately:

```bash
cd back_node
python3 -m venv .venv
source .venv/bin/activate
pip install -r python_whisperx/requirements.txt
python3 python_whisperx/app.py
```

The Python WhisperX service sets `TORCH_FORCE_WEIGHTS_ONLY_LOAD=0` internally to stay compatible with newer PyTorch defaults.

### Run

```bash
npm run dev
```

- frontend: `http://localhost:3000`
- backend: `http://localhost:8888`
- whisperx service: `http://127.0.0.1:8008`

## Demo Notes

- This repository is optimized for local demonstration and portfolio review.
- Because pronunciation assessment uses the browser Azure SDK, frontend Azure env vars are required during local development.
- The backend is intentionally lightweight and stores data locally for easier demo setup.

## Suggested Portfolio Additions

If you are using this repository in interviews or GitHub portfolio reviews, the next improvements with the highest presentation value are:

1. add screenshots or a short demo GIF for all three modes
2. add one architecture image or annotated interaction flow
3. add a short section on engineering tradeoffs, especially why frontend websocket speech was chosen
4. add a few smoke tests to strengthen engineering credibility

---

## 中文说明

### 项目定位

这是一个面向英语学习场景的 AI 训练工作台，不是单点功能 demo。它把以下三个训练回路放到了一个统一界面里：

- `听力听写`：上传音频后逐句回放、输入答案、查看差异
- `句子阅读`：粘贴任意文本，对整段或局部高亮片段做发音评测
- `问题词复盘`：把练习中出现的错误词收集起来，按来源和日期回看

### 项目亮点

- 使用前端 Azure Speech SDK，通过 websocket 做低延迟发音评测
- 听写、发音、历史记录、问题词复盘形成闭环，而不是孤立 API 演示
- 交互是产品化结构，不是教程式页面拼接
- 后端职责清晰，只负责转写、历史持久化和统一单词池存储

### 技术栈

- `前端`：React 19、Vanilla CSS、浏览器媒体能力
- `语音评测`：Azure Speech SDK
- `后端`：Node.js、Express
- `转写`：whisper-node，可选 whisperx
- `音频处理`：ffmpeg-static、fluent-ffmpeg
- `存储`：`back_node/db` 下的本地 JSON 文件

### 本地启动

#### 前置条件

- Node.js `v18+`
- 可用的 Azure Speech 服务
- 若要使用 `whisperx` 模式，还需要 `python3`、虚拟环境和 Python WhisperX 服务依赖

#### 环境变量

根目录 `.env`：

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8888
REACT_APP_AZURE_SPEECH_KEY=你的 Azure Speech 密钥
REACT_APP_AZURE_SPEECH_REGION=你的 Azure 区域
```

`back_node/.env`：

```env
PORT=8888
WHISPERX_SERVICE_URL=http://127.0.0.1:8008
WHISPERX_MODEL=small
WHISPERX_DEVICE=cpu
WHISPERX_COMPUTE_TYPE=int8
```

#### 安装与运行

```bash
npm install
cd back_node && npm install && cd ..
npm run dev
```

若要启用 `whisperx`，还需要单独启动 Python 服务：

```bash
cd back_node
python3 -m venv .venv
source .venv/bin/activate
pip install -r python_whisperx/requirements.txt
python3 python_whisperx/app.py
```

Python WhisperX 服务内部已设置 `TORCH_FORCE_WEIGHTS_ONLY_LOAD=0`，用于兼容较新的 PyTorch 默认加载行为。

前端运行于 `http://localhost:3000`，Node 后端运行于 `http://localhost:8888`，WhisperX Python 服务运行于 `http://127.0.0.1:8008`。

注意：WhisperX Python 服务读取的是 Node 后端转码后的本地绝对路径音频文件，因此必须和 Node 后端运行在同一台机器上。

### 用于作品集展示时，建议继续补充

1. 三个模式各放一张截图或一段 GIF
2. 增加一张架构图或流程图
3. 写一段技术取舍说明，例如为什么发音评测放在前端
4. 增加最小测试，提升工程可信度

## License

MIT. See [LICENSE](LICENSE).
