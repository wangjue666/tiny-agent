import OpenAI from "openai";
import { openApiConfig } from "./config";

const openai = new OpenAI(openApiConfig);

async function conversation({
  promote,
  question,
}: {
  question?: string;
  promote: string;
}) {
  const messages = [{ role: "system", content: promote }];
  if (question) {
    messages.push({ role: "user", content: question });
  }
  const sendParams: any = {
    messages,
    model: "deepseek-v4-flash",
    thinking: {
      type: "enabled",
    },
    reasoning_effort: "low",
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description:
            "Get weather of a location, the user should supply a location first.",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
              },
            },
            required: ["location"],
          },
        },
      },
    ],
  };
  const completion = await openai.chat.completions.create(sendParams);
  console.log("completion", JSON.stringify(completion, null, 2));
  if (!completion || !completion.choices || completion.choices.length === 0) {
    throw new Error("No choices returned from OpenAI API");
  }
  return completion.choices[0]?.message;
}

console.log(
  conversation({
    promote:
      "You are a helpful assistant that answers questions about the DeepSeek API.",
    question: "今天北京天气如何",
  }),
);
