import { useState, useRef, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
import { SwipeableDrawer } from "../../components/SwipeableDrawer";
import { useWorkoutChat, type ChatMessage } from "../../api/ai";
import styles from "./CoachChat.module.css";

interface WorkoutSetData {
  exercise: string;
  setIndex: number;
  // Target values
  targetReps?: number;
  targetRir?: number;
  targetRestTime?: number;
  // Achieved values
  weight?: number;
  reps?: number;
  rir?: number;
  restTime?: number;
  isComplete: boolean;
}

interface CoachChatProps {
  isOpen: boolean;
  onClose: () => void;
  week: number;
  workoutName: string;
  currentExercise?: string;
  currentSetIndex?: number;
  workoutData?: WorkoutSetData[];
}

const QUICK_PROMPTS = [
  "Should I go heavier?",
  "How long should I rest?",
  "I'm feeling tired",
  "Form check tips",
  "General tip for this workout",
];

export function CoachChat({
  isOpen,
  onClose,
  week,
  workoutName,
  currentExercise,
  currentSetIndex,
  workoutData,
}: CoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useWorkoutChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to allow drawer animation
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || chatMutation.isPending) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync({
        week,
        workoutName,
        message: text,
        currentExercise,
        currentSetIndex,
        workoutData,
        conversationHistory: messages,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I couldn't process that. Try again?",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    onClose();
    setInput("");
  };

  return (
    <SwipeableDrawer isOpen={isOpen} onClose={handleClose} dark>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h3 className={styles.title}>Coach</h3>
            <span className={styles.subtitle}>
              Ask anything about your workout
            </span>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                Ask me about form, weight selection, rest times, or anything
                else about your workout.
              </p>
              <div className={styles.quickPrompts}>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className={styles.quickPrompt}
                    onClick={() => handleSend(prompt)}
                    disabled={chatMutation.isPending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messages}>
              {messages.map(({ role, content }, idx) => (
                <div
                  key={idx}
                  className={`${styles.message} ${role === "user" ? styles.userMessage : styles.assistantMessage}`}
                >
                  {content}
                </div>
              ))}
              {chatMutation.isPending && (
                <div
                  className={`${styles.message} ${styles.assistantMessage} ${styles.loading}`}
                >
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Ask your coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={chatMutation.isPending}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </SwipeableDrawer>
  );
}
