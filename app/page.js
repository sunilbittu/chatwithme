'use client';

import { useChat } from 'ai/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ api: '/api/chat' });

  const [files, setFiles] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const previewUrl = useMemo(() => {
    if (!files || !files[0]) return null;
    return URL.createObjectURL(files[0]);
  }, [files]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onSubmit = (e) => {
    handleSubmit(e, files ? { experimental_attachments: files } : undefined);
    setFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSend = !isLoading && (input.trim() || files?.length);

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
            {m.experimental_attachments
              ?.filter((a) => a.contentType?.startsWith('image/'))
              .map((a, i) => (
                <img
                  key={`${m.id}-att-${i}`}
                  src={a.url}
                  alt={a.name || 'attachment'}
                  className="attachment"
                />
              ))}
            {m.content}
          </div>
        ))}
        {error && <div className="error">Error: {error.message}</div>}
      </div>

      {previewUrl && (
        <div className="previews">
          <div className="preview">
            <img src={previewUrl} alt="preview" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => {
                setFiles(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form className="form" onSubmit={onSubmit}>
        <button
          type="button"
          className="attach"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          title="Attach image"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFiles(e.target.files?.length ? e.target.files : null)}
        />
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={!canSend}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </main>
  );
}
