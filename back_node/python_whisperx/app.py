import os
from typing import Dict, Tuple

os.environ["TORCH_FORCE_WEIGHTS_ONLY_LOAD"] = "0"

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# 补丁：强制 torch.load 的 weights_only 默认为 False，解决 PyTorch 2.6+ 加载旧模型报错的问题
# 必须在导入 whisperx 之前进行补丁，以确保所有依赖项都使用 patched 版本
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load
torch.serialization.load = _patched_torch_load

# 允许加载 omegaconf 相关的安全全局变量（作为双重保险）
try:
    import omegaconf
    from omegaconf.listconfig import ListConfig
    from omegaconf.dictconfig import DictConfig
    from omegaconf.base import ContainerMetadata, Node, Metadata

    torch.serialization.add_safe_globals([
        ListConfig, DictConfig, ContainerMetadata, Node, Metadata
    ])
except (ImportError, AttributeError):
    pass

import whisperx

app = FastAPI(title="WhisperX Service")

_model_cache: Dict[Tuple[str, str, str, str], object] = {}
_align_model_cache: Dict[Tuple[str, str], object] = {}


class TranscribeRequest(BaseModel):
    audio_path: str
    model_name: str = "small"
    device: str = "cpu"
    compute_type: str = "int8"
    language: str = "en"
    batch_size: int = 16


def get_model(model_name: str, device: str, compute_type: str, language: str):
    cache_key = (model_name, device, compute_type, language)
    if cache_key not in _model_cache:
        _model_cache[cache_key] = whisperx.load_model(
            model_name,
            device,
            compute_type=compute_type,
            language=language,
        )
    return _model_cache[cache_key]


def get_align_model(language_code: str, device: str):
    cache_key = (language_code, device)
    if cache_key not in _align_model_cache:
        # Load alignment model and metadata
        model_a, metadata = whisperx.load_align_model(language_code=language_code, device=device)
        _align_model_cache[cache_key] = (model_a, metadata)
    return _align_model_cache[cache_key]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/transcribe")
def transcribe(request: TranscribeRequest):
    if not os.path.exists(request.audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        # 使用 context manager 确保安全全局变量被允许
        from omegaconf.listconfig import ListConfig
        from omegaconf.dictconfig import DictConfig
        from omegaconf.base import ContainerMetadata, Node, Metadata
        safe_list = [ListConfig, DictConfig, ContainerMetadata, Node, Metadata]

        with torch.serialization.safe_globals(safe_list):
            model = get_model(
                request.model_name,
                request.device,
                request.compute_type,
                request.language,
            )
            audio = whisperx.load_audio(request.audio_path)
            
            # 1. 基础转录
            result = model.transcribe(audio, batch_size=request.batch_size)

            # 2. 对齐处理 (Alignment)
            # 通过对齐，WhisperX 会根据单词边界和标点将长句重新切割成更合理的短句
            try:
                lang_code = result.get("language", request.language)
                model_a, metadata = get_align_model(lang_code, request.device)
                result = whisperx.align(
                    result["segments"],
                    model_a,
                    metadata,
                    audio,
                    request.device,
                    return_char_alignments=False
                )
            except Exception as align_error:
                print(f"Alignment failed: {align_error}")
                # 对齐失败则降级使用原始分段

            segments = result.get("segments", [])

        return {
            "language": result.get("language", request.language),
            "segments": [
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip(),
                }
                for segment in segments
            ],
        }
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error during transcription: {error}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error)) from error


if __name__ == "__main__":
    host = os.getenv("WHISPERX_HOST", "127.0.0.1")
    port = int(os.getenv("WHISPERX_PORT", "8008"))
    uvicorn.run(app, host=host, port=port)
