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
- **Audio Processing**: FFmpeg

### 🚀 Getting Started

#### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [FFmpeg](https://ffmpeg.org/download.html) installed and added to your system environment variables.
- An **Azure Speech Service** subscription key.

#### 1. Environment Configuration

Navigate to the `back_node` directory and create a `.env` file (you can copy `.env.example`):

```env
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=your_azure_region_here
```

#### 2. Backend Setup

```bash
cd back_node
npm install
npm start
```
The backend server will run at `http://localhost:8888`.

#### 3. Frontend Setup

Open a new terminal and navigate to the project root directory:

```bash
npm install
npm start
```
The frontend application will run at `http://localhost:3000`.

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
- **音频处理**：FFmpeg

### 🚀 快速开始

#### 前置要求

- [Node.js](https://nodejs.org/) (建议版本 v16 及以上)
- 必须安装 [FFmpeg](https://ffmpeg.org/download.html) 并将其添加到系统环境变量中（用于音频格式转换）。
- 一个有效的 **Azure Speech Service** 密钥。

#### 1. 环境变量配置

进入 `back_node` 目录下，创建一个 `.env` 文件（可以参考现有的 `.env.example`）：

```env
AZURE_SPEECH_KEY=你的Azure核心密钥
AZURE_SPEECH_REGION=你的Azure区域 (例如 eastus)
```

#### 2. 启动后端服务

```bash
cd back_node
npm install
npm start
```
后端服务启动后，将运行在 `http://localhost:8888`。

#### 3. 启动前端页面

打开一个新的终端窗口，回到项目根目录：

```bash
npm install
npm start
```
前端应用启动后，将自动在浏览器中打开 `http://localhost:3000`。

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
