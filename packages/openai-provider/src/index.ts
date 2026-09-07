import OpenAI from "openai";
import type {
  AssistantMessage,
  Message,
  Model,
  ToolDefinition,
} from "@tiny-agent/agent";
import { openApiConfig, openApiModel } from "./config";

type OpenAIModelOptions = {
  model?: string;
  client?: OpenAI;
};

function toOpenAIMessages(
  systemPrompt: string,
  messages: Message[],
): unknown[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => {
      if (message.role === "tool") {
        return {
          role: "tool",
          tool_call_id: message.toolCallId,
          content: message.content,
        };
      }

      if (message.role === "assistant") {
        return {
          role: "assistant",
          content: message.content,
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          })),
        };
      }

      return { role: "user", content: message.content };
    }),
  ];
}

function toOpenAITools(tools: ToolDefinition[]): unknown[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function createOpenAIModel(options: OpenAIModelOptions = {}): Model {
  const client = options.client ?? new OpenAI(openApiConfig);
  const model = options.model ?? openApiModel;

  return {
    async generate(input): Promise<AssistantMessage> {
      const completion = await client.chat.completions.create({
        model,
        messages: toOpenAIMessages(input.systemPrompt, input.messages) as never,
        tools: toOpenAITools(input.tools) as never,
      });
      const message = completion.choices[0]?.message;

      if (!message) {
        throw new Error("OpenAI returned no assistant message");
      }

      return {
        role: "assistant",
        content: message.content ?? "",
        toolCalls: (message.tool_calls ?? []).flatMap((call) => {
          if (call.type !== "function") {
            return [];
          }

          let args: unknown = call.function.arguments;
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            // Keep malformed arguments as text so the registered tool can report the error.
          }

          return [{ id: call.id, name: call.function.name, arguments: args }];
        }),
      };
    },
  };
}

export { openApiConfig, openApiModel } from "./config";
