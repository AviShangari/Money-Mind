import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, MessageSquare, AlertCircle } from "lucide-react";
import api from "../api/axiosClient";

const FREE_TIER_LIMIT = 5;

const SUGGESTED_PROMPTS = [
    "How much did I spend on food?",
    "Am I on budget this month?",
    "How long to save $1,000?",
    "What's my debt situation?",
    "Tips to reduce spending",
];

const INTENT_LABELS = {
    savings_projection: "Savings projection",
    spending_analysis:  "Spending analysis",
    budget_check:       "Budget check",
    comparison:         "Month comparison",
    what_if:            "What-if scenario",
    debt_question:      "Debt question",
    general_tips:       "General tips",
};

function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function TypingIndicator() {
    return (
        <div className="flex justify-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-brand" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-bg-tertiary border border-border">
                <div className="flex gap-1 items-center h-4">
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
            </div>
        </div>
    );
}

function UserBubble({ msg }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[80%]">
                <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-brand text-white text-sm leading-relaxed">
                    {msg.text}
                </div>
                <time className="text-[10px] text-text-secondary mt-0.5 block text-right">
                    {formatTime(msg.time)}
                </time>
            </div>
        </div>
    );
}

function BotBubble({ msg }) {
    return (
        <div className="flex justify-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-brand" />
            </div>
            <div className="max-w-[80%]">
                <div
                    className={`px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${
                        msg.isError
                            ? "bg-danger/10 border border-danger/20 text-danger"
                            : "bg-bg-tertiary border border-border text-text-primary"
                    }`}
                >
                    {msg.text}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    {msg.intent && INTENT_LABELS[msg.intent] && (
                        <span className="text-[10px] text-text-secondary">
                            {INTENT_LABELS[msg.intent]}
                        </span>
                    )}
                    <time className="text-[10px] text-text-secondary">
                        {formatTime(msg.time)}
                    </time>
                </div>
            </div>
        </div>
    );
}

export default function Chat() {
    const [messages, setMessages]         = useState([]);
    const [input, setInput]               = useState("");
    const [isTyping, setIsTyping]         = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);

    // ── Load history on mount ─────────────────────────────────────────────
    useEffect(() => {
        api.get("/chatbot/history")
            .then((res) => {
                // API returns newest-first; reverse to chronological
                const items = [...res.data].reverse();
                const history = items.flatMap((item) => [
                    {
                        id:   `u-${item.id}`,
                        role: "user",
                        text: item.message,
                        time: item.created_at,
                    },
                    {
                        id:     `b-${item.id}`,
                        role:   "bot",
                        text:   item.response,
                        intent: item.intent,
                        time:   item.created_at,
                    },
                ]);
                setMessages(history);
            })
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    }, []);

    // ── Auto-scroll to bottom ─────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // ── Usage tracking ────────────────────────────────────────────────────
    const thisMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const questionsThisMonth = messages.filter(
        (m) => m.role === "user" && (m.time ?? "").startsWith(thisMonthStr)
    ).length;
    const limitReached = questionsThisMonth >= FREE_TIER_LIMIT;

    const pctUsed      = Math.min((questionsThisMonth / FREE_TIER_LIMIT) * 100, 100);
    const usageBarColor =
        questionsThisMonth >= FREE_TIER_LIMIT ? "bg-danger"
        : questionsThisMonth >= 3             ? "bg-warning"
        : "bg-brand";

    // ── Send a message ────────────────────────────────────────────────────
    const sendMessage = useCallback(
        async (text) => {
            const trimmed = text.trim();
            if (!trimmed || isTyping || limitReached) return;

            const userMsg = {
                id:   Date.now(),
                role: "user",
                text: trimmed,
                time: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            setIsTyping(true);
            inputRef.current?.focus();

            try {
                const res = await api.post("/chatbot/ask", { message: trimmed });
                setMessages((prev) => [
                    ...prev,
                    {
                        id:     Date.now() + 1,
                        role:   "bot",
                        text:   res.data.response,
                        intent: res.data.intent,
                        time:   res.data.created_at,
                    },
                ]);
            } catch (err) {
                const detail = err.response?.data?.detail;
                setMessages((prev) => [
                    ...prev,
                    {
                        id:      Date.now() + 1,
                        role:    "bot",
                        text:    detail ?? "Something went wrong. Please try again.",
                        isError: true,
                        time:    new Date().toISOString(),
                    },
                ]);
            } finally {
                setIsTyping(false);
            }
        },
        [isTyping, limitReached]
    );

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-4">

            {/* Page header */}
            <div>
                <h1 className="text-3xl font-bold mb-1">Chat</h1>
                <p className="text-text-secondary text-sm">
                    Ask questions about your finances in plain language.
                </p>
            </div>

            {/* Chat card */}
            <div
                className="flex flex-col bg-bg-secondary border border-border rounded-md overflow-hidden min-h-96"
                style={{ height: "calc(100vh - 15rem)" }}
            >

                {/* ── Messages ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Loading history */}
                    {loadingHistory && (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-text-secondary">
                                Loading conversation history…
                            </p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loadingHistory && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                            <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center">
                                <MessageSquare size={22} className="text-brand" />
                            </div>
                            <div>
                                <p className="font-semibold text-text-primary mb-1">
                                    Ask me about your finances
                                </p>
                                <p className="text-sm text-text-secondary max-w-xs">
                                    Try a suggestion below, or type your own question about
                                    spending, savings, or budgets.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Message list */}
                    {!loadingHistory && messages.map((msg) =>
                        msg.role === "user"
                            ? <UserBubble key={msg.id} msg={msg} />
                            : <BotBubble  key={msg.id} msg={msg} />
                    )}

                    {/* Typing indicator */}
                    {isTyping && <TypingIndicator />}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* ── Suggested prompts ──────────────────────────────────────── */}
                <div
                    className="px-4 pt-2 pb-1.5 flex gap-2 overflow-x-auto border-t border-border/40"
                    style={{ scrollbarWidth: "none" }}
                >
                    {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => sendMessage(prompt)}
                            disabled={isTyping || limitReached}
                            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-brand hover:text-brand hover:bg-brand-subtle transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                {/* ── Input area ─────────────────────────────────────────────── */}
                <div className="px-4 pb-4 pt-2 border-t border-border space-y-2.5">

                    {/* Usage bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${usageBarColor}`}
                                style={{ width: `${pctUsed}%` }}
                            />
                        </div>
                        <span className="text-[11px] text-text-secondary whitespace-nowrap flex-shrink-0">
                            {questionsThisMonth}/{FREE_TIER_LIMIT} questions this month
                        </span>
                    </div>

                    {/* Limit reached */}
                    {limitReached ? (
                        <div className="flex items-start gap-2.5 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                            <AlertCircle
                                size={15}
                                className="text-warning flex-shrink-0 mt-0.5"
                            />
                            <p className="text-sm text-text-secondary">
                                You've reached your monthly limit on the free tier.{" "}
                                <span className="text-warning font-medium">Upgrade to Pro</span>{" "}
                                for unlimited questions.
                            </p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about your finances…"
                                disabled={isTyping}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 transition-colors"
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={isTyping || !input.trim()}
                                aria-label="Send message"
                                className="px-4 py-2.5 bg-brand text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
