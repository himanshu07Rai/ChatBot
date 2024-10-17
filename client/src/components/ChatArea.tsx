import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SSE } from "../utils/sse.ts";
import { CHAT_RESPONSE_TYPES } from "../utils/konstants.ts";

export default function ChatArea() {
  const [chatHistory, setChatHistory] = useState<
    { type: "user" | "ai"; content: string }[]
  >([]);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const currentResponseRef = useRef<string>("");
  const messageAreaScrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messageAreaScrollRef.current) {
      messageAreaScrollRef.current.scrollTop =
        messageAreaScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Predefined questions
  const questions = [
    "Who are you?",
    "What is AI?",
    "What is Node.js?",
    "Tell me a joke",
    "What are the applications of AI in daily life?",
    "What is the future of technology?",
    "How does machine learning work?",
    "What is the impact of AI on the job market?",
    "Can AI create art?",
    "What are the ethical considerations of AI?",
  ];

  const updateChatHistory = () => {
    const currentResponseValue = currentResponseRef.current.trim();
    if (currentResponseValue) {
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", content: currentResponseValue },
      ]);
    } else {
      console.warn("Attempted to update chat history with an empty response.");
    }
  };
  const handleQuestionClick = async (question: string) => {
    if (abortControllerRef.current) {
      setChatHistory((prev) => prev.slice(0, -1));
      abortControllerRef.current.abort();
    }
    setChatHistory((prev) => [...prev, { type: "user", content: question }]);
    currentResponseRef.current = "";
    setCurrentResponse("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const source = SSE("http://localhost:8000/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          signal: abortControllerRef.current.signal,
        },
        payload: JSON.stringify({ question }),
        signal: abortController.signal,
      });

      if (source) {
        source.addEventListener("message", (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case CHAT_RESPONSE_TYPES.START_THINKING:
              setIsThinking(true);
              break;
            case CHAT_RESPONSE_TYPES.AI_RESPONSE:
              setIsThinking(false);
              currentResponseRef.current += data.message + " ";
              setCurrentResponse(currentResponseRef.current.trim());
              break;
            case CHAT_RESPONSE_TYPES.STOP_THINKING:
              updateChatHistory();
              currentResponseRef.current = "";
              setCurrentResponse("");
              abortControllerRef.current = null;
              break;
          }
        });
        abortController.signal.addEventListener("abort", () => {
          console.log("Request aborted.");
          source.close();
        });
      } else {
        console.error("Connection to SSE lost.");
        source.close();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Previous request was aborted.");
      } else {
        console.error("Error sending question:", error);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Chat with AI</h1>
      <div
        className="overflow-y-auto max-h-96 mb-4 p-4 border border-gray-300 rounded-lg"
        ref={messageAreaScrollRef}
      >
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
      {isThinking && (
        <div className="mb-4 p-2 border border-gray-300 rounded-md">
          <p>AI is thinking...</p>
        </div>
      )}
      {currentResponse && (
        <div className="mb-4 p-2 border border-gray-300 rounded-md">
          <ReactMarkdown>{currentResponse}</ReactMarkdown>
        </div>
      )}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Select a question:</h2>
        <div className="space-y-2">
          {questions.map((q, index) => (
            <button
              key={index}
              onClick={() => handleQuestionClick(q)}
              className="block w-full bg-gray-200 text-black p-2 rounded-md hover:bg-gray-300 transition duration-200"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
