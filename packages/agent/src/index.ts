import type {
  AgentResult,
  Message,
  RunAgentOptions,
  Tool,
  ToolCall,
  ToolResultMessage,
} from "./types";

export * from "./types";

const DEFAULT_MAX_TURNS = 10;

function stringifyToolResult(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? String(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function emit(
  options: RunAgentOptions,
  event: Parameters<NonNullable<RunAgentOptions["onEvent"]>>[0],
): Promise<void> {
  await options.onEvent?.(event);
}

async function executeTool(
  call: ToolCall,
  tool: Tool<unknown> | undefined,
  signal: AbortSignal | undefined,
): Promise<ToolResultMessage> {
  if (!tool) {
    return {
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content: `Unknown tool: ${call.name}`,
      isError: true,
    };
  }

  try {
    const args = tool.parse(call.arguments);
    const content = await tool.execute(args, signal);

    return {
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content: stringifyToolResult(content),
      isError: false,
    };
  } catch (error) {
    return {
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content: getErrorMessage(error),
      isError: true,
    };
  }
}

export async function runAgent(
  input: string,
  options: RunAgentOptions,
): Promise<AgentResult> {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const toolMap = new Map(options.tools.map((tool) => [tool.name, tool]));
  const messages: Message[] = [{ role: "user", content: input }];

  await emit(options, { type: "agent_start", input });

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    options.signal?.throwIfAborted();
    await emit(options, { type: "turn_start", turn });

    const turnStart = messages.length;
    const assistant = await options.model.generate({
      systemPrompt: options.systemPrompt ?? "",
      messages,
      tools: options.tools.map(({ name, description, parameters }) => ({
        name,
        description,
        parameters,
      })),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    messages.push(assistant);
    await emit(options, { type: "assistant", turn, message: assistant });

    if (assistant.toolCalls.length === 0) {
      const result: AgentResult = {
        output: assistant.content,
        messages,
      };
      await emit(options, {
        type: "turn_end",
        turn,
        message: messages.slice(turnStart),
      });
      await emit(options, { type: "agent_end", result });
      return result;
    }

    for (const call of assistant.toolCalls) {
      options.signal?.throwIfAborted();
      await emit(options, { type: "tool_start", call });
      const result = await executeTool(
        call,
        toolMap.get(call.name),
        options.signal,
      );
      messages.push(result);
      await emit(options, { type: "tool_end", call, result });
    }

    await emit(options, {
      type: "turn_end",
      turn,
      message: messages.slice(turnStart),
    });
  }

  throw new Error(`Agent exceeded maxTurns (${maxTurns})`);
}
