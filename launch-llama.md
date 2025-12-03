llama-b7225-bin-win-hip-radeon-x64\llama-server.exe `
  -m models/ggml/Qwen3-VL-30B-A3B-Instruct-UD-Q6_K_XL.gguf `
  --mmproj models/ggml/mmproj-BF16.gguf `
  -c 102400 -ngl 99 -t 32 `
  --flash-attn on `
  --port 8080 --host 0.0.0.0 `
  --api-key local-llama `
  --jinja


./llama.cpp/build/bin/llama-server \
  -m models/ggml/Qwen3-VL-30B-A3B-Instruct-UD-Q6_K_XL.gguf \
  --mmproj models/ggml/mmproj-BF16.gguf \
  -c 102400 -ngl 99 -t 32 \
  --flash-attn on \
  --port 8080 --host 0.0.0.0 \
  --api-key local-llama \
  --jinja