const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const CHAT_RESPONSE_TYPES = {
  START_THINKING: "START_THINKING",
  AI_RESPONSE: "AI_RESPONSE",
  STOP_THINKING: "STOP_THINKING",
};

const responses = {
  "Who are you?": `I am an **AI-powered virtual assistant** designed to help you navigate through your questions and provide information across a wide range of topics. My primary goal is to assist you in finding the answers you seek while ensuring a pleasant interaction experience.`,

  "What is AI?": `**Artificial Intelligence (AI)** refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. This field encompasses various subfields, including:
    - **Machine Learning**: Algorithms that enable computers to learn from data.
    - **Natural Language Processing**: Understanding and generating human language.
    - **Computer Vision**: Enabling machines to interpret visual information.
    - **Robotics**: Designing intelligent machines capable of performing tasks.
    AI can analyze vast amounts of data, recognize patterns, and make decisions with minimal human intervention, revolutionizing industries such as **healthcare**, **finance**, and **transportation**.`,

  "What is Node.js?": `**Node.js** is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside of a web browser. Key features include:
    - Built on **Google Chrome's V8 JavaScript engine**.
    - Ideal for creating **scalable network applications**.
    - Uses a **non-blocking, event-driven architecture** for efficient request handling.
    This makes Node.js particularly suitable for building **real-time applications** like chat systems and online gaming.`,

  "Tell me a joke": `Why did the scarecrow win an award? Because he was **outstanding in his field**!
    This joke is a pun that plays on the double meaning of "outstanding"—referring both to being excellent and literally standing out in a field. Humor often relies on clever wordplay to elicit laughter.`,

  "What are the applications of AI in daily life?": `AI is integrated into many aspects of our daily lives, often in ways we may not realize. Examples include:
    - **Virtual Assistants**: Siri and Alexa managing our schedules.
    - **Smart Home Devices**: Automating daily tasks.
    - **Recommendation Algorithms**: Streaming services suggesting products based on our preferences.
    In **healthcare**, AI systems assist in diagnosing diseases by analyzing medical images, while in **finance**, they help in fraud detection and algorithmic trading, showcasing the versatility and transformative power of AI across various sectors.`,

  "What is the future of technology?": `The future of technology promises significant advancements in areas such as:
    - **AI**: Increased automation across industries.
    - **Quantum Computing**: Solving complex problems beyond current capabilities.
    - **Biotechnology**: Improvements in personalized medicine driven by genetic insights.
    As we advance, **ethical considerations** around privacy, security, and the impact of technology on employment will be crucial in shaping a future where technology benefits all of humanity.`,

  "How does machine learning work?": `**Machine learning** is a subset of AI that focuses on developing algorithms allowing computers to learn from and make predictions based on data. The process typically involves:
    - Feeding large datasets into a model.
    - Identifying patterns and relationships.
    This can be:
    - **Supervised Learning**: Training on labeled data.
    - **Unsupervised Learning**: Discovering patterns without explicit instructions.
    Over time, the model improves its accuracy by adjusting based on new data, making machine learning a powerful tool for tasks ranging from **image recognition** to **natural language processing**.`,

  default: `I'm sorry, I don't have an answer for that. However, I'm constantly learning and evolving. If you have a different question or if there's a specific topic you'd like to explore, please feel free to ask!`,
};

async function callMockAPI(question, res) {
  console.log("Question:", question);
  const response = responses[question] || responses["default"];

  for (const word of response.split(" ")) {
    res.write(
      `data: ${JSON.stringify({
        type: CHAT_RESPONSE_TYPES.AI_RESPONSE,
        message: word,
      })}\n\n`
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

app.post("/stream", async (req, res) => {
  console.log("GET request received");
  try {
    const { question } = req.body;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(
      `data: ${JSON.stringify({
        type: CHAT_RESPONSE_TYPES.START_THINKING,
        message: "",
      })}\n\n`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await callMockAPI(question, res);
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
  }
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
