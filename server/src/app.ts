
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setClientCookie } from "./middlewares/setClientCookie";
import { openaiTokenCounter } from "./utils/openaiTokenCounter";
import { aiModel, CHAT_RESPONSE_TYPES } from "./konstants";
import { openAIClient } from "./utils/OpenAIClient";

const app = express();

// Use middleware
const whitelist = process.env.WHITELIST_DOMAINS
  ? JSON.parse(process.env.WHITELIST_DOMAINS)
  : ["http://localhost:5173", "https://chat-bot-client-two.vercel.app/"];
const corsOptions = {
  origin: whitelist,
  credentials: true,
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

app.use(setClientCookie);

const activeRequests = new Map(); // Track requests

app.post("/stream", async (req:Request, res:Response) => {
  console.log("GET request received");

  const { question } = req.body;
  // Count tokens for the question
  const inputTokenCount = openaiTokenCounter.text(question, aiModel);
  console.log(`Input token count: ${inputTokenCount}`);
  const unique = req.clientId;
  console.log({ question, activeRequests });
  if (activeRequests.has(unique)) {
    console.log(`Aborting previous request for client: ${unique}`);
    const previousController = activeRequests.get(unique);
    previousController.abort();
  }
  let outputTokenCount = { count: 0 };
  try {
    const abortController = new AbortController();
    const { signal } = abortController;
    activeRequests.set(unique, abortController);
    res.on("close", () => {
      console.log("Request closed by client");
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.write(
      `data: ${JSON.stringify({
        type: CHAT_RESPONSE_TYPES.START_THINKING,
        message: "",
      })}\n\n`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // await callMockAPI(question, res, signal);
    await openAIClient.callOpenAIStreamAPI(question, res, signal, outputTokenCount);
    res.write(
      `data: ${JSON.stringify({
        type: CHAT_RESPONSE_TYPES.STOP_THINKING,
        message: "### Done!",
      })}\n\n`
    );
  } catch (error) {
    console.error("Error:", error);
    res.write(
      `data: ${JSON.stringify({
        markdown: "### Error: Could not retrieve response from AI.",
        error,
      })}\n\n`
    );
  } finally {
    res.end();
    activeRequests.delete(unique);
    console.log(`Request for client ${unique} completed or aborted.`);
    console.log(`Output token count: ${outputTokenCount.count}`);
  }
});

export default app;