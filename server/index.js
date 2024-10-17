const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const CHAT_RESPONSE_TYPES = {
  MARKDOWN: "markdown",
};

const genAI = new GoogleGenerativeAI("AIzaSyDFxSKsbuoErupjoYk0c6RI7mjWUjqVLi4");

// Initialize a generative model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Mocking the Gemini API call
async function callGeminiAPI(question = "Who are you?") {
  const result = await model.generateContent(question);
  const response = await result.response;
  const output = await response.text();
  return output;
}

app.post("/stream", async (req, res) => {
  console.log("GET request received");
  try {
    const { question } = req.body;

    // Set headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send an initial "Thinking..." message
    res.write(`data: ${JSON.stringify({ markdown: "### Thinking..." })}\n\n`);

    // Mock API call for Gemini API
    const geminiResponse = await callGeminiAPI(question);
    console.log("Gemini response:", geminiResponse);
    const words = geminiResponse.split(" ");

    // Stream each word with a delay
    for (const [index, word] of words.entries()) {
      res.write(`data: ${JSON.stringify({ markdown: word })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // End the stream with a "Done" message
    res.write(`data: ${JSON.stringify({ markdown: "### Done!" })}\n\n`);
    res.end();
  } catch (error) {
    // Handle any errors from the API
    res.write(
      `data: ${JSON.stringify({
        markdown: "### Error: Could not retrieve response from AI.",
        error,
      })}\n\n`
    );
    res.end();
  }
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
