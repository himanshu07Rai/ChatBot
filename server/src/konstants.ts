import { ModelType } from "openai-gpt-token-counter";

export const CHAT_RESPONSE_TYPES = {
    START_THINKING: "START_THINKING",
    AI_RESPONSE: "AI_RESPONSE",
    STOP_THINKING: "STOP_THINKING",
  };

  export const aiModel: ModelType = "gpt-4o-mini" as ModelType;

  export const ENV = {PROD: 'prod', STAGE: 'stage', DEV: 'dev'};