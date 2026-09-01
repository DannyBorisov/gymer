import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { GoogleGenAI } from "@google/genai";
import config from "../config.js";

class GenAIService {
  private client: GoogleGenAI;

  constructor(apiKey = config.env.GOOGLE_GEMINI_API_KEY) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateContent(
    prompt: string,
    model = "gemini-2.5-flash",
  ): Promise<string> {
    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text ?? "";
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
