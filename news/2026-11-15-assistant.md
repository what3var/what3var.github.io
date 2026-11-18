---
title: A language model in fire - and an assistant for spark
tag: AI
---
fire now runs a small language model itself: the package `ai` reads GGUF files (the format of llama.cpp) and computes on the CPU in its own C - no service, no extra library, no GPU, and nothing leaves the machine. On top of it sit an agent with tools, the Model Context Protocol, and an assistant for spark.

```fire
#import "ai"

var model = new AI.Model("Qwen3.5-0.8B-Q4_0.gguf")
var session = new AI.Session(model)
print(session.Ask("You are a helpful assistant.", "What is the capital of France?"))
```

- **`ai`: the engine.** Qwen 3.5, Qwen 3, Qwen 2.5, LFM 3 and Llama-style models, Q8_0/Q4_0 and the common K-quantizations, AVX2 and NEON. Checked token by token against llama.cpp. On four cores the 0.8B model writes about 16 tokens a second. `ai.models` picks a model that suits the machine and downloads it only after asking (resumable, checked with SHA-256).
- **`ai.agent`: an agent with tools.** Instructions, a conversation it remembers, tools as plain lambdas (or with a JSON schema), `Choose` among options, and `Start`/`Update` for user interfaces that must not wait.
- **`mcp`: the Model Context Protocol.** Client and server over stdio and Streamable HTTP, tested against the Python SDK. **spark is an MCP server** now (*Tools > MCP Server*, off by default, localhost only, with a token): documents, errors, output, Check/Run/Stop, the docs and the samples - for the assistant and for any other MCP client.
- **The assistant.** A small character at the edge of the desktop, in the spirit of the office helpers of the nineties - but off unless you switch it on, and quiet. It is a fire program in a frameless, click-through window, explains build errors, searches the docs, reads files, and runs commands or git only after you allow it. One assistant serves every open spark; Ctrl+^ calls it.

Small models are no experts: they explain, summarize and pick from options well, and get facts and arithmetic wrong. The assistant is meant for help and suggestions, not for answers that must be right. See [AI](docs/ai/index.html), [the assistant](docs/ai/assistant.html) and [spark as an MCP server](docs/tools/spark-mcp.html).
