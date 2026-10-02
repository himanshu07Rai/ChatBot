import { ModelType } from "openai-gpt-token-counter";

export const CHAT_RESPONSE_TYPES = {
    START_THINKING: "START_THINKING",
    AI_RESPONSE: "AI_RESPONSE",
    STOP_THINKING: "STOP_THINKING",
    ERROR: "ERROR",
  };

  // Model actually sent to OpenRouter. Override with OPENROUTER_MODEL to swap
  // models without a code change (e.g. when a model loses all its providers).
  export const OPENROUTER_MODEL =
    process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";

  // Cap on visible output. Reasoning tokens (when enabled) are billed as output
  // and count against this same budget, so it must sit well above the expected
  // answer length or the model can spend everything thinking and emit no text.
  // 1024 was still clipping detailed answers mid-sentence.
  export const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS) || 2048;

  // Only used to estimate token counts locally, not for the API call itself.
  export const aiModel: ModelType = "gpt-4o-mini" as ModelType;

  export const ENV = {PROD: 'prod', STAGE: 'stage', DEV: 'dev'};