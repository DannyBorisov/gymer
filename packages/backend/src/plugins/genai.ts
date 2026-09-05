import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { GoogleGenAI, Type } from "@google/genai";
import config from "../config.js";

interface WorkoutTipResponse {
  tip: string;
}

const workoutTipResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tip: {
      type: Type.STRING,
      description:
        "One concise, specific coaching tip for today's workout, limited to two sentences.",
    },
  },
  required: ["tip"],
  propertyOrdering: ["tip"],
} as const;

class GenAIService {
  private client: GoogleGenAI;

  constructor(apiKey = config.env.GOOGLE_GEMINI_API_KEY) {
    this.client = new GoogleGenAI({ vertexai: true, apiKey });
  }

  async generateWorkoutTip(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.35,
        maxOutputTokens: 256,
        thinkingConfig: {
          thinkingBudget: 0,
        },
        responseMimeType: "application/json",
        responseSchema: workoutTipResponseSchema,
      },
    });

    const text = response.text;
    console.log({ text });
    if (!text) {
      throw new Error("Gemini returned an empty workout tip");
    }

    let result: WorkoutTipResponse;
    try {
      result = JSON.parse(text) as WorkoutTipResponse;
    } catch {
      throw new Error("Gemini returned an invalid workout tip response");
    }

    const tip = result.tip?.trim();
    if (!tip) {
      throw new Error("Gemini returned a workout tip without text");
    }

    return tip;
  }
}

const genaiPlugin: FastifyPluginAsync = async (fastify) => {
  const genai = new GenAIService();
  fastify.decorate("genai", genai);
};

export default fp(genaiPlugin, { name: "genai" });

declare module "fastify" {
  interface FastifyInstance {
    genai: GenAIService;
  }
}
