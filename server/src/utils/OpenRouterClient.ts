import { Response } from "express";
import { aiModel, CHAT_RESPONSE_TYPES, MAX_OUTPUT_TOKENS, OPENROUTER_MODEL } from "../konstants";
import { openaiTokenCounter } from "./openaiTokenCounter";
import OpenAI from "openai";

/**
 * Turn an SDK/network failure into a message that names the actual cause,
 * instead of hiding it behind a generic "I couldn't understand that".
 */
export function describeApiError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ? ` (HTTP ${error.status})` : "";
    const code = error.code ? ` [${error.code}]` : "";
    return `AI request failed${status}${code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return `AI request failed: ${error.message}`;
  }
  return "AI request failed: unknown error. Check the server logs.";
}

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
    let failed = false;

    try {
      // `reasoning` is an OpenRouter extension, so it is layered onto the SDK's
      // param type rather than being part of it.
      const body: OpenAI.ChatCompletionCreateParamsStreaming & {
        reasoning?: { enabled: boolean };
      } = {
        model: OPENROUTER_MODEL,
        messages: contextWindow,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true,
        // No `stop` sequence: "###" is the server->client SSE delimiter, not
        // something to halt the model on. This model marks its sections with
        // markdown "###" headings, so stopping on "###" killed generation
        // right after the intro paragraph on most answers.
        // Reasoning tokens are billed as output, count against max_tokens, and
        // never arrive as `delta.content` (the only field this client reads),
        // so leaving reasoning on can silently yield an empty reply.
        reasoning: { enabled: false },
      };

      // Passing `signal` cancels the upstream request immediately on client
      // disconnect. The `signal.aborted` check inside the loop only runs once a
      // chunk has arrived, so without this a disconnect during a slow first
      // token leaves the model generating (and billing) until it responds.
      const stream = await this.openai.chat.completions.create(body, {
        signal,
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
      // An aborted request is a client choice, not a failure: don't report it.
      if (signal.aborted || error instanceof OpenAI.APIUserAbortError) {
        console.log("Request aborted by client");
        return aiResponse;
      }

      failed = true;
      console.error("OpenRouter API error:", error);

      res.write(
        `data: ${JSON.stringify({
          type: CHAT_RESPONSE_TYPES.ERROR,
          message: describeApiError(error),
        })}\n\n`
      );
    }

    // A stream that ends without text (and without a client abort) would
    // otherwise show up as an empty reply with no explanation.
    if (!failed && !signal.aborted && !aiResponse) {
      console.warn(
        `Model ${OPENROUTER_MODEL} produced no text content for this request.`
      );
      res.write(
        `data: ${JSON.stringify({
          type: CHAT_RESPONSE_TYPES.ERROR,
          message: `The model (${OPENROUTER_MODEL}) returned no text. See the server logs.`,
        })}\n\n`
      );
    }

    return aiResponse;
  }
}

export const openRouterClient = new OpenRouterClient();
