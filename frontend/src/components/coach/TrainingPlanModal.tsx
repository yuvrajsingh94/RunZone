import React, { useState } from 'react';
import { api } from '../../services/api';
import { AdaptiveTrainingPlan, WorkoutPlanGeneratorRequest, WorkoutDay } from '../../types';
import { Calendar, ChevronRight, Play, Loader2, Sparkles, HeartPulse, X, Award, CheckCircle2, Flame, Shield, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface TrainingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGPSRun?: (workout: WorkoutDay) => void;
}

export const TrainingPlanModal: React.FC<TrainingPlanModalProps> = ({
  isOpen,
  onClose,
  onStartGPSRun,
}) => {
  const [targetDistance, setTargetDistance] = useState<string>('10K');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [durationWeeks, setDurationWeeks] = useState<number>(4);
  const [fitnessLevel, setFitnessLevel] = useState<string>('Intermediate');
  const [loading, setLoading] = useState<boolean>(false);
  const [plan, setPlan] = useState<AdaptiveTrainingPlan | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(0);

  // Load active health conditions from user profile
  let activeConditions: string[] = [];
  try {
    const storedUser = JSON.parse(localStorage.getItem('runzone_user') || '{}');
    activeConditions = storedUser.health_conditions || [];
  } catch (e) {}

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const generatedPlan = await api.generateTrainingPlan({
        target_race_distance: targetDistance,
        days_per_week: daysPerWeek,
        duration_weeks: durationWeeks,
        fitness_level: fitnessLevel,
      });
      setPlan(generatedPlan);
      setActiveWeekIndex(0);
      toast.success('AI Adaptive Training Plan synthesized!');
    } catch (err: any) {
      toast.error('Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="bg-panel border border-hairline w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-night hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cinder" />
            <h2 className="font-display font-bold text-base text-chalk">
              ZoneCoach Adaptive Training Plan Generator
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-chalk-dim hover:text-chalk transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Active Health Notice */}
          {activeConditions.length > 0 && (
            <div className="p-3 bg-[#221714] border border-[#C1432E]/60 flex items-start gap-2.5 text-xs">
              <HeartPulse className="w-4 h-4 text-[#C1432E] shrink-0 mt-0.5" />
              <div>
                <span className="font-display font-semibold text-chalk">
                  Active Medical Profile Protected:
                </span>{' '}
                <span className="text-chalk-muted">
                  Your training plan will automatically enforce cardiovascular and physiological safety limits for: {activeConditions.join(', ')}.
                </span>
              </div>
            </div>
          )}

          {!plan ? (
            /* Plan Setup Form Wizard */
            <form onSubmit={handleGenerate} className="space-y-5 text-xs">
              <div>
                <label className="block text-chalk font-semibold mb-2 font-display">
                  1. Select Target Goal / Distance
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['5K', '10K', 'Half Marathon', 'Marathon', 'Territory Conquest'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDistance(d)}
                      className={`p-3 text-center border text-xs font-display font-medium transition-all ${
                        targetDistance === d
                          ? 'bg-cinder text-chalk border-cinder shadow-sm'
                          : 'bg-night border-hairline text-chalk-muted hover:text-chalk hover:bg-panel-light'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-chalk-muted mb-1 font-medium">
                    Plan Duration
                  </label>
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
                  >
                    <option value={4}>4 Weeks (Short Block)</option>
                    <option value={8}>8 Weeks (Base Builder)</option>
                    <option value={12}>12 Weeks (Full Race Peak)</option>
                  </select>
                </div>

                {/* Days Per Week */}
                <div>
                  <label className="block text-chalk-muted mb-1 font-medium">
                    Running Frequency
                  </label>
                  <select
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
                  >
                    <option value={3}>3 Days / Week (Balanced)</option>
                    <option value={4}>4 Days / Week (Optimal Sweet Spot)</option>
                    <option value={5}>5 Days / Week (Advanced)</option>
                  </select>
                </div>

                {/* Fitness Level */}
                <div>
                  <label className="block text-chalk-muted mb-1 font-medium">
                    Fitness Level
                  </label>
                  <select
                    value={fitnessLevel}
                    onChange={(e) => setFitnessLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
                  >
                    <option value="Beginner">Beginner (Building Aerobic Base)</option>
                    <option value="Intermediate">Intermediate (Regular Runner)</option>
                    <option value="Advanced">Advanced (Marathon / High Volume)</option>
                  </select>
                </div>
              </div>

              {/* Scientific Rationale Card */}
              <div className="p-4 bg-night border border-hairline space-y-1.5 text-chalk-muted text-[11px] leading-relaxed">
                <div className="font-display font-semibold text-chalk text-xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-contour" />
                  <span>Sports Physiology & ACWR Calibrated</span>
                </div>
                <p>
                  ZoneCoach calculates your periodization block according to Dr. Tim Gabbett's workload progression guidelines ($\le 10\%$ weekly mileage ramp) to optimize mitochondrial density while maintaining soft-tissue injury risk under $10\%$.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-display font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Periodized Plan with Groq Llama 3.3 70B…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>GENERATE ADAPTIVE TRAINING PLAN</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Generated Plan Interactive Calendar View */
            <div className="space-y-5">
              {/* Plan Overview Card */}
              <div className="p-4 bg-night border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                 <div>
                   <div className="text-[10px] text-chalk-dim uppercase font-display font-semibold">
                     {plan.duration_weeks}-Week Periodized Plan
                   </div>
                   <h3 className="font-display text-lg font-bold text-chalk mt-0.5">
                     {plan.plan_name || plan.plan_title}
                   </h3>
                   {(plan.medical_constraint_notes || plan.coach_strategy_notes) && (
                     <p className="text-xs text-chalk-muted mt-1">
                       {plan.medical_constraint_notes || plan.coach_strategy_notes}
                     </p>
                   )}
                 </div>

                 <button
                   onClick={() => setPlan(null)}
                   className="self-start sm:self-auto px-3 py-1.5 bg-panel-light hover:bg-panel border border-hairline text-chalk text-xs font-medium transition-colors"
                 >
                   Adjust Parameters
                 </button>
               </div>

               {/* Week Navigation Tabs */}
               <div className="flex gap-1.5 overflow-x-auto pb-1 hairline-b">
                 {plan.weeks.map((w, idx) => (
                   <button
                     key={w.week_number}
                     onClick={() => setActiveWeekIndex(idx)}
                     className={`px-4 py-2 border text-xs font-display font-semibold transition-all whitespace-nowrap ${
                       activeWeekIndex === idx
                         ? 'bg-cinder text-chalk border-cinder'
                         : 'bg-night border-hairline text-chalk-muted hover:text-chalk'
                     }`}
                   >
                     Week {w.week_number} ({w.total_distance_km || w.weekly_distance_km || 0} km)
                   </button>
                 ))}
               </div>

               {/* Active Week Workouts List */}
               {plan.weeks[activeWeekIndex] && (
                 <div className="space-y-3">
                   <div className="flex items-center justify-between text-xs text-chalk-muted">
                     <span className="font-display font-semibold text-chalk">
                       {plan.weeks[activeWeekIndex].theme}
                     </span>
                     <span className="font-display tabular">
                       Total: {plan.weeks[activeWeekIndex].total_distance_km || plan.weeks[activeWeekIndex].weekly_distance_km || 0} km · Target ACWR: {plan.weeks[activeWeekIndex].target_acwr || 1.15}
                     </span>
                   </div>

                   <div className="space-y-2.5">
                     {(plan.weeks[activeWeekIndex].workouts || plan.weeks[activeWeekIndex].days || []).map((workout, wIdx) => (
                      <div
                        key={wIdx}
                        className={`p-3.5 border transition-colors ${
                          workout.is_rest_day
                            ? 'bg-night/60 border-hairline/60 text-chalk-dim'
                            : 'bg-night border-hairline text-chalk hover:border-cinder/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-display font-bold text-chalk-muted uppercase">
                                {workout.day_name}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-sans font-medium border ${
                                  workout.workout_type === 'Long Run'
                                    ? 'bg-cinder/20 text-cinder border-cinder/40'
                                    : workout.workout_type === 'Tempo'
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : workout.is_rest_day
                                    ? 'bg-panel text-chalk-dim border-hairline'
                                    : 'bg-contour/20 text-contour border-contour/40'
                                }`}
                              >
                                {workout.workout_type}
                              </span>
                            </div>

                            <h4 className="font-display font-bold text-sm text-chalk">
                              {workout.title}
                            </h4>

                            <p className="text-xs text-chalk-muted leading-relaxed">
                              {workout.description}
                            </p>
                          </div>

                          {/* Telemetry & Action Pill */}
                          {!workout.is_rest_day && (
                            <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0 hairline-t sm:hairline-t-0 pt-2 sm:pt-0">
                              <div className="text-right">
                                <div className="font-display text-base font-bold text-chalk tabular">
                                  {workout.distance_km} km
                                </div>
                                <div className="text-[10px] text-chalk-dim tabular">
                                  {workout.target_pace}
                                </div>
                              </div>

                              {onStartGPSRun && (
                                <button
                                  onClick={() => {
                                    onStartGPSRun(workout);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 bg-cinder hover:bg-cinder-hover text-chalk text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Track run</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
