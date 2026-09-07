# tiny-agent

一个基于 TypeScript 的轻量级 Agent workspace 示例。Agent 负责组织对话和工具调用，模型 provider 负责连接具体的大语言模型，demo 展示了一个天气查询工具。

## 项目结构

```text
packages/
	agent/             Agent 核心循环、消息类型和工具协议
	openai-provider/   OpenAI-compatible 模型 provider
apps/
	demo/              使用天气工具的可运行示例
```

## 环境要求

- Node.js 20+
- pnpm 9+
- 一个兼容 OpenAI Chat Completions API 的 API key

## 安装

```bash
pnpm install
```

## 配置 API

`@tiny-agent/openai-provider` 默认连接 DeepSeek。运行 demo 前设置 API key：

PowerShell：

```powershell
$env:DEEPSEEK_API_KEY = "your-api-key"
```

macOS/Linux：

```bash
export DEEPSEEK_API_KEY="your-api-key"
```

也可以通过 `DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL` 覆盖默认的 API 地址和模型名称。

## 运行 demo

先构建 workspace 包，再运行 demo：

```bash
pnpm -F @tiny-agent/agent build
pnpm -F @tiny-agent/openai-provider build
pnpm -F @tiny-agent/demo build
node apps/demo/dist/index.mjs
```

## 开发模式

根目录提供统一的 watch 命令。它会并行监听两个 packages 和 demo，修改 `packages/` 下的源码后会自动重新构建：

```bash
pnpm dev
```

也可以单独监听某个包：

```bash
pnpm -F @tiny-agent/agent dev
pnpm -F @tiny-agent/openai-provider dev
pnpm -F @tiny-agent/demo dev
```

## 使用 Agent

```typescript
import { runAgent } from "@tiny-agent/agent";
import { createOpenAIModel } from "@tiny-agent/openai-provider";

const result = await runAgent("今天北京天气如何？", {
  model: createOpenAIModel(),
  tools: [weatherTool],
  systemPrompt: "Use get_weather when the user asks about weather.",
});

console.log(result.output);
```

## 自定义工具

工具需要提供名称、描述、JSON Schema，以及参数校验和执行函数：

```typescript
const tool: Tool<{ location: string }> = {
  name: "get_weather",
  description: "Get the current weather for a location.",
  parameters: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
    additionalProperties: false,
  },
  parse(input) {
    if (
      typeof input !== "object" ||
      input === null ||
      !("location" in input) ||
      typeof input.location !== "string"
    ) {
      throw new Error("Invalid location");
    }

    return { location: input.location };
  },
  async execute({ location }) {
    return `Weather for ${location}`;
  },
};
```

`parse` 抛出的错误会被转换为工具错误消息，并继续交给模型处理。可以通过 `onEvent` 监听 Agent、模型和工具调用事件。

## 常用命令

```bash
pnpm dev       # 所有 workspace 包进入 watch 模式
pnpm --filter @tiny-agent/agent build
pnpm --filter @tiny-agent/openai-provider build
pnpm --filter @tiny-agent/demo build
```
