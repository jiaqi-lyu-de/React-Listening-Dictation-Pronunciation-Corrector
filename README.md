<h1 align="center">React Listening Dictation & Pronunciation Corrector 🎧</h1>

<p align="center">
  <em>An intelligent English listening dictation and precise pronunciation correction tool.</em><br/>
  <em>一款智能的英语听力听写与精准发音纠正评估工具。</em>
</p>

<p align="center">
  <a href="#english">English</a> •
  <a href="#中文">中文</a>
</p>

---

<h2 id="english">🇬🇧 English Documentation</h2>

### 📖 Introduction

**React Listening Dictation & Pronunciation Corrector** is an AI-powered application designed specifically for English learners. It perfectly combines listening dictation practice with professional-grade, phoneme-level pronunciation correction and assessment. By comparing the user's spoken input with the original audio/text, this tool helps users identify specific pronunciation errors and gracefully correct them to improve their English fluency.

### ✨ Key Features

- **🎧 Listening & Dictation**: Import your own audio files and practice dictation sentence by sentence.
- **📝 Text Diff Comparison**: Accurately compares user input against the reference text, highlighting missing, extra, and incorrect words.
- **🎙️ Pronunciation Assessment**: Integrated with Azure Cognitive Services (Speech SDK) to provide detailed feedback on accuracy, fluency, completeness, and prosody down to the phoneme level.
- **📊 History Tracking**: Automatically saves your practice history, allowing you to review your learning progress anytime.
- **📚 Vocabulary Book**: Save unfamiliar words during practice for future review.

### 🛠️ Tech Stack

- **Frontend**: React.js, Vanilla CSS, Web Speech API (if applicable)
- **Backend**: Node.js, Express.js
- **AI & Speech**: Microsoft Azure Cognitive Services (Speech SDK), OpenAI Whisper (via whisper-node)
- **Audio Processing**: FFmpeg, fluent-ffmpeg

### 🚀 Getting Started

#### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- An **Azure Speech Service** subscription key
- `ffmpeg` installed and available in your shell `PATH`
- Optional for `whisperx` mode: `python3` plus `whisperx`

#### 1. Environment Configuration

Create a root `.env` file from `.env.example`:

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8888
REACT_APP_AZURE_SPEECH_KEY=your_azure_speech_key_here
REACT_APP_AZURE_SPEECH_REGION=your_azure_region_here
```

Then create `back_node/.env` from `back_node/.env.example`:

```env
PORT=8888
```

Notes:

- Pronunciation assessment uses the browser Azure Speech SDK for lower-latency websocket streaming, so the `REACT_APP_AZURE_SPEECH_*` values are required in the frontend environment.
- The backend is only used for transcription, history, and word storage.
- `whisperx` mode additionally requires a Python environment where `python3 -m whisperx` works.

#### 2. Dependencies Setup

```bash
# Install frontend dependencies (root directory)
npm install

# Install backend dependencies
cd back_node
npm install
cd ..
```

#### 3. Run the Application

From the root directory, run:

```bash
npm run dev
```

The frontend will run at `http://localhost:3000` and the backend at `http://localhost:8888`.

### ⚠️ Demo / Deployment Note

This repo is currently optimized for local demo use. It assumes a separately running backend plus local system dependencies such as `ffmpeg`, and the browser-based Azure Speech SDK requires frontend environment variables for pronunciation assessment.

### 📂 Project Structure

```text
├── back_node/         # Node.js Backend
│   ├── db/            # Local JSON database & file storage (uploads/history)
│   ├── router_handler/# Express route handlers & logic
│   └── index.js       # Backend entry point
├── src/               # React Frontend
│   ├── components/    # Reusable UI components (DiffCom, HistorySelector, etc.)
│   └── App.js         # Frontend entry point
└── public/            # Static assets
```

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<h2 id="中文">🇨🇳 中文文档</h2>

### 📖 项目简介

**React Listening Dictation（智能听写发音评估）** 是一款专为英语学习者打造的 AI 赋能应用。它将听力听写练习与专业级的发音评估完美结合。通过对比用户的跟读语音与原文内容，本工具能够精准定位发音错误，帮助用户切实提高英语口语和听力水平。

### ✨ 核心特性

- **🎧 听力与听写练习**：支持导入本地音频文件，进行逐句的精听和听写练习。
- **📝 差异高亮对比**：精准对比用户输入的文本（或语音识别结果）与原文本，高亮显示漏词、多词和错词。
- **🎙️ AI 发音评估**：深度集成 Azure 语音服务（Speech SDK），提供包含准确度、流畅度、完整度在内的专业反馈，评估甚至可精确至**音标级别**。
- **📊 学习历史追踪**：自动在本地保存用户的每一次练习记录，方便随时回顾和对比发音进步轨迹。
- **📚 专属生词本**：在练习过程中遇到生词可一键保存，建立个性化词汇库。

### 🛠️ 技术栈

- **前端框架**：React.js, Vanilla CSS
- **后端服务**：Node.js, Express.js
- **AI 赋能**：Microsoft Azure Cognitive Services (Speech SDK), OpenAI Whisper (通过 whisper-node)
- **音频处理**：FFmpeg, fluent-ffmpeg

### 🚀 快速开始

#### 前置要求

- [Node.js](https://nodejs.org/) (建议版本 v18 及以上)
- 一个有效的 **Azure Speech Service** 密钥
- 已安装并可在命令行中访问的 `ffmpeg`
- 若要使用 `whisperx` 模式，还需要 `python3` 和 `whisperx`

#### 1. 环境变量配置

在项目根目录创建 `.env` 文件，可直接参考根目录下的 `.env.example`：

```env
REACT_APP_API_BASE_URL=http://127.0.0.1:8888
REACT_APP_AZURE_SPEECH_KEY=你的 Azure Speech 密钥
REACT_APP_AZURE_SPEECH_REGION=你的 Azure 区域（例如 eastus）
```

然后在 `back_node` 目录下创建 `.env` 文件，可参考 `back_node/.env.example`：

```env
PORT=8888
```

说明：

- 当前发音评测统一使用前端 Azure Speech SDK，以获得更低延迟的 websocket 实时体验，因此需要配置 `REACT_APP_AZURE_SPEECH_*`。
- 后端主要负责转写、历史记录和单词池存储。
- 如果要启用 `whisperx` 模式，还需要确保 `python3 -m whisperx` 可以在本机正常执行。

#### 2. 安装依赖

```bash
# 安装前端依赖（根目录）
npm install

# 安装后端依赖
cd back_node
npm install
cd ..
```

#### 3. 启动应用

在项目根目录下运行：

```bash
npm run dev
```

前端将运行在 `http://localhost:3000`，后端运行在 `http://localhost:8888`。

### ⚠️ 演示 / 部署说明

这个仓库当前更适合本地演示。项目仍然依赖单独运行的后端服务和本地系统工具（例如 `ffmpeg`），同时发音评测依赖浏览器侧 Azure Speech SDK。

### 📂 项目结构

```text
├── back_node/         # Node.js 后端端点
│   ├── db/            # 数据库 (JSON/文件存储，例如上传历史和本地词库)
│   ├── router_handler/# 路由处理与核心控制器逻辑
│   └── index.js       # 后端服务入口文件
├── src/               # React 前端代码
│   ├── components/    # 核心组件库 (DiffCom, HistorySelector, WordSidebar 等)
│   └── App.js         # 前端入口
└── public/            # 静态资源文件
```

### 📄 开源协议

本项目采用 MIT 开源协议 - 详情请查看 [LICENSE](LICENSE) 文件。
