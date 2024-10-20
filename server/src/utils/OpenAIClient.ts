import { Response } from "express";
import { aiModel, CHAT_RESPONSE_TYPES } from "../konstants";
import { openaiTokenCounter } from "./openaiTokenCounter";

import OpenAI from "openai";

class OpenAIClient{
    openai: any;
    constructor(){
        console.log('OpenAIClient created');
        this.openai = new OpenAI();
    }

    async callOpenAIStreamAPI(contextWindow: { role: string; content: string }[], res: Response, signal: any, outputTokenCount:{
        count:number
    }) {
      let aiResponse = "";
      try {
        const stream = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: contextWindow,
          max_tokens: 100,
          stream: true,
          stop: ["###"],
        });
        for await (const chunk of stream) {
          const message = chunk.choices[0]?.delta?.content || "";
          aiResponse += message;
          outputTokenCount.count += openaiTokenCounter.text(message, aiModel); // Count output tokens
          res.write(
            `data: ${JSON.stringify({
              type: CHAT_RESPONSE_TYPES.AI_RESPONSE,
              message,
            })}\n\n`
          );
          if (signal.aborted) {
            console.log("Request signal aborted by client");
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    catch (error) {
      console.error("OpenAI API error:", error);
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


export const openAIClient = new OpenAIClient()