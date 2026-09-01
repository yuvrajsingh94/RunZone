import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Send, Loader2, Cpu } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import toast from 'react-hot-toast';

interface CoachChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
}

export const CoachChatDrawer: React.FC<CoachChatDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "I monitor your acute and chronic workloads. Ask about today's target pace, recovery protocols, or how a planned route will affect your fatigue ratio.",
      model_used: 'llama-3.3-70b-versatile',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await api.chatWithCoach(
        userText,
        newMessages.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.response,
          model_used: res.model_used || 'llama-3.3-70b-versatile',
        },
      ]);
    } catch (err: any) {
      toast.error('Coach failed to respond. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 animate-fade-in" role="dialog" aria-modal="true" aria-label="AI Coach chat panel">
      <div className="w-full max-w-md bg-panel hairline-l flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 hairline-b flex items-center justify-between bg-night">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-chalk">
                ZoneCoach utility panel
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 bg-panel border border-hairline font-display text-chalk-muted flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5 text-cinder" />
                Llama 3.3 70B
              </span>
            </div>
            <p className="text-[11px] text-chalk-muted font-sans mt-0.5">
              Workload and physiology consultation
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat panel"
            className="p-1 text-chalk-muted hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {messages.map((m, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-chalk-dim">
                <span>{m.role === 'user' ? 'You' : 'ZoneCoach'}</span>
                {m.model_used && (
                  <span className="font-display text-[9px] text-chalk-dim">
                    {m.model_used}
                  </span>
                )}
              </div>
              <div
                className={`p-3.5 text-xs leading-relaxed border transition-colors ${
                  m.role === 'user'
                    ? 'bg-night text-chalk border-hairline'
                    : m.model_used?.includes('Emergency')
                    ? 'bg-[#2A1715] text-chalk border-[#C1432E] shadow-sm'
                    : m.model_used?.includes('Security') || m.model_used?.includes('Domain')
                    ? 'bg-[#2A2315] text-chalk border-[#C98A2E]'
                    : 'bg-panel-light text-chalk border-hairline'
                }`}
              >
                {m.role === 'assistant' ? (
                  <MarkdownMessage content={m.content} />
                ) : (
                  <div className="text-chalk font-sans">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-chalk-dim py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cinder" />
              <span>Analyzing workload data via Groq…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} noValidate className="p-3 hairline-t bg-night flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pacing, fatigue, or recovery…"
            className="flex-1 px-3 py-2 bg-panel border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="px-3.5 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk text-xs font-medium flex items-center justify-center transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Clinical Sports Science Disclaimer */}
        <div className="px-3 py-1.5 bg-night hairline-t text-[10px] text-chalk-dim text-center font-sans">
          Athletic workload guidance based on exercise physiology. Does not provide medical diagnosis.
        </div>
      </div>
    </div>
  );
};
