"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Search, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

type Message = {
  id: number;
  text: string;
  sender: string;
  timestamp: Date;
  isError?: boolean;
};

type HistoryTurn = { role: "user" | "assistant"; content: string };

type BookingContext = {
  bookingId: string;
  lastName: string;
  email: string;
  phone: string;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm Ashake, Carsgidi's assistant. I can answer questions about rentals, mileage, protection plans, and look up your booking. How can I help?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Booking lookup state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const [bookingForm, setBookingForm] = useState({ bookingId: "", lastName: "", email: "", phone: "" });
  const [bookingFormError, setBookingFormError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !showBookingForm && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showBookingForm]);

  const handleLoadBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFormError("");

    const { bookingId, lastName, email, phone } = bookingForm;
    if (!bookingId || !lastName || (!email && !phone)) {
      setBookingFormError("Booking ID, last name, and email or phone are required.");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `I'd like to review my booking #${bookingId}.`,
          bookingContext: { bookingId, lastName, email, phone },
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setBookingContext({ bookingId, lastName, email, phone });
      setShowBookingForm(false);

      const newHistory: HistoryTurn[] = [
        { role: "user", content: `I'd like to review my booking #${bookingId}.` },
        { role: "assistant", content: data.message },
      ];
      setHistory(newHistory);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: `I'd like to review my booking #${bookingId}.`,
          sender: "user",
          timestamp: new Date(),
        },
        {
          id: prev.length + 2,
          text: data.message,
          sender: "bot",
          timestamp: new Date(data.timestamp),
        },
      ]);
    } catch {
      setBookingFormError("Could not verify booking. Check your details and try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: messages.length + 1,
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          bookingContext: bookingContext || undefined,
          history,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const botMessage: Message = {
        id: messages.length + 2,
        text: data.message,
        sender: "bot",
        timestamp: new Date(data.timestamp),
      };

      setMessages((prev) => [...prev, botMessage]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Sorry, I couldn't process your message. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          text: "Sorry, I couldn't process your message. Please try again.",
          sender: "bot",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Widget Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform duration-200 hover:scale-110"
        aria-label="Open chat"
        title="Chat with us"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 bg-white rounded-lg shadow-2xl flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Carsgidi Assistant</h3>
              <p className="text-sm text-blue-100">We're here to help</p>
            </div>
            <button
              onClick={() => setShowBookingForm((v) => !v)}
              className="flex items-center gap-1 bg-blue-500 hover:bg-blue-400 text-white text-xs px-2 py-1 rounded transition-colors"
              title="Look up your booking"
            >
              {bookingContext ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>#{bookingContext.bookingId}</span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" />
                  <span>My Booking</span>
                </>
              )}
              {showBookingForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Booking Lookup Form */}
          {showBookingForm && (
            <div className="border-b border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-3">
                Enter your booking details so I can access your reservation.
              </p>
              <form onSubmit={handleLoadBooking} className="space-y-2">
                <input
                  type="text"
                  placeholder="Booking ID (e.g. 42)"
                  value={bookingForm.bookingId}
                  onChange={(e) => setBookingForm((f) => ({ ...f, bookingId: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={bookingForm.lastName}
                  onChange={(e) => setBookingForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone (if no email)"
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {bookingFormError && (
                  <p className="text-xs text-red-600">{bookingFormError}</p>
                )}
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    "Load Booking"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : msg.isError
                      ? "bg-red-100 text-red-800 rounded-bl-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender === "user"
                        ? "text-blue-200"
                        : msg.isError
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

