import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LeaderboardEntry, SeasonInfo, FactionStanding } from '../types';
import { Shield, Flame, Trophy, Award, Clock, Zap, ArrowUpRight, CheckCircle2, Skull } from 'lucide-react';
import toast from 'react-hot-toast';

export const LeaderboardPage: React.FC = () => {
  const [tab, setTab] = useState<'territory' | 'distance' | 'factions'>('factions');
  const [standings, setStandings] = useState<LeaderboardEntry[]>([]);
  const [factions, setFactions] = useState<FactionStanding[]>([]);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Stored user faction allegiance
  const [userFaction, setUserFaction] = useState<string>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('runzone_user') || '{}');
      return stored.faction || 'Cinder Legion';
    } catch (e) {
      return 'Cinder Legion';
    }
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [seasonRes, factionsRes, leaderboardRes] = await Promise.all([
        api.getSeasonInfo().catch(() => null),
        api.getFactionStandings().catch(() => []),
        tab === 'distance' ? api.getDistanceLeaderboard() : api.getTerritoryLeaderboard(),
      ]);

      if (seasonRes) setSeason(seasonRes);
      if (factionsRes) setFactions(factionsRes);
      if (leaderboardRes) setStandings(leaderboardRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [tab]);

  // Format seconds remaining into days, hours, mins
  const formatTimeRemaining = (totalSecs?: number) => {
    if (!totalSecs || totalSecs <= 0) return 'Season Ending Soon';
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${days}d ${hours}h ${mins}m remaining`;
  };

  const selectFaction = (factionName: string) => {
    setUserFaction(factionName);
    try {
      const stored = JSON.parse(localStorage.getItem('runzone_user') || '{}');
      stored.faction = factionName;
      localStorage.setItem('runzone_user', JSON.stringify(stored));
      toast.success(`Allegiance pledged to ${factionName}!`);
    } catch (e) {}
  };

  const metricValue = (entry: LeaderboardEntry) =>
    tab === 'distance'
      ? `${entry.total_distance_km.toFixed(1)} km`
      : `${entry.total_territory_km2.toFixed(2)} km²`;

  const totalMapTerritoryKm2 = factions.reduce((acc, f) => acc + f.total_territory_km2, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-chalk">
            Faction Conquest & Leaderboard
          </h1>
          <p className="text-xs text-chalk-muted mt-0.5">
            Territory domination war room, weekly leagues, and athlete rankings
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-panel border border-hairline p-0.5" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'factions'}
            onClick={() => setTab('factions')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === 'factions'
                ? 'bg-cinder text-chalk font-semibold'
                : 'text-chalk-muted hover:text-chalk'
            }`}
          >
            Faction War
          </button>
          <button
            role="tab"
            aria-selected={tab === 'territory'}
            onClick={() => setTab('territory')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === 'territory'
                ? 'bg-cinder text-chalk font-semibold'
                : 'text-chalk-muted hover:text-chalk'
            }`}
          >
            Territory (km²)
          </button>
          <button
            role="tab"
            aria-selected={tab === 'distance'}
            onClick={() => setTab('distance')}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === 'distance'
                ? 'bg-cinder text-chalk font-semibold'
                : 'text-chalk-muted hover:text-chalk'
            }`}
          >
            Distance (km)
          </button>
        </div>
      </div>

      {/* Weekly Season Conquest League Banner */}
      <div className="p-4 bg-night border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cinder/20 border border-cinder/40 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-cinder" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold text-chalk">
                {season?.name || 'Season 4: Urban Reconnaissance League'}
              </span>
              <span className="px-1.5 py-0.5 bg-cinder/20 border border-cinder/40 text-[10px] text-chalk font-medium">
                Live Match
              </span>
            </div>
            <p className="text-[11px] text-chalk-muted mt-0.5">
              {season?.description || 'Top faction at season reset claims the Gold District trophy and +5,000 XP for all active members.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-chalk font-display font-bold bg-panel border border-hairline px-3 py-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="tabular">{formatTimeRemaining(season?.seconds_remaining)}</span>
        </div>
      </div>

      {/* Factions Tab View */}
      {tab === 'factions' ? (
        <div className="space-y-6">
          {/* Faction Dominance Bar Chart */}
          <div className="bg-panel border border-hairline p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display font-bold text-sm text-chalk">
                Global Territory Dominance Share
              </h3>
              <span className="text-xs text-chalk-dim font-display tabular">
                {totalMapTerritoryKm2.toFixed(1)} km² total mapped
              </span>
            </div>

            {/* Stacked Dominance Bar */}
            <div className="h-4 w-full flex overflow-hidden border border-hairline">
              {factions.map((f) => (
                <div
                  key={f.name}
                  style={{
                    width: `${f.share_percentage}%`,
                    backgroundColor: f.faction_color,
                  }}
                  title={`${f.name} (${f.share_percentage}%)`}
                  className="transition-all duration-500 hover:opacity-90"
                />
              ))}
            </div>

            {/* Legend / Key */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-display">
              {factions.map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 inline-block shrink-0"
                    style={{ backgroundColor: f.faction_color }}
                  />
                  <div className="truncate">
                    <span className="text-chalk font-semibold">{f.name}</span>
                    <span className="text-chalk-dim tabular ml-1">({f.share_percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Faction War Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factions.map((f) => {
              const isPledged = userFaction === f.name;

              return (
                <div
                  key={f.name}
                  className="bg-panel border p-5 space-y-4 transition-all duration-300 relative overflow-hidden"
                  style={{
                    borderColor: isPledged ? f.faction_color : 'rgba(237, 238, 231, 0.08)',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-display font-bold text-xs text-chalk"
                        style={{
                          borderColor: f.faction_color,
                          backgroundColor: `${f.faction_color}25`,
                        }}
                      >
                        {f.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-chalk">
                          {f.name}
                        </h4>
                        <div className="text-[11px] text-chalk-dim">
                          {f.active_runners} active runners
                        </div>
                      </div>
                    </div>

                    {isPledged ? (
                      <span className="px-2 py-0.5 text-[10px] font-display font-semibold bg-contour/20 border border-contour/40 text-contour flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Your Allegiance</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => selectFaction(f.name)}
                        className="px-2 py-0.5 text-[10px] font-display font-medium bg-night hover:bg-panel-light border border-hairline text-chalk-muted hover:text-chalk transition-colors"
                      >
                        Pledge
                      </button>
                    )}
                  </div>

                  {/* Faction Telemetry Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 hairline-t">
                    <div className="bg-night border border-hairline p-2.5">
                      <div className="text-[10px] text-chalk-dim font-display uppercase">Controlled Area</div>
                      <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">
                        {f.total_territory_km2.toFixed(1)}
                        <span className="text-xs font-normal text-chalk-dim ml-1">km²</span>
                      </div>
                    </div>

                    <div className="bg-night border border-hairline p-2.5">
                      <div className="text-[10px] text-chalk-dim font-display uppercase">Territory Share</div>
                      <div
                        className="font-display text-lg font-bold tabular mt-0.5"
                        style={{ color: f.faction_color }}
                      >
                        {f.share_percentage}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sector Decay Notice Card */}
          <div className="p-4 bg-night border border-hairline flex items-start gap-3 text-xs font-sans">
            <Skull className="w-4 h-4 text-cinder shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-display font-bold text-chalk">
                Sector Decay & Fortification Rules
              </div>
              <p className="text-chalk-muted leading-relaxed text-[11px]">
                Sectors unrun for &gt;7 days lose 15 defense points per day. When defense points hit 0, the sector becomes neutral. Run through your faction's corridors to fortify them back to 100%.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Rankings Table View (Territory or Distance) */
        <div className="bg-panel border border-hairline overflow-hidden">
          <div className="px-5 py-3 bg-night hairline-b flex items-center justify-between">
            <span className="font-display font-bold text-xs text-chalk">
              {tab === 'distance' ? 'Cumulative Distance Leaderboard' : 'PostGIS Territory Leaderboard'}
            </span>
            <span className="text-[10px] text-chalk-dim font-display">
              Updated Live from GPS Corridors
            </span>
          </div>

          <div className="divide-y divide-hairline">
            {standings.map((entry) => {
              const isTop3 = entry.rank <= 3;
              const rankColor =
                entry.rank === 1
                  ? '#C98A2E' // Gold
                  : entry.rank === 2
                  ? '#9BA1A6' // Silver
                  : entry.rank === 3
                  ? '#B8492E' // Bronze
                  : '#656C71';

              return (
                <div
                  key={entry.user_id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-panel-light transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-xs border"
                      style={{
                        borderColor: rankColor,
                        color: rankColor,
                        backgroundColor: isTop3 ? `${rankColor}15` : 'transparent',
                      }}
                    >
                      {entry.rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-chalk">
                          {entry.username}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: entry.faction_color }}
                          title={`Faction: ${entry.faction_color}`}
                        />
                      </div>
                      <div className="text-[11px] text-chalk-dim font-display">
                        Level {entry.level} · {entry.xp ? `${entry.xp.toLocaleString()} XP` : 'Athlete'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display text-base font-bold text-chalk tabular">
                      {metricValue(entry)}
                    </div>
                    <div className="text-[10px] text-chalk-muted font-display">
                      {tab === 'distance' ? 'Logged Mileage' : 'Held Territory'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
