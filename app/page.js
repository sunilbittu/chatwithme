'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ api: '/api/chat' });

  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <main className="app">
      <header className="header">
        <h1>chatwithme</h1>
        <span className="model">nvidia nim</span>
      </header>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">Ask anything to get started.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            <div className="role">{m.role === 'user' ? 'You' : 'Assistant'}</div>
            {m.content}
          </div>
        ))}
        {error && <div className="error">Error: {error.message}</div>}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </main>
  );
}
