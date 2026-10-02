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
    "Explain quantum computing in simple terms",
    "What's the difference between AI and machine learning?",
    "How can I improve my productivity?",
    "What are the latest trends in technology?",
    "Can you suggest healthy meal ideas?",
    "How do I start learning programming?",
    "What books would you recommend?",
    "How does climate change affect us?",
    "What are some creative hobbies to try?",
    "How can I improve my sleep quality?",
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
      const source = SSE(`${import.meta.env.VITE_BACKEND_URL}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        payload: JSON.stringify({ question }),
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
            case CHAT_RESPONSE_TYPES.ERROR:
              // Surface the real failure, and let the trailing STOP_THINKING
              // commit it to history like a normal reply.
              setIsThinking(false);
              currentResponseRef.current += `${
                currentResponseRef.current ? "\n\n" : ""
              }⚠️ ${data.message ?? "Something went wrong."}`;
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            AI Chat Assistant
          </h1>
          <p className="text-gray-600">Ask anything and get intelligent responses</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main chat area */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[calc(100vh-250px)]"
              ref={messageAreaScrollRef}
            >
              {chatHistory.length > 0 ? (
                chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                        msg.type === "user"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none"
                          : "bg-gray-100 text-gray-800 rounded-bl-none"
                      } shadow-sm transition-all duration-300 transform hover:scale-[1.02]`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                            em: ({node, ...props}) => <em className="italic" {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded mt-2 overflow-x-auto" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-6 rounded-full mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Start a conversation</h3>
                  <p className="text-gray-600 max-w-md">
                    Ask a question to begin chatting with our AI assistant. Try one of the suggested questions or type your own.
                  </p>
                </div>
              )}

              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none p-4 max-w-[75%] shadow-sm">
                    <div className="flex items-center">
                      <div className="animate-bounce h-2 w-2 rounded-full bg-indigo-500 mr-1"></div>
                      <div className="animate-bounce h-2 w-2 rounded-full bg-indigo-500 mr-1 delay-75"></div>
                      <div className="animate-bounce h-2 w-2 rounded-full bg-indigo-500 delay-150"></div>
                      <span className="ml-2 text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {currentResponse && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none p-4 max-w-[75%] shadow-sm">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                          em: ({node, ...props}) => <em className="italic" {...props} />,
                          code: ({node, ...props}) => <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs" {...props} />,
                          pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded mt-2 overflow-x-auto" {...props} />,
                        }}
                      >
                        {currentResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  disabled={isThinking || !userQuestion.trim()}
                  className={`px-5 py-3 rounded-xl font-medium text-white shadow-md transition-all duration-300 transform hover:scale-105 ${
                    isThinking || !userQuestion.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  }`}
                >
                  {isThinking ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Suggested questions panel */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-2xl shadow-xl p-6 h-fit sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Suggested Questions
              </h2>
              <p className="text-gray-600 text-sm mb-4">Click on any question to start a conversation</p>
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(q)}
                    disabled={isThinking}
                    className="w-full text-left p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5 mr-3">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 group-hover:bg-purple-500"></div>
                      </div>
                      <span className="text-gray-800 group-hover:text-indigo-700">{q}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">Tips for better responses:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Be specific with your questions</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Ask follow-up questions for more details</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Try different phrasings if needed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
