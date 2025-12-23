'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatMessage from './ChatMessage';

export default function ChatInterface({ chatId, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rfpContext, setRfpContext] = useState('');
  const messagesEndRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      createdAt: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    // If this is the first message, use it as RFP context
    const context = messages.length === 0 ? input : rfpContext || input;

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: input,
          rfpContext: context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage = {
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages([...messages, userMessage, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      router.refresh();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 float">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Start a conversation</h3>
            <p className="text-slate-500 max-w-md">
              Paste your RFP requirement or ask a question about your proposals. I'll help you craft winning responses.
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className="slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <ChatMessage message={message} />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start slide-up">
            <div className="flex items-center gap-2 bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-100">
              <div className="flex space-x-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <span className="text-sm text-slate-400 ml-2">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-4">
        <form onSubmit={handleSubmit}>
          {messages.length === 0 && (
            <div className="mb-4 fade-in">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                RFP Requirement (optional)
              </label>
              <textarea
                value={rfpContext}
                onChange={(e) => setRfpContext(e.target.value)}
                placeholder="Paste the RFP requirement here for better context..."
                className="input-primary resize-none"
                rows={3}
              />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-5 py-3.5 pr-12 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn-primary px-6 flex items-center gap-2"
            >
              <span>Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
