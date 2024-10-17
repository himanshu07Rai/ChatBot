import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SSE } from "../utils/sse.ts";

export default function ChatArea() {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { type: "user" | "ai"; content: string }[]
  >([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    // Add the user's question to the chat history
    setChatHistory((prev) => [...prev, { type: "user", content: question }]);
    setQuestion(""); // Clear input

    try {
      const source = SSE("http://localhost:8000/stream", {
        method: "POST",
        headers: {
          "Content-Type": "text/event-stream",
        },
        payload: JSON.stringify({ question }), // Send the question as JSON
      });

      if (source) {
        let aiResponse = "";
        source.addEventListener("message", (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          aiResponse += data.markdown + " "; // Accumulate AI's response
          setChatHistory((prev) => [
            ...prev.filter((msg) => msg.type !== "ai"),
            { type: "ai", content: aiResponse.trim() },
          ]);
        });
      } else {
        console.error("Connection to SSE lost.");
        source.close();
      }
    } catch (error) {
      console.error("Error sending question:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Chat with AI</h1>

      {/* Chat History */}
      <div className="overflow-y-auto max-h-96 mb-4 p-4 border border-gray-300 rounded-lg">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`mb-2 flex ${
              msg.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`${
                msg.type === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              } p-2 rounded-lg max-w-xs break-words`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-grow border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 transition duration-200"
        >
          Send
        </button>
      </form>
    </div>
  );
}
