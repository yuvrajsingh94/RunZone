import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DailyCoachBriefing, User } from '../types';
import {
  Cpu,
  Target,
  Zap,
  TrendingUp,
  Map,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bot,
  Activity,
  HeartPulse,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ExperienceLevel = 'beginner' | 'regular' | 'endurance';
type TrainingGoal = 'aerobic_base' | 'first_5k_10k' | 'speed_pr' | 'territory';
type WeeklyFrequency = '2_3' | '4_5' | '6_plus';

const HEALTH_OPTIONS = [
  { id: 'None', label: 'None (Fully Healthy)' },
  { id: 'Knee / Patellar Issue', label: 'Knee / Patellar Strain' },
  { id: 'Shin Splints', label: 'Shin Splints' },
  { id: 'Asthma / Breathing Condition', label: 'Asthma / Respiratory Condition' },
  { id: 'Hypertension', label: 'Hypertension (High BP)' },
  { id: 'Heart Condition', label: 'Cardiovascular / Heart Condition' },
  { id: 'Plantar Fasciitis', label: 'Plantar Fasciitis' },
  { id: 'Back Pain', label: 'Lower Back / Spine Strain' },
];

export const OnboardingPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [experience, setExperience] = useState<ExperienceLevel>((user?.experience_level as ExperienceLevel) || 'regular');
  const [goal, setGoal] = useState<TrainingGoal>((user?.training_goal as TrainingGoal) || 'aerobic_base');
  const [frequency, setFrequency] = useState<WeeklyFrequency>((user?.weekly_frequency as WeeklyFrequency) || '4_5');
  const [conditions, setConditions] = useState<string[]>(() => {
    if (user?.health_conditions && user.health_conditions.length > 0) {
      return user.health_conditions;
    }
    return ['None'];
  });

  const [saving, setSaving] = useState(false);
  const [calibratedBriefing, setCalibratedBriefing] = useState<DailyCoachBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.experience_level) setExperience(user.experience_level as ExperienceLevel);
      if (user.training_goal) setGoal(user.training_goal as TrainingGoal);
      if (user.weekly_frequency) setFrequency(user.weekly_frequency as WeeklyFrequency);
      if (user.health_conditions && user.health_conditions.length > 0) {
        setConditions(user.health_conditions);
      }
    }
  }, [user]);

  const toggleCondition = (cond: string) => {
    if (cond === 'None') {
      setConditions(['None']);
      return;
    }
    setConditions((prev) => {
      const withoutNone = prev.filter((c) => c !== 'None');
      if (withoutNone.includes(cond)) {
        const next = withoutNone.filter((c) => c !== cond);
        return next.length === 0 ? ['None'] : next;
      } else {
        return [...withoutNone, cond];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const activeConditions = conditions.filter((c) => c !== 'None');

    try {
      const updatedUser = await api.submitOnboarding({
        action: 'complete',
        experience_level: experience,
        training_goal: goal,
        weekly_frequency: frequency,
        health_conditions: activeConditions,
      });

      updateUser(updatedUser);
      toast.success('Runner profile saved! ZoneCoach prompt calibrated.');

      setBriefingLoading(true);
      try {
        const freshBriefing = await api.getDailyBriefing();
        setCalibratedBriefing(freshBriefing);
      } catch (err) {
        console.warn('Briefing refresh note:', err);
      } finally {
        setBriefingLoading(false);
      }
    } catch (e) {
      if (user) {
        const fallbackUser: User = {
          ...user,
          onboarding_status: 'completed',
          experience_level: experience,
          training_goal: goal,
          weekly_frequency: frequency,
          health_conditions: activeConditions,
        };
        updateUser(fallbackUser);
        toast.success('Runner profile saved locally.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto font-sans space-y-8 animate-fade-in">
      {/* Top Banner / Header */}
      <div className="bg-panel border border-hairline p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cinder/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-cinder/10 border border-cinder/20 text-cinder text-[11px] font-display font-semibold uppercase tracking-wider">
                Tier 2 Prompt Injection Engine
              </span>
              <span className="text-chalk-dim text-xs font-display">· Groq Llama 3.3 70B</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-chalk tracking-tight">
              Runner Calibration Quiz (4 Core Questions)
            </h1>
            <p className="text-xs sm:text-sm text-chalk-muted mt-1 max-w-2xl">
              These 4 questions calibrate your AI Coach prompt profile. Every training response, 
              heart-rate zone recommendation, and workout progression directly adapts to your answers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => navigate('/coach')}
              className="px-4 py-2 bg-panel-light hover:bg-panel border border-hairline text-chalk text-xs font-display font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-cinder" />
              <span>Open AI Coach Console</span>
              <ArrowRight className="w-3.5 h-3.5 text-chalk-dim" />
            </button>
          </div>
        </div>

        {/* Current User Snapshot Strip */}
        <div className="mt-6 pt-4 border-t border-hairline grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-chalk-dim text-[11px] block">Current Status</span>
            <span className="font-display font-semibold text-chalk flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${user?.onboarding_status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {user?.onboarding_status === 'completed' ? 'Calibrated & Active' : 'Pending Calibration'}
            </span>
          </div>
          <div>
            <span className="text-chalk-dim text-[11px] block">Saved Experience</span>
            <span className="font-display font-semibold text-chalk capitalize mt-0.5 block">
              {user?.experience_level || 'regular'}
            </span>
          </div>
          <div>
            <span className="text-chalk-dim text-[11px] block">Saved Goal</span>
            <span className="font-display font-semibold text-chalk mt-0.5 block">
              {user?.training_goal ? user.training_goal.replace(/_/g, ' ') : 'Aerobic Base'}
            </span>
          </div>
          <div>
            <span className="text-chalk-dim text-[11px] block">Active Health Safety</span>
            <span className="font-display font-semibold text-cinder mt-0.5 block">
              {user?.health_conditions && user.health_conditions.length > 0
                ? `${user.health_conditions.length} condition(s) active`
                : 'Zero clinical restrictions'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Interactive Questions Grid */}
      <div className="space-y-6">

        {/* Question 1: Experience Level */}
        <div className="bg-panel border border-hairline p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cinder/10 text-cinder font-display font-bold text-xs flex items-center justify-center border border-cinder/30">
              1
            </span>
            <h2 className="font-display font-semibold text-sm sm:text-base text-chalk">
              Running Experience Level
            </h2>
          </div>
          <p className="text-xs text-chalk-muted pl-8">
            Select your current running consistency and base foundation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-8">
            {[
              {
                id: 'beginner' as const,
                title: 'Beginner',
                subtitle: 'New to structured running (< 15 km/week). Focuses on walk-run intervals and joint adaptation.',
                icon: Activity,
              },
              {
                id: 'regular' as const,
                title: 'Regular Runner',
                subtitle: 'Consistent baseline (15–40 km/week). Comfortable with continuous Zone 2 aerobic base runs.',
                icon: TrendingUp,
              },
              {
                id: 'endurance' as const,
                title: 'Endurance Athlete',
                subtitle: 'Experienced distance runner (40+ km/week). Training for half-marathon, marathon, or ultra.',
                icon: Zap,
              },
            ].map((opt) => {
              const isSelected = experience === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id)}
                  className={`p-4 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-cinder bg-cinder/10 shadow-sm'
                      : 'border-hairline bg-night hover:border-cinder/40 hover:bg-panel-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cinder' : 'text-chalk-muted'}`} />
                      <span className="font-display font-bold text-xs text-chalk">{opt.title}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cinder shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-chalk-muted leading-relaxed">{opt.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 2: Primary Training Goal */}
        <div className="bg-panel border border-hairline p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cinder/10 text-cinder font-display font-bold text-xs flex items-center justify-center border border-cinder/30">
              2
            </span>
            <h2 className="font-display font-semibold text-sm sm:text-base text-chalk">
              Primary Training Goal
            </h2>
          </div>
          <p className="text-xs text-chalk-muted pl-8">
            Tell ZoneCoach what physiological outcome you are targeting:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pl-8">
            {[
              {
                id: 'aerobic_base' as const,
                title: 'Aerobic Base',
                sub: 'Expand mitochondrial density & cardiovascular efficiency with low Zone 2 pacing.',
                icon: HeartPulse,
              },
              {
                id: 'first_5k_10k' as const,
                title: '5K / 10K Target',
                sub: 'Build stamina to complete a target distance without walking breaks.',
                icon: Target,
              },
              {
                id: 'speed_pr' as const,
                title: 'Speed & PR',
                sub: 'Optimize lactate threshold, 175+ SPM cadence, and VO2 max intervals.',
                icon: Zap,
              },
              {
                id: 'territory' as const,
                title: 'Territory Conquest',
                sub: 'Capture high-density 40m PostGIS street polygons and sector defense points.',
                icon: Map,
              },
            ].map((opt) => {
              const isSelected = goal === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGoal(opt.id)}
                  className={`p-4 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-cinder bg-cinder/10 shadow-sm'
                      : 'border-hairline bg-night hover:border-cinder/40 hover:bg-panel-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cinder' : 'text-chalk-muted'}`} />
                      <span className="font-display font-bold text-xs text-chalk">{opt.title}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cinder shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-chalk-muted leading-relaxed">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 3: Weekly Training Frequency */}
        <div className="bg-panel border border-hairline p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cinder/10 text-cinder font-display font-bold text-xs flex items-center justify-center border border-cinder/30">
              3
            </span>
            <h2 className="font-display font-semibold text-sm sm:text-base text-chalk">
              Weekly Training Frequency
            </h2>
          </div>
          <p className="text-xs text-chalk-muted pl-8">
            How many sessions per week do you plan to log?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-8">
            {[
              {
                id: '2_3' as const,
                title: '2 – 3 Days / Week',
                sub: 'Recovery-focused cadence with ample rest days for joint preservation.',
              },
              {
                id: '4_5' as const,
                title: '4 – 5 Days / Week',
                sub: 'Optimal sweet spot balancing progressive load with tissue remodeling.',
              },
              {
                id: '6_plus' as const,
                title: '6+ Days / Week',
                sub: 'High volume periodization requiring strict ACWR and sleep monitoring.',
              },
            ].map((opt) => {
              const isSelected = frequency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFrequency(opt.id)}
                  className={`p-4 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-cinder bg-cinder/10 shadow-sm'
                      : 'border-hairline bg-night hover:border-cinder/40 hover:bg-panel-light'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-xs text-chalk">{opt.title}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cinder shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-chalk-muted leading-relaxed">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 4: Health & Injury Conditions (Tier 1 Clinical Safety) */}
        <div className="bg-panel border border-hairline p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cinder/10 text-cinder font-display font-bold text-xs flex items-center justify-center border border-cinder/30">
              4
            </span>
            <h2 className="font-display font-semibold text-sm sm:text-base text-chalk">
              Health, Heart, or Injury Restrictions
            </h2>
          </div>
          <p className="text-xs text-chalk-muted pl-8">
            Select any active medical conditions or injury concerns. ZoneCoach uses this as a clinical 
            hard safety ceiling (e.g., capping heart rate at Zone 2, restricting high impact volume).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pl-8">
            {HEALTH_OPTIONS.map((opt) => {
              const isSelected = conditions.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleCondition(opt.id)}
                  className={`px-3 py-2.5 text-left border text-xs font-display transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? opt.id === 'None'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-chalk'
                        : 'border-cinder bg-cinder/10 text-chalk font-semibold'
                      : 'border-hairline bg-night text-chalk-muted hover:text-chalk hover:border-hairline-strong'
                  }`}
                >
                  <span className="truncate mr-2">{opt.label}</span>
                  {isSelected ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${opt.id === 'None' ? 'text-emerald-400' : 'text-cinder'}`} />
                  ) : (
                    <div className="w-3.5 h-3.5 border border-hairline rounded-sm shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Save Action Bar */}
      <div className="bg-night border border-hairline p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-chalk-muted">
          <ShieldCheck className="w-4 h-4 text-cinder shrink-0" />
          <span>
            Saving automatically writes to your PostgreSQL athlete record and instantly updates the LLM prompt context.
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setExperience('regular');
              setGoal('aerobic_base');
              setFrequency('4_5');
              setConditions(['None']);
            }}
            type="button"
            className="px-4 py-2 border border-hairline hover:bg-panel text-chalk-muted hover:text-chalk text-xs font-display transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="px-6 py-2.5 bg-cinder hover:bg-cinder-hover disabled:opacity-70 text-chalk text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Calibrating AI Coach…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save & Calibrate Coach</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Calibrated Payoff Preview */}
      {(calibratedBriefing || briefingLoading) && (
        <div className="bg-panel border border-hairline p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cinder" />
              <h3 className="font-display font-bold text-sm text-chalk uppercase tracking-wide">
                Live Calibrated Payoff · ZoneCoach Daily Briefing
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-cinder/10 border border-cinder/30 text-cinder font-display font-medium">
              Direct Groq Synthesis
            </span>
          </div>

          {briefingLoading ? (
            <div className="py-8 flex items-center justify-center text-xs text-chalk-muted font-display gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-cinder" />
              <span>Synthesizing personalized briefing for your new profile…</span>
            </div>
          ) : calibratedBriefing ? (
            <div className="space-y-3 text-xs">
              <div className="text-base font-display font-bold text-chalk">
                {calibratedBriefing.title}
              </div>
              <p className="text-chalk-muted leading-relaxed">
                {calibratedBriefing.greeting} {calibratedBriefing.injury_risk_assessment}
              </p>
              <div className="p-3 bg-night border border-hairline space-y-1">
                <div className="text-[10px] font-display uppercase tracking-wider text-cinder font-bold">
                  Recommended Workout
                </div>
                <div className="font-display font-semibold text-chalk text-xs">
                  {calibratedBriefing.recommended_workout}
                </div>
                <div className="text-chalk-dim text-[11px]">
                  Target Zone: <span className="text-chalk">{calibratedBriefing.suggested_target_zone}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => navigate('/coach')}
                  className="px-4 py-2 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Start Chatting with ZoneCoach</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
