import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { DailyCoachBriefing, WorkoutDay } from '../types';
import { Send, Loader2, Cpu, HeartPulse, Sparkles, X } from 'lucide-react';
import { MarkdownMessage } from '../components/coach/MarkdownMessage';
import { TrainingPlanModal } from '../components/coach/TrainingPlanModal';
import { VoiceCoachRecorder } from '../components/coach/VoiceCoachRecorder';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
}

export const CoachHubPage: React.FC = () => {
  const [briefing, setBriefing] = useState<DailyCoachBriefing | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [healthConditions, setHealthConditions] = useState<string[]>(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
      return storedUser.health_conditions || [];
    } catch (e) {
      return [];
    }
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "I analyze your acute and chronic workloads in real-time. Ask about target heart-rate zones, workout pacing, recovery protocols, or share any medical conditions so I can adapt your training safety parameters.",
      model_used: 'llama-3.3-70b-versatile',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getDailyBriefing().then(setBriefing).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    setInput('');
    const newMsgs = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res: any = await api.chatWithCoach(
        text.trim(),
        newMsgs.map((m) => ({ role: m.role, content: m.content }))
      );

      if (res.health_conditions) {
        setHealthConditions(res.health_conditions);
      }

      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          content: res.response,
          model_used: res.model_used || 'llama-3.3-70b-versatile',
        },
      ]);
    } catch (e: any) {
      toast.error('Coach failed to respond');
    } finally {
      setLoading(false);
    }
  };

  const removeCondition = (conditionName: string) => {
    const updated = healthConditions.filter((c) => c !== conditionName);
    setHealthConditions(updated);
    try {
      const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
      storedUser.health_conditions = updated;
      localStorage.setItem('runzone_user', JSON.stringify(storedUser));
      toast.success(`Removed ${conditionName} from health profile`);
    } catch (e) {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
              ZoneCoach console
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-panel border border-hairline text-[10px]">
              <Cpu className="w-3 h-3 text-cinder" />
              <span className="text-chalk font-display font-medium">Llama 3.3 70B · Groq</span>
            </div>
          </div>
          <p className="text-xs text-chalk-muted mt-0.5">
            Physiological training advice tailored to your ACWR fatigue ratio and resting heart rate
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlanModalOpen(true)}
            className="px-3.5 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Generate Plan</span>
          </button>
        </div>
      </div>

      {/* Active Medical & Health Profile Banner */}
      {healthConditions.length > 0 && (
        <div className="p-3 bg-[#221714] border border-[#C1432E]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <HeartPulse className="w-4 h-4 text-[#C1432E] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-display font-semibold text-chalk">
                Active Health Profile:
              </span>{' '}
              <span className="text-chalk-muted">
                ZoneCoach is continuously enforcing cardiovascular & safety constraints for:
              </span>
              <div className="inline-flex flex-wrap gap-1.5 ml-2 mt-1 sm:mt-0">
                {healthConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-night border border-[#C1432E]/40 text-[11px] text-chalk font-medium"
                  >
                    {cond}
                    <button
                      onClick={() => removeCondition(cond)}
                      className="text-chalk-dim hover:text-chalk ml-0.5"
                      title="Remove condition"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-chalk-dim italic font-sans shrink-0">
            Capping workouts to safe aerobic thresholds
          </div>
        </div>
      )}

      {/* Grid: Left Column & Chat Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Daily Prescription & Hands-Free Voice Assistant */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hands-Free Voice AI Coach */}
          <VoiceCoachRecorder
            onTranscriptionComplete={(userText) => {
              setMessages((prev) => [...prev, { role: 'user', content: userText }]);
            }}
            onAssistantResponse={(response, modelUsed) => {
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: response, model_used: modelUsed },
              ]);
            }}
          />

          {briefing && (
            <div className="bg-panel border border-hairline p-5 space-y-3">
              <div className="text-[11px] font-sans font-medium text-chalk-dim">
                Today's protocol
              </div>
              <h3 className="font-display text-base font-bold text-chalk">
                {briefing.title}
              </h3>
              <p className="text-xs text-chalk-muted leading-relaxed">
                {briefing.recommended_workout}
              </p>
              <div className="pt-2 hairline-t text-xs text-chalk-muted flex items-center justify-between">
                <span>Target intensity</span>
                <span className="font-display font-semibold text-chalk tabular">
                  {briefing.suggested_target_zone}
                </span>
              </div>
            </div>
          )}

          {/* Suggested Consultations */}
          <div className="bg-panel border border-hairline p-5 space-y-3">
            <h4 className="text-[11px] font-sans font-medium text-chalk-dim">
              Suggested questions
            </h4>
            <div className="space-y-1.5 text-xs">
              {[
                "I have a heart condition, what running pace is safe for me?",
                "How do I keep my pace strictly within Zone 2?",
                "What is my current ACWR score and injury risk?",
                "What supplements or electrolytes should I take for endurance?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left p-2.5 bg-night hover:bg-panel-light border border-hairline text-chalk-muted hover:text-chalk transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Chat Console */}
        <div className="lg:col-span-7 h-[580px] bg-panel border border-hairline flex flex-col overflow-hidden">
          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
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
                <span>ZoneCoach is querying Groq Llama 3.3 70B…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            noValidate
            className="p-3 hairline-t bg-night flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about training intensity, fatigue ratio, or pacing…"
              className="flex-1 px-3 py-2 bg-panel border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Clinical Sports Science Disclaimer */}
          <div className="px-3 py-1.5 bg-night hairline-t text-[10px] text-chalk-dim text-center font-sans">
            ZoneCoach provides athletic workload guidance based on exercise physiology. It does not provide medical diagnosis or replace clinical care.
          </div>
        </div>
      </div>

      {/* Adaptive Training Plan Modal */}
      <TrainingPlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
      />
    </div>
  );
};
