import React, { useState } from 'react';
import { api } from '../../services/api';
import { User, DailyCoachBriefing } from '../../types';
import { ChevronRight, Loader2, Cpu, TrendingUp, Target, Zap, Map, Activity } from 'lucide-react';

interface Props {
  user: User;
  onComplete: (updatedUser: User) => void;
  onSkip: (updatedUser: User) => void;
}

type ExperienceLevel = 'beginner' | 'regular' | 'endurance';
type TrainingGoal = 'aerobic_base' | 'first_5k_10k' | 'speed_pr' | 'territory';
type WeeklyFrequency = '2_3' | '4_5' | '6_plus';

const HEALTH_CONDITION_OPTIONS = [
  'None',
  'Knee / Patellar Issue',
  'Shin Splints',
  'Asthma / Breathing Condition',
  'Hypertension',
  'Heart Condition',
  'Plantar Fasciitis',
  'Back Pain',
];

export const OnboardingModal: React.FC<Props> = ({ user, onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [frequency, setFrequency] = useState<WeeklyFrequency | null>(null);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [briefing, setBriefing] = useState<DailyCoachBriefing | null>(null);
  const [briefingError, setBriefingError] = useState(false);

  const totalSteps = 4;
  const progress = ((step - 1) / totalSteps) * 100;

  const toggleCondition = (c: string) => {
    if (c === 'None') { setHealthConditions(['None']); return; }
    setHealthConditions((prev) => {
      const without = prev.filter((x) => x !== 'None');
      return without.includes(c) ? without.filter((x) => x !== c) : [...without, c];
    });
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      const updated = await api.submitOnboarding({ action: 'skip' });
      onSkip(updated);
    } catch {
      onSkip({ ...user, onboarding_status: 'skipped' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!experience || !goal || !frequency) return;
    setSubmitting(true);
    try {
      const conditions = healthConditions.filter((c) => c !== 'None');
      const updated = await api.submitOnboarding({
        action: 'complete',
        experience_level: experience,
        training_goal: goal,
        weekly_frequency: frequency,
        health_conditions: conditions,
      });
      setStep(5);
      try {
        const b = await api.getDailyBriefing();
        setBriefing(b);
      } catch {
        setBriefingError(true);
      }
      onComplete(updated);
    } catch {
      const fallbackUpdated: User = {
        ...user,
        onboarding_status: 'completed',
        experience_level: experience,
        training_goal: goal,
        weekly_frequency: frequency,
        health_conditions: healthConditions.filter((c) => c !== 'None'),
      };
      setStep(5);
      try {
        const b = await api.getDailyBriefing();
        setBriefing(b);
      } catch {
        setBriefingError(true);
      }
      onComplete(fallbackUpdated);
    } finally {
      setSubmitting(false);
    }

  };

  const canAdvance = () => {
    if (step === 1) return experience !== null;
    if (step === 2) return goal !== null;
    if (step === 3) return frequency !== null;
    if (step === 4) return true;
    return false;
  };

  const nextStep = () => {
    if (step < 4) setStep((s) => s + 1);
    else handleComplete();
  };

  const OptionBtn = ({
    label, sub, value, selected, onClick, icon: Icon,
  }: {
    label: string; sub?: string; value: string; selected: boolean;
    onClick: () => void; icon?: React.FC<{ className?: string }>;
  }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 border transition-all font-sans ${
        selected
          ? 'border-cinder bg-cinder/10 text-chalk'
          : 'border-hairline bg-panel text-chalk-muted hover:border-cinder/50 hover:text-chalk'
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-cinder' : 'text-chalk-muted'}`} />}
        <div>
          <div className="text-sm font-display font-semibold">{label}</div>
          {sub && <div className="text-[11px] text-chalk-muted mt-0.5">{sub}</div>}
        </div>
        {selected && (
          <div className="ml-auto w-4 h-4 rounded-full bg-cinder flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-chalk" />
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-night border border-hairline shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-night border-b border-hairline">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cinder" />
            <span className="font-display text-xs font-semibold text-chalk tracking-wide uppercase">
              ZoneCoach Calibration
            </span>
          </div>
          {step < 5 && (
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="text-chalk-muted text-xs hover:text-chalk transition-colors disabled:opacity-40"
            >
              skip setup
            </button>
          )}
        </div>

        {/* Progress bar */}
        {step < 5 && (
          <div className="px-5 pt-3 pb-2">
            <div className="h-0.5 bg-hairline w-full">
              <div
                className="h-0.5 bg-cinder transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-chalk-muted mt-1">Question {step} of {totalSteps}</div>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 flex-1">

          {/* Payoff line — Q1 only */}
          {step === 1 && (
            <p className="text-xs text-chalk-muted border-l-2 border-cinder pl-3 leading-relaxed">
              Three questions to personalise your ZoneCoach. Your ACWR and Karvonen zones always remain the primary coaching input — this profile adds context on top.
            </p>
          )}

          {/* Q1: Experience */}
          {step === 1 && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-chalk text-base">How would you describe your running experience?</h2>
              <div className="space-y-2 mt-1">
                <OptionBtn label="Beginner" sub="Just starting out or returning after a long break" value="beginner" selected={experience === 'beginner'} onClick={() => setExperience('beginner')} icon={Activity} />
                <OptionBtn label="Regular" sub="Consistent runner, comfortable with 5K–15K distances" value="regular" selected={experience === 'regular'} onClick={() => setExperience('regular')} icon={TrendingUp} />
                <OptionBtn label="Endurance" sub="Long-distance runner, half marathon or beyond" value="endurance" selected={experience === 'endurance'} onClick={() => setExperience('endurance')} icon={Zap} />
              </div>
            </div>
          )}

          {/* Q2: Goal */}
          {step === 2 && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-chalk text-base">What is your primary training goal?</h2>
              <div className="space-y-2 mt-1">
                <OptionBtn label="Build Aerobic Base" sub="Zone 2 fitness, heart health, and endurance foundation" value="aerobic_base" selected={goal === 'aerobic_base'} onClick={() => setGoal('aerobic_base')} icon={Activity} />
                <OptionBtn label="First 5K / 10K" sub="Race-readiness and distance progression" value="first_5k_10k" selected={goal === 'first_5k_10k'} onClick={() => setGoal('first_5k_10k')} icon={Target} />
                <OptionBtn label="Speed PR" sub="Pace targets, intervals, and lactate threshold improvement" value="speed_pr" selected={goal === 'speed_pr'} onClick={() => setGoal('speed_pr')} icon={Zap} />
                <OptionBtn label="Territory Conquest" sub="RunZone map dominance — patrol routes and sector capture" value="territory" selected={goal === 'territory'} onClick={() => setGoal('territory')} icon={Map} />
              </div>
            </div>
          )}

          {/* Q3: Frequency */}
          {step === 3 && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-chalk text-base">How many days per week do you train?</h2>
              <div className="space-y-2 mt-1">
                <OptionBtn label="2–3 days / week" sub="Moderate schedule, recovery-focused" value="2_3" selected={frequency === '2_3'} onClick={() => setFrequency('2_3')} icon={Activity} />
                <OptionBtn label="4–5 days / week" sub="Structured training plan, building capacity" value="4_5" selected={frequency === '4_5'} onClick={() => setFrequency('4_5')} icon={TrendingUp} />
                <OptionBtn label="6+ days / week" sub="High-volume, disciplined periodisation" value="6_plus" selected={frequency === '6_plus'} onClick={() => setFrequency('6_plus')} icon={Zap} />
              </div>
            </div>
          )}

          {/* Q4: Health conditions */}
          {step === 4 && (
            <div className="space-y-2">
              <h2 className="font-display font-bold text-chalk text-base">Any health conditions ZoneCoach should know about?</h2>
              <p className="text-[11px] text-chalk-muted">Select all that apply. These affect all workout and pacing recommendations.</p>
              <div className="space-y-1.5 mt-1">
                {HEALTH_CONDITION_OPTIONS.map((c) => {
                  const selected = healthConditions.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCondition(c)}
                      className={`w-full text-left px-4 py-3 border text-sm font-sans transition-all ${
                        selected
                          ? 'border-cinder bg-cinder/10 text-chalk font-semibold'
                          : 'border-hairline bg-panel text-chalk-muted hover:border-cinder/50 hover:text-chalk'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-all ${selected ? 'border-cinder bg-cinder' : 'border-hairline'}`}>
                          {selected && <div className="w-2 h-2 bg-chalk" />}
                        </div>
                        {c}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Calibration payoff */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cinder animate-pulse" />
                <span className="font-display text-sm font-semibold text-chalk">Profile calibrated — your first briefing</span>
              </div>
              {briefingError ? (
                <p className="text-sm text-chalk-muted border border-hairline p-3">
                  Profile saved successfully. Your personalised briefing will appear in the Coach Hub when you open it.
                </p>
              ) : !briefing ? (
                <div className="flex items-center gap-2 text-chalk-muted text-sm border border-hairline p-4">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  Generating your first personalised briefing…
                </div>
              ) : (
                <div className="border border-cinder/30 bg-cinder/5 p-4 space-y-3">
                  <div className="font-display font-bold text-chalk text-sm leading-tight">{briefing.title}</div>
                  <div className="text-xs text-chalk-muted">{briefing.greeting}</div>
                  <div className="border-t border-hairline pt-3 text-xs text-chalk leading-relaxed">{briefing.recommended_workout}</div>
                  <div className="text-[11px] text-chalk-muted">Target zone: {briefing.suggested_target_zone}</div>
                  <div className="text-[11px] text-chalk-muted italic border-t border-hairline pt-2">{briefing.motivational_quote}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 sticky bottom-0 bg-night border-t border-hairline pt-3">
          {step < 5 ? (
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-3 border border-hairline text-chalk-muted text-xs hover:text-chalk hover:border-cinder/40 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                disabled={!canAdvance() || submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cinder hover:bg-cinder/80 disabled:opacity-40 disabled:cursor-not-allowed text-chalk font-display font-semibold text-sm transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {step === 4 ? 'Calibrate my ZoneCoach →' : 'Continue'}
                    {step !== 4 && <ChevronRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                // If the briefing is shown or errored, close modal
                if (briefing || briefingError) {
                  // modal closes by onComplete having updated user or by closing state
                  window.dispatchEvent(new CustomEvent('onboarding:close'));
                }
              }}
              disabled={!briefing && !briefingError}
              className="w-full flex items-center justify-center px-4 py-3 bg-cinder hover:bg-cinder/80 disabled:opacity-40 text-chalk font-display font-semibold text-sm transition-colors"
            >
              Get Started →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
