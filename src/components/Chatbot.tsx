import React, {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, X, Loader2 } from "lucide-react";
import Markdown from "react-markdown";

interface ChatMessage {
  id: number;
  content: string;
  role: "human" | "assistant";
}

const API_BASE_URL: string = import.meta.env.VITE_SERVER_URL || "";

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      content:
        "Hi! I'm your AI assistant for SkillMorph. How can I help you today?",
      role: "assistant",
    },
  ]);

  // Ref for the last message element to enable auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to the bottom of the chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleChat = (): void => {
    setIsOpen((prev) => !prev);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInput(e.target.value);
  };

  // Function to simulate exponential backoff for retries
  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const sendMessage = async (e: FormEvent | KeyboardEvent): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery: string = input.trim();
    setInput("");
    setLoading(true);

    // 1. Add user message to history
    const newUserMessage: ChatMessage = {
      id: Date.now(),
      content: userQuery,
      role: "human",
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const maxRetries: number = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(`${API_BASE_URL}/chat/query`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "skip-browser-warning",
            },
            body: JSON.stringify({ query: userQuery, messages: messages }),
          });

          if (!response.ok) {
            if (response.status >= 400 && response.status < 500) {
              const errorData: any = await response.json();
              throw new Error(
                errorData.error ||
                  `Server responded with status ${response.status}`
              );
            }
            throw new Error(
              `Request failed with status ${response.status}. Retrying...`
            );
          }

          const data: { response?: string } = await response.json();

          // 2. Add AI response to history
          const newAiMessage: ChatMessage = {
            id: Date.now() + 1,
            content:
              data.response || "I'm sorry, I couldn't find a clear answer.",
            role: "assistant",
          };
          setMessages((prev) => [...prev, newAiMessage]);
          break;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            const finalError: ChatMessage = {
              id: Date.now() + 1,
              content: `An error occurred while fetching the response. Please try again later. (${
                (error as Error).message.split(".")[0]
              })`,
              role: "assistant",
            };
            setMessages((prev) => [...prev, finalError]);
            console.error("Final API Error:", error);
            break;
          }
          await delay(Math.pow(2, attempt) * 1000); // Exponential backoff (1s, 2s, 4s)
        }
      }
    } catch (finalError) {
      const criticalError: ChatMessage = {
        id: Date.now() + 1,
        content: `A critical error occurred: ${(finalError as Error).message}`,
        role: "assistant",
      };
      setMessages((prev) => [...prev, criticalError]);
      console.error("Critical synchronous error:", finalError);
    } finally {
      setLoading(false);
    }
  };

  const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({
    message,
  }) => {
    const isUser: boolean = message.role === "human";
    return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-xs sm:max-w-sm px-4 py-2 rounded-xl shadow-md ${
            isUser
              ? "bg-[#3B82F6] text-white rounded-br-none"
              : "bg-gray-200 text-[#111827] rounded-tl-none"
          }`}
        >
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans">
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-[100] bg-gradient-to-r from-[#3B82F6] to-[#10B981] text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/50"
          aria-label="Toggle AI Assistant Chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Interface Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="fixed bottom-0 right-0 top-0 w-full md:w-[400px] lg:w-[450px] max-w-lg bg-[#F9FAFB] shadow-2xl z-[100] flex flex-col rounded-l-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-[#3B82F6] to-[#10B981] text-white">
              <h2 className="text-xl font-bold">SkillMorph AI Assistant</h2>
              <button
                onClick={toggleChat}
                className="p-1 rounded-full text-white transition-colors hover:bg-white/20"
                aria-label="Close Chat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Content Display */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-[#111827] p-3 rounded-xl rounded-tl-none max-w-xs sm:max-w-sm shadow-md flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}

              {/* Anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={sendMessage}
              className="p-4 border-t bg-gray-100 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  loading ? "Waiting for AI..." : "Ask about courses..."
                }
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter") sendMessage(e);
                }}
                disabled={loading}
                className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 transition-all focus:ring-[#3B82F6] shadow-inner disabled:bg-gray-200"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3 bg-gradient-to-r from-[#3B82F6] to-[#10B981] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02]"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Export the main component as App
export default Chatbot;
