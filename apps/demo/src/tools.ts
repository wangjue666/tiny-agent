import type { Tool } from "@tiny-agent/agent";

type WeatherArgs = {
  location: string;
};

export const weatherTool: Tool<WeatherArgs> = {
  name: "get_weather",
  description: "Get the current weather for a location.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city to look up, for example Beijing.",
      },
    },
    required: ["location"],
    additionalProperties: false,
  },
  parse(input): WeatherArgs {
    if (
      typeof input !== "object" ||
      input === null ||
      !("location" in input) ||
      typeof input.location !== "string" ||
      input.location.trim() === ""
    ) {
      throw new Error("location must be a non-empty string");
    }

    return { location: input.location.trim() };
  },
  async execute({ location }): Promise<string> {
    return JSON.stringify({
      location,
      temperature: 22,
      condition: "sunny",
      humidity: 45,
      source: "local demo data",
    });
  },
};
