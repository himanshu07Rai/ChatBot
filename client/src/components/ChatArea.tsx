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
  const [userQuestion, setUserQuestion] = useState<string>("");

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
      const source = SSE("https://chat-bot-server-gamma.vercel.app/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          signal: abortControllerRef.current.signal,
        },
        withCredentials: true,
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
              currentResponseRef.current += data.message;
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (userQuestion.trim()) {
      handleQuestionClick(userQuestion.trim());
      setUserQuestion("");
    }
  };

  return (
    <div className="mx-auto p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Chat with AI</h1>
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 lg:mr-4">
          <div
            className="overflow-y-auto max-h-screen mb-4 p-4 border border-gray-300 rounded-lg"
            ref={messageAreaScrollRef}
          >
            {chatHistory.length > 0 ? (
              chatHistory.map((msg, index) => (
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
              ))
            ) : (
              <p className="text-center">
                Ask a question to start the conversation.
              </p>
            )}
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
        </div>
        <div className="lg:w-1/3">
          {" "}
          {/* Set a specific width for the question selection area */}
          <h2 className="text-lg font-semibold mb-2">
            Select a question or type it out
          </h2>
          <form onSubmit={handleSubmit} className="mt-4">
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Type your question..."
              className="border border-gray-300 p-2 rounded-md w-full"
            />
            <button
              type="submit"
              className="mt-2 w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200 mb-2"
            >
              Ask
            </button>
          </form>
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
    </div>
  );
}
