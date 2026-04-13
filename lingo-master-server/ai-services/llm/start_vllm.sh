#!/bin/bash
# LingoMaster LLM Service - vLLM startup script
# Uses Qwen2-7B-Instruct-GPTQ-Int4 model with OpenAI-compatible API

MODEL_NAME="Qwen/Qwen2-7B-Instruct-GPTQ-Int4"
PORT=8000
MAX_MODEL_LEN=4096
GPU_MEMORY_UTILIZATION=0.85

echo "Starting vLLM with model: ${MODEL_NAME}"
echo "Port: ${PORT}"

python -m vllm.entrypoints.openai.api_server \
    --model "${MODEL_NAME}" \
    --port "${PORT}" \
    --host "0.0.0.0" \
    --max-model-len "${MAX_MODEL_LEN}" \
    --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \
    --served-model-name "qwen2-7b" \
    --trust-remote-code \
    --dtype "half" \
    --quantization "gptq"
