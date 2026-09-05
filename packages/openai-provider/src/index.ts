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
      type: "disabled",
    },
  };
  const completion = await openai.chat.completions.create(sendParams);
  console.log("completion", JSON.stringify(completion, null, 2));
  if (!completion || !completion.choices || completion.choices.length === 0) {
    throw new Error("No choices returned from OpenAI API");
  }
  return completion.choices[0]?.message.content;
}

console.log(
  conversation({
    promote:
      "You are a helpful assistant that answers questions about the DeepSeek API.",
    question: "你好呀",
  }),
);
