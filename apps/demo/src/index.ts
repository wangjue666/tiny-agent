import { runAgent, type AgentEvent, type Tool } from "@tiny-agent/agent";
import { createOpenAIModel } from "@tiny-agent/openai-provider";
import { weatherTool } from "./tools";

function printEvent(event: AgentEvent): void {
  if (event.type === "tool_start") {
    console.log(
      `[tool:start] ${event.call.name} ${JSON.stringify(event.call.arguments)}`,
    );
  } else if (event.type === "tool_end") {
    console.log(`[tool:end] ${event.result.content}`);
  }
}

async function main(): Promise<void> {
  const result = await runAgent("今天北京天气如何？", {
    model: createOpenAIModel(),
    tools: [weatherTool],
    systemPrompt:
      "You are a helpful assistant. Use get_weather when the user asks about weather.",
    onEvent: printEvent,
  });

  console.log(`\nAssistant: ${result.output}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
