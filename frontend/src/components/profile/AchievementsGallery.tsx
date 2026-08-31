import React from 'react';
import { Award, Trophy, Shield, Zap, Sparkles, CheckCircle2, Lock, Flame, Mountain, Radio, Moon } from 'lucide-react';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'Territory' | 'Physiology' | 'Mileage' | 'Tactical';
  description: string;
  icon: React.ReactNode;
  isUnlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  unit: string;
  unlockedDate?: string;
  xpReward: number;
}

export const AchievementsGallery: React.FC = () => {
  const BADGES: AchievementBadge[] = [
    {
      id: 'sweet_spot_master',
      title: 'Sweet-Spot Disciplinarian',
      category: 'Physiology',
      description: 'Maintain 14 consecutive days within the optimal 0.80–1.30 ACWR sweet spot.',
      icon: <Shield className="w-5 h-5 text-contour" />,
      isUnlocked: true,
      progressCurrent: 14,
      progressTarget: 14,
      unit: 'days',
      unlockedDate: 'Aug 24, 2026',
      xpReward: 1500,
    },
    {
      id: 'century_mileage',
      title: 'Century Mileage Raider',
      category: 'Mileage',
      description: 'Log over 100 km of cumulative running volume.',
      icon: <Flame className="w-5 h-5 text-cinder" />,
      isUnlocked: true,
      progressCurrent: 142.5,
      progressTarget: 100,
      unit: 'km',
      unlockedDate: 'Aug 18, 2026',
      xpReward: 2000,
    },
    {
      id: 'territory_overlord',
      title: 'Territory Overlord',
      category: 'Territory',
      description: 'Hold over 5.00 km² of fortified PostGIS sector buffers.',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      isUnlocked: false,
      progressCurrent: 4.82,
      progressTarget: 5.00,
      unit: 'km²',
      xpReward: 2500,
    },
    {
      id: 'voice_commander',
      title: 'Voice Commander',
      category: 'Tactical',
      description: 'Complete 5 hands-free voice coaching consultations with ZoneCoach.',
      icon: <Radio className="w-5 h-5 text-purple-400" />,
      isUnlocked: false,
      progressCurrent: 3,
      progressTarget: 5,
      unit: 'sessions',
      xpReward: 1000,
    },
    {
      id: 'ridge_raider',
      title: 'Ridge Raider (Elevation)',
      category: 'Mileage',
      description: 'Climb 1,000 meters of cumulative elevation across your sector routes.',
      icon: <Mountain className="w-5 h-5 text-blue-400" />,
      isUnlocked: false,
      progressCurrent: 640,
      progressTarget: 1000,
      unit: 'm',
      xpReward: 1800,
    },
    {
      id: 'night_recon',
      title: 'Night Recon Specialist',
      category: 'Tactical',
      description: 'Capture territory sectors on 3 runs started after 8:00 PM.',
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      isUnlocked: true,
      progressCurrent: 3,
      progressTarget: 3,
      unit: 'runs',
      unlockedDate: 'Aug 28, 2026',
      xpReward: 1200,
    },
  ];

  const currentLevel = 7;
  const currentXP = 6450;
  const nextLevelXP = 8000;
  const levelProgress = Math.round(((currentXP - 5000) / (nextLevelXP - 5000)) * 100);

  return (
    <div className="space-y-5 font-sans">
      {/* XP Level-Up Progress Card */}
      <div className="bg-panel border border-hairline p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cinder/20 border border-cinder flex items-center justify-center font-display font-bold text-lg text-chalk">
              L{currentLevel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-chalk">
                  Level {currentLevel} · Veteran Raider
                </h3>
                <span className="px-2 py-0.5 bg-cinder/20 border border-cinder/40 text-[10px] text-chalk font-display font-semibold">
                  Gold Tier
                </span>
              </div>
              <p className="text-xs text-chalk-muted mt-0.5">
                Next Rank: <strong className="text-chalk">Level 8 (Diamond Vanguard)</strong> · Unlocks Custom Corridor Shaders
              </p>
            </div>
          </div>

          <div className="text-right font-display tabular text-xs">
            <span className="text-chalk font-bold">{currentXP.toLocaleString()}</span>
            <span className="text-chalk-dim"> / {nextLevelXP.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-night border border-hairline h-2.5 overflow-hidden">
          <div
            className="bg-cinder h-full transition-all duration-700"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-sm font-bold text-chalk flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Athlete Trophies & Tactical Badges</span>
          </h3>
          <span className="text-xs text-chalk-dim font-display tabular">
            3 of 6 Unlocked (+4,700 XP Earned)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES.map((badge) => {
            const pct = Math.min(100, Math.round((badge.progressCurrent / badge.progressTarget) * 100));
            return (
              <div
                key={badge.id}
                className={`p-4 border flex flex-col justify-between space-y-3 transition-all ${
                  badge.isUnlocked
                    ? 'bg-night border-hairline-strong hover:border-cinder/50'
                    : 'bg-panel/60 border-hairline/60 opacity-80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 bg-panel border border-hairline">
                      {badge.icon}
                    </div>

                    <div className="flex items-center gap-1">
                      {badge.isUnlocked ? (
                        <span className="px-1.5 py-0.5 bg-contour/20 border border-contour/40 text-[10px] text-contour font-display font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-night border border-hairline text-[10px] text-chalk-dim font-display font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-sm text-chalk">
                      {badge.title}
                    </h4>
                    <p className="text-[11px] text-chalk-muted leading-relaxed mt-0.5">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 hairline-t text-xs">
                  <div className="flex justify-between font-display text-[11px] tabular">
                    <span className="text-chalk-dim">
                      {badge.progressCurrent} / {badge.progressTarget} {badge.unit}
                    </span>
                    <span className="font-semibold text-chalk">{pct}%</span>
                  </div>

                  <div className="w-full bg-panel border border-hairline h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${badge.isUnlocked ? 'bg-contour' : 'bg-cinder'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-chalk-dim pt-0.5 font-display">
                    <span>Reward: +{badge.xpReward} XP</span>
                    {badge.unlockedDate && <span>{badge.unlockedDate}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
