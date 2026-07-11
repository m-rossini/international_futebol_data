'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Copy, Check, RotateCcw } from 'lucide-react';
import { logApiCall, logUserAction } from '@/lib/observability';

const API = '/api/proxy';

const SUGGESTED_QUESTIONS = [
  'Which team has the most wins all time?',
  'Brazil vs Argentina head-to-head',
  'Who scored the most goals in the 2000s?',
  'What are the biggest World Cup victories?',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationResponse {
  answer: string;
  conversation_id: string;
}

function ChatBubble({
  message,
  index,
  onCopy,
  copiedIdx,
}: {
  message: ChatMessage;
  index: number;
  onCopy: (text: string, idx: number) => void;
  copiedIdx: number | null;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
        }`}
      >
        <div className="whitespace-pre-wrap break-words font-sans">{message.content}</div>

        {!isUser && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onCopy(message.content, index)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy answer"
            >
              {copiedIdx === index ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AskMeClient() {
  const [query, setQuery] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      /* noop */
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    logUserAction('askme_new_conversation');
    setConversationId(null);
    setHistory([]);
    setError(null);
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    logUserAction('askme_query', {
      query_length: trimmed.length,
      has_conversation: !!conversationId,
    });

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setHistory((prev) => [...prev, userMsg]);
    setQuery('');
    setError(null);
    setLoading(true);

    const t0 = performance.now();

    try {
      const res = await fetch(`${API}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          conversation_id: conversationId,
        }),
      });

      const duration = performance.now() - t0;
      logApiCall('/conversation', duration, res.status, {
        has_conversation: !!conversationId,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data: ConversationResponse = await res.json();

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.answer };
      setHistory((prev) => [...prev, assistantMsg]);
      setConversationId(data.conversation_id);
    } catch (err) {
      const duration = performance.now() - t0;
      logApiCall('/conversation', duration, 0, {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  }, [query, conversationId, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleSuggested = useCallback((q: string) => {
    logUserAction('askme_suggested_question', { question: q });
    setQuery(q);
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {history.length > 0 && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {history.map((msg, i) => (
            <ChatBubble key={i} message={msg} index={i} onCopy={handleCopy} copiedIdx={copiedIdx} />
          ))}
          <div ref={historyEndRef} />
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSuggested(q)}
              className="text-left text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            conversationId
              ? 'Ask a follow-up question...'
              : 'Which team has the most wins against Brazil?'
          }
          rows={2}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          disabled={loading}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send question"
          >
            <Send size={18} />
          </button>
          {conversationId && (
            <button
              type="button"
              onClick={handleNewConversation}
              className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
              title="New conversation"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 animate-pulse">Thinking...</p>}
    </div>
  );
}
