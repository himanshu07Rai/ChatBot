import { Response } from "express";
import { aiModel, CHAT_RESPONSE_TYPES } from "../konstants";
import { openaiTokenCounter } from "./openaiTokenCounter";
import OpenAI from "openai";

class OpenRouterClient {
  openai: OpenAI;

  constructor() {
    console.log("OpenRouterClient created");

    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY, // REQUIRED
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async callOpenAIStreamAPI(
    contextWindow: OpenAI.ChatCompletionMessageParam[],
    res: Response,
    signal: AbortSignal,
    outputTokenCount: { count: number }
  ) {
    let aiResponse = "";

    try {
      const stream = await this.openai.chat.completions.create({
        model: "deepseek/deepseek-r1-0528:free", 
        messages: contextWindow,
        max_tokens: 100,
        stream: true,
        stop: ["###"],
      });

      for await (const chunk of stream) {
        if (signal.aborted) {
          console.log("Request signal aborted by client");
          break;
        }

        const message = chunk.choices[0]?.delta?.content ?? "";
        if (!message) continue;

        aiResponse += message;
        outputTokenCount.count += openaiTokenCounter.text(message, aiModel);

        res.write(
          `data: ${JSON.stringify({
            type: CHAT_RESPONSE_TYPES.AI_RESPONSE,
            message,
          })}\n\n`
        );

        // await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("OpenRouter API error:", error);

      res.write(
        `data: ${JSON.stringify({
          type: CHAT_RESPONSE_TYPES.AI_RESPONSE,
          message: "I'm sorry, I couldn't understand that.",
        })}\n\n`
      );
    }

    return aiResponse;
  }
}

export const openRouterClient = new OpenRouterClient();
