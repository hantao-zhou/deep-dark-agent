./llama.cpp/build/bin/llama-server \
  -m models/ggml/qwen3vl-30b/Qwen3-VL-30B-A3B-Instruct-UD-Q6_K_XL.gguf \
  --mmproj models/ggml/qwen3vl-30b/mmproj-BF16.gguf \
  -c 8192 -ngl 99 -t 32 \
  --flash-attn on \
  --port 8080 --host 0.0.0.0 \
  --api-key local-llama \
  --jinja