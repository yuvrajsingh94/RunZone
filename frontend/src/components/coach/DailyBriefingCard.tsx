import React from 'react';
import { DailyCoachBriefing } from '../../types';

interface DailyBriefingCardProps {
  briefing: DailyCoachBriefing | null;
  onOpenChat: () => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({ briefing, onOpenChat }) => {
  if (!briefing) {
    return (
      <div
        className="bg-panel border border-hairline p-5 h-72 flex items-center justify-center text-xs text-chalk-dim font-sans"
        aria-busy="true"
        aria-label="Loading coach briefing"
      >
        Generating morning briefing…
      </div>
    );
  }

  return (
    <div className="bg-panel border border-hairline p-5 space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-chalk">
              Coach briefing
            </h2>
            <p className="text-xs text-chalk-muted mt-0.5">
              Daily workload guidance and recovery protocol
            </p>
          </div>
          <button
            onClick={onOpenChat}
            className="text-xs font-medium text-chalk hover:text-cinder underline underline-offset-4 transition-colors"
          >
            Open coach chat
          </button>
        </div>

        {/* Assessment */}
        <div className="text-xs text-chalk-muted leading-relaxed font-sans">
          {briefing.greeting} {briefing.injury_risk_assessment}
        </div>

        {/* Prescribed Workout Block */}
        <div className="bg-night border border-hairline p-3 space-y-1.5">
          <div className="text-[11px] font-sans font-medium text-chalk-dim">
            Prescribed session
          </div>
          <div className="text-xs font-sans font-medium text-chalk leading-snug">
            {briefing.recommended_workout}
          </div>
          <div className="flex items-center gap-2 pt-1.5 hairline-t text-[11px] text-chalk-muted">
            <span>Target intensity:</span>
            <span className="font-display font-semibold text-chalk tabular">
              {briefing.suggested_target_zone}
            </span>
          </div>
        </div>
      </div>

      {/* Quote / Physiological Note */}
      {briefing.motivational_quote && (
        <div className="text-xs text-chalk-dim italic font-sans hairline-t pt-3">
          "{briefing.motivational_quote}"
        </div>
      )}
    </div>
  );
};
